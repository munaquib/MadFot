import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Shiprocket yahan tracking updates bhejta hai (picked up, in transit, delivered...).
// Function ka naam jaan-bujh ke "courier-updates" rakha hai: Shiprocket webhook URL mein
// "shiprocket", "sr", "kr" jaise words allow nahi karta.

// Shiprocket status -> humare orders.status
const mapToOrderStatus = (status: string): "shipped" | "delivered" | null => {
  const s = status.toUpperCase();
  if (s === "DELIVERED") return "delivered";
  if (["PICKED UP", "SHIPPED", "IN TRANSIT", "OUT FOR DELIVERY", "REACHED AT DESTINATION HUB", "OUT FOR PICKUP"].includes(s)) {
    return s === "OUT FOR PICKUP" ? null : "shipped";
  }
  return null;
};

const ok = (body: unknown = { received: true }) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

serve(async (req) => {
  try {
    // Security: Shiprocket webhook settings mein jo token daala hai wahi header (x-api-key) mein aata hai
    const expected = Deno.env.get("SHIPROCKET_WEBHOOK_TOKEN");
    const received = req.headers.get("x-api-key") || "";
    if (!expected || received !== expected) {
      console.error("courier-updates: invalid or missing token");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const payload = await req.json().catch(() => null);
    if (!payload) return ok();

    const awb = payload.awb ? String(payload.awb) : "";
    const srOrderId = payload.order_id ? String(payload.order_id) : "";
    const currentStatus = String(payload.current_status || payload.shipment_status || "").trim();
    if (!currentStatus || (!awb && !srOrderId)) return ok();

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Order dhoondo: pehle AWB se, phir Shiprocket order_id (= humara Cashfree order id) se
    let order: any = null;
    if (awb) {
      const { data } = await supabase.from("orders").select("*").eq("awb_code", awb).maybeSingle();
      order = data;
    }
    if (!order && srOrderId) {
      const { data } = await supabase.from("orders").select("*").eq("razorpay_order_id", srOrderId).maybeSingle();
      order = data;
    }
    if (!order) {
      console.error("courier-updates: order not found for", awb || srOrderId);
      return ok();
    }

    const updates: Record<string, unknown> = {
      courier_status: currentStatus.toUpperCase(),
      shiprocket_status: currentStatus.toLowerCase().replace(/\s+/g, "_"),
    };
    if (!order.awb_code && awb) updates.awb_code = awb;
    if (!order.courier_name && payload.courier_name) updates.courier_name = String(payload.courier_name);

    // Cancelled/returned orders ka status kabhi overwrite nahi karte
    const newOrderStatus = mapToOrderStatus(currentStatus);
    const canChangeStatus = !["cancelled", "returned"].includes(order.status);
    const statusChanged = !!newOrderStatus && canChangeStatus && newOrderStatus !== order.status;
    if (statusChanged) updates.status = newOrderStatus;

    await supabase.from("orders").update(updates).eq("id", order.id);

    // Buyer aur seller ko batao (sirf jab status sach mein badla ho, taaki duplicate notification na jaye)
    if (statusChanged) {
      const title = product(order.product_title);
      const isDelivered = newOrderStatus === "delivered";
      await supabase.from("notifications").insert([
        {
          user_id: order.buyer_id,
          title: isDelivered ? "Order Delivered ✅" : "Order Shipped 🚚",
          message: isDelivered
            ? `${title} deliver ho gaya hai.`
            : `${title} courier ne pickup kar liya hai aur raaste mein hai.`,
          type: "order",
          is_read: false,
          related_order_id: order.id,
        },
        {
          user_id: order.seller_id,
          title: isDelivered ? "Order Delivered ✅" : "Order Shipped 🚚",
          message: isDelivered
            ? `${title} buyer tak pahunch gaya hai.`
            : `${title} courier ne aapse pickup kar liya hai.`,
          type: "order",
          is_read: false,
          related_order_id: order.id,
        },
      ]);
    }

    return ok();
  } catch (error) {
    console.error("courier-updates error:", error);
    // 200 dete hain taaki Shiprocket baar-baar retry na kare; error log mein dikh jayega
    return ok({ received: true, error: true });
  }
});

function product(title: string | null) {
  return title || "Aapka order";
}
