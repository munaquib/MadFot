import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");

    // Pehle confirm karo ki request bhejne wala banda logged in hai
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await anonClient.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, buyer_id, seller_id, awb_code, courier_name, shiprocket_status")
      .eq("id", order_id)
      .maybeSingle();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sirf isi order ka buyer ya seller hi tracking dekh sake
    if (order.buyer_id !== userId && order.seller_id !== userId) {
      return new Response(JSON.stringify({ error: "Not allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!order.awb_code) {
      return new Response(
        JSON.stringify({
          status: "not_shipped_yet",
          courier_name: null,
          activities: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Shiprocket login
    const loginRes = await fetch(`${SHIPROCKET_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: Deno.env.get("SHIPROCKET_EMAIL"),
        password: Deno.env.get("SHIPROCKET_PASSWORD"),
      }),
    });
    const loginJson = await loginRes.json().catch(() => ({}));
    const token = loginJson?.token;
    if (!loginRes.ok || !token) {
      return new Response(
        JSON.stringify({ status: "unavailable", courier_name: order.courier_name, activities: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Live tracking fetch
    const trackRes = await fetch(`${SHIPROCKET_BASE}/courier/track/awb/${order.awb_code}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const trackJson = await trackRes.json().catch(() => ({}));

    const trackingData = trackJson?.tracking_data || trackJson?.[Object.keys(trackJson || {})[0]]?.tracking_data;
    const rawActivities = trackingData?.shipment_track_activities || [];

    const activities = rawActivities.map((a: any) => ({
      date: a.date || null,
      status: a.status || a["sr-status-label"] || "",
      location: a.location || "",
      activity: a.activity || "",
    }));

    return new Response(
      JSON.stringify({
        status: trackingData?.shipment_status || order.shiprocket_status || "in_transit",
        courier_name: order.courier_name,
        awb_code: order.awb_code,
        activities,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("shiprocket-track error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch tracking", activities: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
