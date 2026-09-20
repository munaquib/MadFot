import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Flat shipping charge jo buyer deta hai (product price ke upar)
const SHIPPING_CHARGE = 100;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      product_id, buyer_id, buyer_email, buyer_name, buyer_phone,
      delivery_address, delivery_city, delivery_state, delivery_pincode,
    } = await req.json();

    if (!product_id || !buyer_id) {
      throw new Error("product_id and buyer_id are required");
    }
    if (!delivery_address || !delivery_city || !delivery_state || !delivery_pincode) {
      throw new Error("Complete delivery address is required");
    }

    const CASHFREE_APP_ID = Deno.env.get("CASHFREE_APP_ID")!;
    const CASHFREE_SECRET_KEY = Deno.env.get("CASHFREE_SECRET_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Price browser se nahi, database se padhte hain (taaki koi amount change na kar sake)
    const { data: product, error: productErr } = await supabase
      .from("products")
      .select("id, title, price, user_id, status")
      .eq("id", product_id)
      .single();

    if (productErr || !product) {
      throw new Error("Product not found");
    }
    if (product.status !== "active") {
      throw new Error("Ye product ab available nahi hai");
    }
    if (product.user_id === buyer_id) {
      throw new Error("Aap apna hi product nahi khareed sakte");
    }

    const itemPrice = Number(product.price);
    const totalAmount = itemPrice + SHIPPING_CHARGE;
    const seller_id = product.user_id;

    const orderId = `MF_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const orderPayload = {
      order_id: orderId,
      order_amount: totalAmount,
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
      order_note: product.title || "MadFod Purchase",
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

    // amount = total jo buyer ne diya (price + shipping). shipping_charge alag save hota hai.
    const { data: insertedRow, error: dbError } = await supabase
      .from("payment_orders")
      .insert({
        cf_order_id: orderId,
        product_id,
        buyer_id,
        seller_id,
        amount: totalAmount,
        shipping_charge: SHIPPING_CHARGE,
        product_title: product.title || "MadFod Purchase",
        status: "pending",
        buyer_name: buyer_name || null,
        buyer_phone: buyer_phone || null,
        delivery_address: delivery_address || null,
        delivery_city: delivery_city || null,
        delivery_state: delivery_state || null,
        delivery_pincode: delivery_pincode || null,
      })
      .select();

    if (dbError) {
      console.error("payment_orders insert failed:", dbError);
      throw new Error("Failed to save order reference");
    }

    if (!insertedRow || insertedRow.length === 0) {
      console.error("payment_orders insert returned no row (unexpected):", orderId);
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
