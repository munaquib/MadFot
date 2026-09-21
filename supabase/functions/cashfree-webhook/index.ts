import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Launch offer: abhi koi commission nahi. Baad mein lagana ho toh yahan rate badlo (jaise 0.05 = 5%)
const COMMISSION_RATE = 0;

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";
// Default parcel: 0.5 kg, 25x20x5 cm (kapde ke liye)
const PARCEL = { weight: 0.5, length: 25, breadth: 20, height: 5 };

const last10Digits = (v: string | null | undefined) => (v || "").replace(/\D/g, "").slice(-10);

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
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

// Payment ke baad Shiprocket mein shipment banata hai. Fail hone par order safe rehta hai,
// bas orders.shiprocket_status / shiprocket_error mein reason save ho jata hai.
async function createShipment(supabase: any, order: any, pending: any, cfOrderId: string) {
  const setStatus = async (fields: Record<string, unknown>) => {
    await supabase.from("orders").update(fields).eq("id", order.id);
  };

  try {
    const { data: seller } = await supabase
      .from("profiles")
      .select("pickup_name, pickup_phone, pickup_address, pickup_city, pickup_state, pickup_pincode")
      .eq("user_id", pending.seller_id)
      .maybeSingle();

    if (!seller?.pickup_address || !seller?.pickup_pincode || !seller?.pickup_city || !seller?.pickup_state) {
      await setStatus({ shiprocket_status: "no_pickup_address", shiprocket_error: "Seller ne pickup address save nahi kiya" });
      return;
    }

    // 1. Login
    const login = await srCall("/auth/login", null, "POST", {
      email: Deno.env.get("SHIPROCKET_EMAIL"),
      password: Deno.env.get("SHIPROCKET_PASSWORD"),
    });
    const token = login.json?.token;
    if (!login.ok || !token) {
      await setStatus({ shiprocket_status: "login_failed", shiprocket_error: JSON.stringify(login.json).slice(0, 500) });
      return;
    }

    // 2. Seller ka pickup location (pehli baar hi register hota hai)
    const pickupName = `MF-${String(pending.seller_id).replace(/-/g, "").slice(0, 12)}`;
    const list = await srCall("/settings/company/pickup", token, "GET");
    const existing = (list.json?.data?.shipping_address || []).find((a: any) => a.pickup_location === pickupName);

    if (!existing) {
      const add = await srCall("/settings/company/addpickup", token, "POST", {
        pickup_location: pickupName,
        name: seller.pickup_name || "MadFod Seller",
        email: Deno.env.get("SHIPROCKET_PICKUP_EMAIL") || "support.madfod@gmail.com",
        phone: last10Digits(seller.pickup_phone),
        address: seller.pickup_address,
        address_2: "",
        city: seller.pickup_city,
        state: seller.pickup_state,
        country: "India",
        pin_code: seller.pickup_pincode,
      });
      if (!add.ok || add.json?.success === false) {
        await setStatus({ shiprocket_status: "pickup_failed", shiprocket_error: JSON.stringify(add.json).slice(0, 500) });
        return;
      }
    }

    // 3. Shiprocket order banao
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const orderDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const itemAmount = Number(order.amount);

    const created = await srCall("/orders/create/adhoc", token, "POST", {
      order_id: cfOrderId,
      order_date: orderDate,
      pickup_location: pickupName,
      billing_customer_name: pending.buyer_name || "Customer",
      billing_last_name: "",
      billing_address: pending.delivery_address,
      billing_city: pending.delivery_city,
      billing_pincode: pending.delivery_pincode,
      billing_state: pending.delivery_state || "",
      billing_country: "India",
      billing_email: "customer@madfod.com",
      billing_phone: last10Digits(pending.buyer_phone),
      shipping_is_billing: true,
      order_items: [
        {
          name: (pending.product_title || "MadFod Product").slice(0, 100),
          sku: String(pending.product_id).slice(0, 8),
          units: 1,
          selling_price: itemAmount,
        },
      ],
      payment_method: "Prepaid",
      sub_total: itemAmount,
      length: PARCEL.length,
      breadth: PARCEL.breadth,
      height: PARCEL.height,
      weight: PARCEL.weight,
    });

    const shipmentId = created.json?.shipment_id;
    if (!created.ok || !shipmentId) {
      await setStatus({ shiprocket_status: "order_failed", shiprocket_error: JSON.stringify(created.json).slice(0, 500) });
      return;
    }

    await setStatus({
      shiprocket_order_id: String(created.json.order_id ?? ""),
      shiprocket_shipment_id: String(shipmentId),
      shiprocket_status: "created",
      shiprocket_error: null,
    });

    // 4. Courier + AWB assign (wallet mein balance chahiye)
    const awb = await srCall("/courier/assign/awb", token, "POST", { shipment_id: shipmentId });
    const awbData = awb.json?.response?.data;
    if (!awb.ok || !awbData?.awb_code) {
      await setStatus({ shiprocket_status: "awb_failed", shiprocket_error: JSON.stringify(awb.json).slice(0, 500) });
      return;
    }
    await setStatus({
      awb_code: String(awbData.awb_code),
      courier_name: awbData.courier_name || null,
      shiprocket_status: "awb_assigned",
      shiprocket_error: null,
    });

    // 5. Pickup schedule karo
    const pickup = await srCall("/courier/generate/pickup", token, "POST", { shipment_id: [shipmentId] });
    if (pickup.ok) {
      await setStatus({ shiprocket_status: "pickup_scheduled", shiprocket_error: null });
    } else {
      await setStatus({ shiprocket_status: "pickup_failed", shiprocket_error: JSON.stringify(pickup.json).slice(0, 500) });
    }
  } catch (err) {
    console.error("Shiprocket flow error:", err);
    await setStatus({ shiprocket_status: "error", shiprocket_error: String((err as Error).message).slice(0, 500) });
  }
}

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

    // payment_orders.amount = product price + shipping. Seller ka hisaab sirf product price pe.
    const shippingCharge = Number(pendingOrder.shipping_charge || 0);
    const itemAmount = Math.round((Number(pendingOrder.amount) - shippingCharge) * 100) / 100;
    const commission = Math.round(itemAmount * COMMISSION_RATE * 100) / 100;
    const sellerPayout = Math.round((itemAmount - commission) * 100) / 100;

    const { data: newOrder, error: orderErr } = await supabase
      .from("orders")
      .insert({
        buyer_id: pendingOrder.buyer_id,
        seller_id: pendingOrder.seller_id,
        product_id: pendingOrder.product_id,
        product_title: pendingOrder.product_title,
        amount: itemAmount,
        shipping_charge: shippingCharge,
        status: "processing",
        razorpay_order_id: cfOrderId,
        order_type: "buy",
        platform_commission: commission,
        seller_payout_amount: sellerPayout,
        payout_status: "pending",
        buyer_name: pendingOrder.buyer_name || null,
        buyer_phone: pendingOrder.buyer_phone || null,
        delivery_address: pendingOrder.delivery_address || null,
        delivery_city: pendingOrder.delivery_city || null,
        delivery_state: pendingOrder.delivery_state || null,
        delivery_pincode: pendingOrder.delivery_pincode || null,
      })
      .select()
      .single();

    if (orderErr) {
      console.error("orders insert failed:", orderErr);
      return new Response(JSON.stringify({ error: "Failed to create order" }), { status: 500 });
    }

    // Product ki pehli image nikalo, taaki notification mein dikhe
    let productImageUrl: string | null = null;
    const { data: productRow } = await supabase
      .from("products")
      .select("images")
      .eq("id", pendingOrder.product_id)
      .maybeSingle();
    if (productRow?.images && Array.isArray(productRow.images) && productRow.images.length > 0) {
      productImageUrl = productRow.images[0];
    }

    await supabase.from("notifications").insert({
      user_id: pendingOrder.seller_id,
      title: "New Order! 🎉",
      message: `You've received an order for ${pendingOrder.product_title}. Pack the parcel and keep it ready — the courier will arrive soon for pickup.`,
      type: "order",
      is_read: false,
      related_order_id: newOrder?.id || null,
      image_url: productImageUrl,
    });

    // Duplicate webhook se bachne ke liye pehle hi "completed" mark karo
    await supabase.from("payment_orders").update({ status: "completed" }).eq("cf_order_id", cfOrderId);

    // Shiprocket ka kaam background mein (webhook turant 200 de deta hai)
    const shipmentTask = createShipment(supabase, newOrder, pendingOrder, cfOrderId);
    const runtime = (globalThis as any).EdgeRuntime;
    if (runtime?.waitUntil) {
      runtime.waitUntil(shipmentTask);
    } else {
      await shipmentTask;
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
