import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { amount, product_title, buyer_email, buyer_name, buyer_phone, product_id, buyer_id, seller_id } = await req.json();

    if (!product_id || !buyer_id || !seller_id) {
      throw new Error("product_id, buyer_id, seller_id are required");
    }

    const CASHFREE_APP_ID = Deno.env.get("CASHFREE_APP_ID")!;
    const CASHFREE_SECRET_KEY = Deno.env.get("CASHFREE_SECRET_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // DEBUG: confirm ki env vars khaali toh nahi hain (masked, sirf length/prefix dikhayenge)
    console.log("DEBUG env check:", {
      hasUrl: !!SUPABASE_URL,
      urlPrefix: SUPABASE_URL ? SUPABASE_URL.slice(0, 30) : "MISSING",
      hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyLength: SUPABASE_SERVICE_ROLE_KEY ? SUPABASE_SERVICE_ROLE_KEY.length : 0,
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    // DEBUG: insert se pehle exact payload log karo
    console.log("DEBUG inserting payment_orders row:", {
      cf_order_id: orderId,
      product_id,
      buyer_id,
      seller_id,
      amount,
    });

    const { data: insertedRow, error: dbError } = await supabase
      .from("payment_orders")
      .insert({
        cf_order_id: orderId,
        product_id,
        buyer_id,
        seller_id,
        amount,
        product_title: product_title || "MadFod Purchase",
        status: "pending",
      })
      .select();

    // DEBUG: insert ke turant baad result log karo (chahe error ho ya na ho)
    console.log("DEBUG insert result:", { insertedRow, dbError });

    if (dbError) {
      console.error("payment_orders insert failed:", dbError);
      throw new Error("Failed to save order reference");
    }

    if (!insertedRow || insertedRow.length === 0) {
      console.error("DEBUG: insert returned no error but also no row! Possible RLS/schema issue.");
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
    console.error("cashfree-order error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
