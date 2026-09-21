import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";
const PARCEL = { weight: 0.5, length: 25, breadth: 20, height: 5 };

async function srCall(path: string, token: string | null, method: string, body?: unknown) {
  const res = await fetch(`${SHIPROCKET_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "MadFod-SandboxTest/1.0",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const steps: Record<string, unknown> = {};

  try {
    // Step 1: Login (sandbox credentials)
    const login = await srCall("/auth/login", null, "POST", {
      email: Deno.env.get("SHIPROCKET_SANDBOX_EMAIL"),
      password: Deno.env.get("SHIPROCKET_SANDBOX_PASSWORD"),
    });
    steps.login = { ok: login.ok, status: login.status, has_token: !!login.json?.token };

    const token = login.json?.token;
    if (!login.ok || !token) {
      steps.login_error = login.json;
      return new Response(JSON.stringify({ success: false, steps }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Pickup location register (ya already existing dekho)
    const pickupName = "MF-SANDBOXTEST";
    const list = await srCall("/settings/company/pickup", token, "GET");
    const existing = (list.json?.data?.shipping_address || []).find(
      (a: any) => a.pickup_location === pickupName
    );

    if (!existing) {
      const add = await srCall("/settings/company/addpickup", token, "POST", {
        pickup_location: pickupName,
        name: "MadFod Test Seller",
        email: "support.madfod@gmail.com",
        phone: "9999999999",
        address: "D-345, Buddha Enclave, Lohiya Nagar",
        address_2: "",
        city: "Meerut",
        state: "Uttar Pradesh",
        country: "India",
        pin_code: "250002",
      });
      steps.pickup_created = { ok: add.ok, response: add.json };
      if (!add.ok || add.json?.success === false) {
        return new Response(JSON.stringify({ success: false, steps }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      steps.pickup_created = { ok: true, note: "already existed" };
    }

    // Step 3: Dummy order create
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const orderDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const testOrderId = `SANDBOX_${Date.now()}`;

    const created = await srCall("/orders/create/adhoc", token, "POST", {
      order_id: testOrderId,
      order_date: orderDate,
      pickup_location: pickupName,
      billing_customer_name: "Test Buyer",
      billing_last_name: "",
      billing_address: "123 Test Street",
      billing_city: "Delhi",
      billing_pincode: "110001",
      billing_state: "Delhi",
      billing_country: "India",
      billing_email: "testbuyer@madfod.com",
      billing_phone: "9876543210",
      shipping_is_billing: true,
      order_items: [
        { name: "Sandbox Test Product", sku: "TEST001", units: 1, selling_price: 500 },
      ],
      payment_method: "Prepaid",
      sub_total: 500,
      length: PARCEL.length,
      breadth: PARCEL.breadth,
      height: PARCEL.height,
      weight: PARCEL.weight,
    });

    steps.order_create = { ok: created.ok, response: created.json };
    const shipmentId = created.json?.shipment_id;
    if (!created.ok || !shipmentId) {
      return new Response(JSON.stringify({ success: false, steps }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 4: AWB assign
    const awb = await srCall("/courier/assign/awb", token, "POST", { shipment_id: shipmentId });
    steps.awb_assign = { ok: awb.ok, response: awb.json };

    const awbCode = awb.json?.response?.data?.awb_code;

    // Step 5: Tracking fetch (agar AWB mil gaya)
    if (awbCode) {
      const track = await srCall(`/courier/track/awb/${awbCode}`, token, "GET");
      steps.tracking = { ok: track.ok, response: track.json };
    } else {
      steps.tracking = { skipped: true, reason: "No AWB assigned (sandbox courier serviceability issue ho sakta hai)" };
    }

    return new Response(
      JSON.stringify({ success: true, shipment_id: shipmentId, awb_code: awbCode || null, steps }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sandbox test error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String((error as Error).message), steps }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
