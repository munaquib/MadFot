import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";

// Buyer se rate upar ke itne rupaye tak round karke liya jaata hai (rate/GST ka chhota farak cover karne ke liye)
const ROUND_UP_TO = 5;

// Category ke hisaab se parcel. Weight sirf andaza hai, apne asli parcel ke hisaab se badal lena.
// Dimensions aise rakhe hain ki volumetric weight (L x B x H / 5000) lagbhag asli weight ke barabar aaye.
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

// Shiprocket login token thodi der reuse hota hai, taaki har quote par dobara login na karna pade
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const deliveryPin = String(body.delivery_pincode || "").trim();
    if (!/^\d{6}$/.test(deliveryPin)) {
      return json({ ok: false, code: "bad_pincode", message: "Please enter a valid 6-digit pincode." }, 400);
    }

    let pickupPin = "";
    let parcel = DEFAULT_PARCEL;
    const debug = body.debug === true;

    if (debug && /^\d{6}$/.test(String(body.pickup_pincode || ""))) {
      // Sirf testing ke liye: product ke bina seedha pincodes se rate dekho
      pickupPin = String(body.pickup_pincode);
      parcel = parcelFor(body.category);
      const w = Number(body.weight);
      if (Number.isFinite(w) && w >= 0.1 && w <= 10) parcel = { ...parcel, weight: w };
    } else {
      if (!body.product_id) {
        return json({ ok: false, code: "bad_request", message: "product_id is required." }, 400);
      }
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: product } = await supabase
        .from("products")
        .select("id, user_id, category")
        .eq("id", body.product_id)
        .maybeSingle();
      if (!product) return json({ ok: false, code: "not_found", message: "Product not found." }, 404);

      const { data: seller } = await supabase
        .from("profiles")
        .select("pickup_pincode")
        .eq("user_id", product.user_id)
        .maybeSingle();
      pickupPin = String(seller?.pickup_pincode || "").trim();
      if (!/^\d{6}$/.test(pickupPin)) {
        return json({
          ok: false,
          code: "seller_not_ready",
          message: "This seller has not set up shipping yet. Please chat with the seller or try again later.",
        });
      }
      parcel = parcelFor(product.category);
    }

    let token = await getToken();
    if (!token) {
      return json({ ok: false, code: "error", message: "Could not reach the courier service." }, 502);
    }

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
      .map((c) => ({
        id: c.courier_company_id,
        name: c.courier_name,
        rate: Number(c.rate ?? c.freight_charge),
        days: Number(c.estimated_delivery_days),
      }))
      .filter((c) => Number.isFinite(c.rate) && c.rate > 0)
      .sort((a, b) => a.rate - b.rate || (a.days || 99) - (b.days || 99));

    const debugInfo = debug
      ? {
          http_status: sr.status,
          top_level_keys: Object.keys(sr.json || {}),
          data_keys: Object.keys(sr.json?.data || {}),
          couriers_count: list.length,
          cheapest_5: candidates.slice(0, 5),
          first_courier_raw: list[0] || null,
          message: sr.json?.message || null,
        }
      : undefined;

    if (candidates.length === 0) {
      const msg = String(sr.json?.message || "");
      const unserviceable = (sr.ok && list.length === 0) || /serviceab|no courier|not available/i.test(msg);
      if (unserviceable) {
        return json({
          ok: false,
          code: "unserviceable",
          message: "Delivery is not available to this pincode right now.",
          debug: debugInfo,
        });
      }
      return json({ ok: false, code: "error", message: "Could not get the delivery charge right now.", debug: debugInfo }, 502);
    }

    const best = candidates[0];
    const shippingCharge = Math.ceil(best.rate / ROUND_UP_TO) * ROUND_UP_TO;

    return json({
      ok: true,
      shipping_charge: shippingCharge,
      raw_rate: best.rate,
      courier_id: best.id,
      courier_name: best.name,
      estimated_days: Number.isFinite(best.days) ? best.days : null,
      weight: parcel.weight,
      debug: debugInfo,
    });
  } catch (error) {
    console.error("shipping-quote error:", error);
    return json({ ok: false, code: "error", message: (error as Error).message }, 500);
  }
});
