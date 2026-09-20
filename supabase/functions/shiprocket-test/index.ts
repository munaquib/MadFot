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
    const SHIPROCKET_EMAIL = Deno.env.get("SHIPROCKET_EMAIL")!;
    const SHIPROCKET_PASSWORD = Deno.env.get("SHIPROCKET_PASSWORD")!;

    if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) {
      throw new Error("Shiprocket credentials not configured in secrets");
    }

    // Step 1: Login to Shiprocket to get an auth token
    // Adding a browser-like User-Agent and Accept header, since Shiprocket's
    // Cloudflare protection sometimes blocks plain server-to-server requests.
    const loginRes = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        email: SHIPROCKET_EMAIL,
        password: SHIPROCKET_PASSWORD,
      }),
    });

    const rawText = await loginRes.text();
    let loginData: any;
    try {
      loginData = JSON.parse(rawText);
    } catch {
      loginData = { raw: rawText };
    }

    if (!loginRes.ok || !loginData.token) {
      return new Response(
        JSON.stringify({ step: "login", success: false, status: loginRes.status, response: loginData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const token = loginData.token;

    // Step 2: Use the token to fetch pickup locations (confirms token works end-to-end)
    const pickupRes = await fetch("https://apiv2.shiprocket.in/v1/external/settings/company/pickup", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const pickupData = await pickupRes.json();

    return new Response(
      JSON.stringify({
        step: "pickup_locations",
        login_success: true,
        pickup_success: pickupRes.ok,
        pickup_locations: pickupData,
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
