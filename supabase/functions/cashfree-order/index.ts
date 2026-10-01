import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Shiprocket se rate na mil paye (service down ho) to ye flat charge lagega, taaki checkout na ruke
const FALLBACK_SHIPPING_CHARGE = 100;

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";
// Shiprocket rate upar ke itne rupaye tak round karke buyer se liya jaata hai
const ROUND_UP_TO = 5;

// Category ke hisaab se parcel (shipping-quote aur cashfree-webhook mein bhi yahi table hai, teeno same rakhna)
const DEFAULT_PARCEL = { weight: 0.5, length: 25, breadth: 20, height: 5 };
const CATEGORY_PARCELS: Record<string, { weight: number; length: number; breadth: number; height: number }> = {
  lehenga: { weight: 1.5, length: 30, breadth: 25, height: 10 },
  sherwani: { weight: 1.5, length: 30, breadth: 25, height: 10 },
  gown: { weight: 1.2, length: 30, breadth: 25, height: 8 },
  suit: { weight: 1.0, length: 30, breadth: 25, height: 7 },
  saree: { weight: 0.8, length: 30, breadth: 25, height: 5 },
  "indo-western": { weight: 0.8, length: 30, breadth: 25, height: 5 },
  kurti: { weight: 0.4, length: 25, breadth: 20, height: 4 },
};
const parcelFor = (category?: string | null) =>
  CATEGORY_PARCELS[(category || "").trim().toLowerCase()] || DEFAULT_PARCEL;

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

let cachedToken: { token: string; expiresAt: number } | null = null;
async function getToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;
  const login = await srCall("/auth/login", null, "POST", {
    email: Deno.env.get("SHIPROCKET_EMAIL"),
    password: Deno.env.get("SHIPROCKET_PASSWORD"),
  });
  const token = login.json?.token;
  if (!login.ok || !token) return null;
  cachedToken = { token, expiresAt: Date.now() + 6 * 60 * 60 * 1000 };
  return token;
}

type Quote = { status: "ok"; charge: number } | { status: "unserviceable" } | { status: "error" };

// Seller ke pincode se buyer ke pincode tak sabse sasta courier ka rate (₹5 tak round-up)
async function getShippingQuote(pickupPin: string, deliveryPin: string, category?: string | null): Promise<Quote> {
  try {
    let token = await getToken();
    if (!token) return { status: "error" };

    const parcel = parcelFor(category);
    const qs = new URLSearchParams({
      pickup_postcode: pickupPin,
      delivery_postcode: deliveryPin,
      weight: String(parcel.weight),
      cod: "0",
    });
    let sr = await srCall(`/courier/serviceability/?${qs.toString()}`, token, "GET");
    if (sr.status === 401) {
      cachedToken = null;
      token = await getToken();
      if (token) sr = await srCall(`/courier/serviceability/?${qs.toString()}`, token, "GET");
    }

    const list: any[] = Array.isArray(sr.json?.data?.available_courier_companies)
      ? sr.json.data.available_courier_companies
      : [];
    const candidates = list
      .filter((c) => !c.blocked)
      .map((c) => ({ rate: Number(c.rate ?? c.freight_charge), days: Number(c.estimated_delivery_days) }))
      .filter((c) => Number.isFinite(c.rate) && c.rate > 0)
      .sort((a, b) => a.rate - b.rate || (a.days || 99) - (b.days || 99));

    if (candidates.length === 0) {
      const msg = String(sr.json?.message || "");
      const unserviceable = (sr.ok && list.length === 0) || /serviceab|no courier|not available/i.test(msg);
      return { status: unserviceable ? "unserviceable" : "error" };
    }
    return { status: "ok", charge: Math.ceil(candidates[0].rate / ROUND_UP_TO) * ROUND_UP_TO };
  } catch (err) {
    console.error("getShippingQuote error:", err);
    return { status: "error" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Login check: buyer kaun hai ye login token se pata chalta hai (body ke buyer_id pe bharosa nahi)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Please login to continue" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: authUser }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !authUser) {
      return new Response(JSON.stringify({ error: "Invalid session, please login again" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const buyer_id = authUser.id;

    const {
      product_id, buyer_email, buyer_name, buyer_phone,
      delivery_address, delivery_city, delivery_state, delivery_pincode,
      coupon_code, quoted_shipping,
    } = await req.json();

    if (!product_id) {
      throw new Error("product_id is required");
    }
    if (!delivery_address || !delivery_city || !delivery_state || !delivery_pincode) {
      throw new Error("Complete delivery address is required");
    }

    const CASHFREE_APP_ID = Deno.env.get("CASHFREE_APP_ID")!;
    const CASHFREE_SECRET_KEY = Deno.env.get("CASHFREE_SECRET_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Banned user checkout nahi kar sakta
    const { data: buyerProfile } = await supabase
      .from("profiles")
      .select("is_banned")
      .eq("user_id", buyer_id)
      .maybeSingle();
    if (buyerProfile?.is_banned) {
      throw new Error("Your account is restricted. Please contact support.");
    }

    // Price browser se nahi, database se padhte hain (taaki koi amount change na kar sake)
    const { data: product, error: productErr } = await supabase
      .from("products")
      .select("id, title, price, user_id, status, category")
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

    // Delivery charge bhi browser se nahi, server par Shiprocket se nikalte hain
    const { data: sellerProfile } = await supabase
      .from("profiles")
      .select("pickup_pincode")
      .eq("user_id", product.user_id)
      .maybeSingle();
    const pickupPin = String(sellerProfile?.pickup_pincode || "").trim();
    if (!/^\d{6}$/.test(pickupPin)) {
      throw new Error("This seller has not set up shipping yet. Please chat with the seller or try again later.");
    }

    const quote = await getShippingQuote(pickupPin, String(delivery_pincode).trim(), product.category);
    let shippingCharge: number;
    if (quote.status === "ok") {
      shippingCharge = quote.charge;
    } else if (quote.status === "unserviceable") {
      throw new Error("Delivery is not available to this pincode right now.");
    } else {
      console.error("Shiprocket quote failed, using fallback charge for product", product_id);
      shippingCharge = FALLBACK_SHIPPING_CHARGE;
    }

    // Buyer ko jo charge dikha tha wo abhi ke charge se kam ho gaya ho to naya charge dobara dikhao
    const shown = Number(quoted_shipping);
    if (Number.isFinite(shown) && shown > 0 && shippingCharge > shown) {
      throw new Error(`The delivery charge changed to ₹${shippingCharge}. Please review your order and try again.`);
    }

    const itemPrice = Number(product.price);
    let discountAmount = 0;
    let appliedCouponCode: string | null = null;

    // Coupon validation — sab kuch server-side, taaki koi client se discount tamper na kar sake.
    if (coupon_code && typeof coupon_code === "string" && coupon_code.trim()) {
      const code = coupon_code.trim().toUpperCase();
      const { data: coupon, error: couponErr } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (couponErr || !coupon) {
        throw new Error("Invalid or inactive coupon code");
      }
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        throw new Error("This coupon has expired");
      }
      if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
        throw new Error("This coupon has reached its usage limit");
      }
      if (itemPrice < Number(coupon.min_order_amount || 0)) {
        throw new Error(`Minimum order amount for this coupon is ₹${coupon.min_order_amount}`);
      }

      if (coupon.discount_type === "percentage") {
        discountAmount = (itemPrice * Number(coupon.discount_value)) / 100;
        if (coupon.max_discount) {
          discountAmount = Math.min(discountAmount, Number(coupon.max_discount));
        }
      } else {
        discountAmount = Number(coupon.discount_value);
      }
      // Discount kabhi bhi item price se zyada nahi ho sakta (shipping discount nahi hota)
      discountAmount = Math.min(discountAmount, itemPrice);
      discountAmount = Math.round(discountAmount * 100) / 100;
      appliedCouponCode = coupon.code;
    }

    const totalAmount = itemPrice - discountAmount + shippingCharge;
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

    // amount = total jo buyer ne diya (price - discount + shipping). shipping_charge alag save hota hai.
    const { data: insertedRow, error: dbError } = await supabase
      .from("payment_orders")
      .insert({
        cf_order_id: orderId,
        product_id,
        buyer_id,
        seller_id,
        amount: totalAmount,
        shipping_charge: shippingCharge,
        coupon_code: appliedCouponCode,
        discount_amount: discountAmount,
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

    // Note: coupon ka used_count yahan NAHI badhaya jata — sirf tab badhega jab
    // cashfree-webhook mein payment SUCCESS confirm ho jaye. Isse cancelled/failed
    // payment attempts coupon ka usage limit consume nahi karte.

    return new Response(
      JSON.stringify({
        order_id: data.order_id,
        payment_session_id: data.payment_session_id,
        order_amount: data.order_amount,
        discount_amount: discountAmount,
        shipping_charge: shippingCharge,
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
