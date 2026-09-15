import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { amount, product_title, buyer_email, buyer_name, buyer_phone } = await req.json();

    const CASHFREE_APP_ID = Deno.env.get("CASHFREE_APP_ID")!;
    const CASHFREE_SECRET_KEY = Deno.env.get("CASHFREE_SECRET_KEY")!;

    const orderId = `MF_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const orderPayload = {
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: `cust_${Date.now()}`,
        customer_name: buyer_name || "MadFod Customer",
        customer_email: buyer_email || "customer@madfod.com",
        customer_phone: buyer_phone || "9999999999",
      },
      order_meta: {
        return_url: `https://madfod.com/payment-success?order_id=${orderId}`,
      },
      order_note: product_title || "MadFod Purchase",
    };

    const response = await fetch("https://api.cashfree.com/pg/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": CASHFREE_APP_ID,
        "x-client-secret": CASHFREE_SECRET_KEY,
        "x-api-version": "2023-08-01",
      },
      body: JSON.stringify(orderPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to create order");
    }

    return new Response(
      JSON.stringify({
        order_id: data.order_id,
        payment_session_id: data.payment_session_id,
        order_amount: data.order_amount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
