import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function srCall(path: string, token: string | null, method: string, body?: unknown) {
  const res = await fetch(`${SHIPROCKET_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "MadFod/1.0",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json: data };
}

// Buyer apna order cancel kare toh: pehle Shiprocket shipment cancel, phir order "cancelled".
// Ye function JWT verification ON ke saath deploy hota hai (sirf logged-in user chala sakta hai).
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { order_id } = await req.json();
    if (!order_id) return json({ error: "order_id required" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Please login again" }, 401);
    const user = userData.user;

    const { data: order } = await supabase.from("orders").select("*").eq("id", order_id).maybeSingle();
    if (!order || order.buyer_id !== user.id) return json({ error: "Order not found" }, 403);
    if (order.status !== "processing") {
      return json({ error: "Ye order ab cancel nahi ho sakta (courier ne pickup kar liya ho sakta hai)" }, 400);
    }

    // Agar Shiprocket shipment bana hai toh use pehle cancel karo
    if (order.shiprocket_shipment_id) {
      const login = await srCall("/auth/login", null, "POST", {
        email: Deno.env.get("SHIPROCKET_EMAIL"),
        password: Deno.env.get("SHIPROCKET_PASSWORD"),
      });
      const srToken = login.json?.token;
      if (!login.ok || !srToken) {
        console.error("Shiprocket login failed during cancel:", login.json);
        return json({ error: "Courier system se connect nahi ho paya, thodi der baad try karo" }, 502);
      }

      const cancelRes = order.awb_code
        ? await srCall("/orders/cancel/shipment/awbs", srToken, "POST", { awbs: [String(order.awb_code)] })
        : await srCall("/orders/cancel", srToken, "POST", { ids: [Number(order.shiprocket_order_id)] });

      if (!cancelRes.ok) {
        console.error("Shiprocket cancel failed:", cancelRes.json);
        await supabase.from("orders").update({
          shiprocket_error: `cancel_failed: ${JSON.stringify(cancelRes.json).slice(0, 400)}`,
        }).eq("id", order.id);
        return json({ error: "Courier shipment cancel nahi ho paya. Support se baat karo." }, 502);
      }
    }

    const { error: updErr } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        ...(order.shiprocket_shipment_id ? { shiprocket_status: "cancelled", courier_status: "CANCELLED" } : {}),
      })
      .eq("id", order.id);
    if (updErr) return json({ error: "Order update nahi ho paya" }, 500);

    await supabase.from("notifications").insert({
      user_id: order.seller_id,
      title: "Order Cancelled",
      message: `${order.product_title || "Ek order"} ka order buyer ne cancel kar diya. Courier pickup cancel ho gaya hai.`,
      type: "order",
      is_read: false,
      related_order_id: order.id,
    });

    return json({ success: true });
  } catch (error) {
    console.error("cancel-order error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
