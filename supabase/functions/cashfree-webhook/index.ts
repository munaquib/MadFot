import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature") || "";
    const timestamp = req.headers.get("x-webhook-timestamp") || "";

    const CASHFREE_SECRET_KEY = Deno.env.get("CASHFREE_SECRET_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(CASHFREE_SECRET_KEY),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(timestamp + rawBody));
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));

    if (expectedSignature !== signature) {
      console.error("Webhook signature mismatch");
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.type;
    const cfOrderId = payload.data?.order?.order_id;
    const paymentStatus = payload.data?.payment?.payment_status;

    if (eventType !== "PAYMENT_SUCCESS_WEBHOOK" || paymentStatus !== "SUCCESS" || !cfOrderId) {
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: pendingOrder, error: fetchErr } = await supabase
      .from("payment_orders")
      .select("*")
      .eq("cf_order_id", cfOrderId)
      .single();

    if (fetchErr || !pendingOrder) {
      console.error("payment_orders record not found for", cfOrderId);
      return new Response(JSON.stringify({ error: "Order reference not found" }), { status: 200 });
    }

    if (pendingOrder.status === "completed") {
      return new Response(JSON.stringify({ received: true, note: "already processed" }), { status: 200 });
    }

    const commission = Math.round(pendingOrder.amount * 0.05 * 100) / 100;
    const sellerPayout = Math.round((pendingOrder.amount - commission) * 100) / 100;

    const { error: orderErr } = await supabase.from("orders").insert({
      buyer_id: pendingOrder.buyer_id,
      seller_id: pendingOrder.seller_id,
      product_id: pendingOrder.product_id,
      amount: pendingOrder.amount,
      status: "processing",
      razorpay_order_id: cfOrderId,
      order_type: "buy",
      platform_commission: commission,
      seller_payout_amount: sellerPayout,
      payout_status: "pending",
    });

    if (orderErr) {
      console.error("orders insert failed:", orderErr);
      return new Response(JSON.stringify({ error: "Failed to create order" }), { status: 500 });
    }

    await supabase.from("notifications").insert({
      user_id: pendingOrder.seller_id,
      title: "New Order! 🎉",
      message: `${pendingOrder.product_title} ka order aaya hai — check karo My Orders mein.`,
      type: "order",
      is_read: false,
    });

    await supabase.from("payment_orders").update({ status: "completed" }).eq("cf_order_id", cfOrderId);

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
