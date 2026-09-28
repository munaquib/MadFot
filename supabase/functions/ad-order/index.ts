import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Ad ki price yahin tay hoti hai (browser se kabhi nahi li jati).
// Placement -> duration (days) -> price in ₹
const AD_PRICES: Record<string, Record<number, number>> = {
  "top-banner": { 1: 99, 3: 249, 7: 499 },
  "in-feed": { 1: 49, 3: 129, 7: 249 },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const last10Digits = (v: string | null | undefined) => (v || "").replace(/\D/g, "").slice(-10);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const CASHFREE_APP_ID = Deno.env.get("CASHFREE_APP_ID")!;
    const CASHFREE_SECRET_KEY = Deno.env.get("CASHFREE_SECRET_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Caller kaun hai ye login token se pata karte hain (body ke user_id pe bharosa nahi)
    const callerClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) return json({ error: "Invalid session, please login again" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const productId = body?.product_id;
    const adTitle = String(body?.ad_title ?? "").trim();
    const description = String(body?.description ?? "").trim();
    const imageUrl = body?.image_url ? String(body.image_url).slice(0, 1000) : null;
    const placement = String(body?.placement ?? "");
    const durationDays = Number(body?.duration_days);

    if (!productId) throw new Error("product_id is required");
    if (!adTitle) throw new Error("Ad title is required");
    if (adTitle.length > 100) throw new Error("Ad title is too long");
    if (description.length > 200) throw new Error("Description is too long");
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) throw new Error("Invalid image URL");

    const price = AD_PRICES[placement]?.[durationDays];
    if (!price) throw new Error("Invalid placement or duration");

    // Sirf apna product, aur wo bhi active listing
    const { data: product, error: productErr } = await supabase
      .from("products")
      .select("id, title, user_id, status")
      .eq("id", productId)
      .single();
    if (productErr || !product) throw new Error("Product not found");
    if (product.user_id !== user.id) throw new Error("Aap sirf apna hi product promote kar sakte ho");
    if (product.status !== "active") throw new Error("Sirf active listing ko promote kar sakte ho");

    // Double payment se bachne ke liye: is product ka ad already chal raha ho ya review mein ho
    const { data: existingAds } = await supabase
      .from("ads")
      .select("id, status")
      .eq("product_id", productId)
      .in("status", ["active", "pending"])
      .limit(1);
    if (existingAds && existingAds.length > 0) {
      throw new Error("Is product ka ad already chal raha hai ya review mein hai");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", user.id)
      .maybeSingle();

    const orderId = `AD_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const response = await fetch("https://api.cashfree.com/pg/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": CASHFREE_APP_ID,
        "x-client-secret": CASHFREE_SECRET_KEY,
        "x-api-version": "2023-08-01",
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: price,
        order_currency: "INR",
        customer_details: {
          customer_id: `cust_${Date.now()}`,
          customer_name: profile?.full_name || "MadFod Seller",
          customer_email: user.email || "customer@madfod.com",
          customer_phone: last10Digits(profile?.phone) || "9999999999",
        },
        order_meta: {
          return_url: `https://madfod.com/payment-success?order_id=${orderId}`,
        },
        order_note: `MadFod Ad: ${adTitle}`.slice(0, 100),
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to create payment order");

    // Ad abhi "awaiting_payment" hai — Admin ke Pending tab mein tabhi aayega jab webhook payment confirm kare
    const { error: insertErr } = await supabase.from("ads").insert({
      user_id: user.id,
      product_id: productId,
      ad_title: adTitle,
      description: description || null,
      image_url: imageUrl,
      placement,
      duration_days: durationDays,
      budget: price,
      status: "awaiting_payment",
      payment_status: "unpaid",
      cf_order_id: orderId,
    });
    if (insertErr) {
      console.error("ads insert failed:", insertErr);
      throw new Error("Failed to save ad");
    }

    return json({
      order_id: data.order_id,
      payment_session_id: data.payment_session_id,
      amount: price,
    });
  } catch (error) {
    console.error("ad-order error:", error);
    return json({ error: (error as Error).message }, 400);
  }
});
