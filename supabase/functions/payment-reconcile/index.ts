// Standalone admin-only function: checks Cashfree's actual payment status
// against our local orders table, for recently created orders.
// Does NOT modify any order — read-only reconciliation, safe to call anytime.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CASHFREE_APP_ID = Deno.env.get("CASHFREE_APP_ID")!;
const CASHFREE_SECRET_KEY = Deno.env.get("CASHFREE_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify the caller is a logged-in admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Not allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recent orders that aren't cancelled/delivered (most likely to have stale status)
    const { data: orders, error: ordersErr } = await admin
      .from("orders")
      .select("id, order_number, status, razorpay_order_id, amount, created_at")
      .in("status", ["processing", "pending", "created"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (ordersErr) {
      return new Response(JSON.stringify({ error: "Failed to fetch orders", detail: ordersErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const order of orders || []) {
      if (!order.razorpay_order_id) {
        results.push({
          order_number: order.order_number,
          local_status: order.status,
          cashfree_status: null,
          mismatch: false,
          note: "No Cashfree order id saved on this order",
        });
        continue;
      }

      try {
        const cfRes = await fetch(`https://api.cashfree.com/pg/orders/${order.razorpay_order_id}`, {
          method: "GET",
          headers: {
            "x-client-id": CASHFREE_APP_ID,
            "x-client-secret": CASHFREE_SECRET_KEY,
            "x-api-version": "2023-08-01",
          },
        });
        const cfData = await cfRes.json();

        if (!cfRes.ok) {
          results.push({
            order_number: order.order_number,
            local_status: order.status,
            cashfree_status: null,
            mismatch: false,
            note: `Cashfree lookup failed: ${cfData?.message || cfRes.status}`,
          });
          continue;
        }

        const cfPaymentStatus = cfData.order_status; // e.g. "PAID", "ACTIVE", "EXPIRED"
        const paidButStuck = cfPaymentStatus === "PAID" && order.status !== "delivered" && order.status !== "shipped" && order.status === "processing" ? false : cfPaymentStatus === "PAID" && (order.status === "pending" || order.status === "created");

        results.push({
          order_number: order.order_number,
          local_status: order.status,
          cashfree_status: cfPaymentStatus,
          amount: order.amount,
          mismatch: paidButStuck,
          created_at: order.created_at,
        });
      } catch (e) {
        results.push({
          order_number: order.order_number,
          local_status: order.status,
          cashfree_status: null,
          mismatch: false,
          note: `Error checking: ${e.message}`,
        });
      }
    }

    return new Response(
      JSON.stringify({
        checked: results.length,
        mismatches: results.filter((r) => r.mismatch).length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
