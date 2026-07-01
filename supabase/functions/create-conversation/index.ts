import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, X-Client-Info, apikey, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

async function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    // Respond to preflight with 204 No Content to satisfy browsers
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Validate the caller with anon key context
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const bookingId = body?.bookingId;
    if (!bookingId) return jsonResponse({ error: "Missing bookingId" }, 400);

    // Use service role to perform the insert (bypass RLS safely)
    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Look up booking to validate
    const { data: booking, error: bookingError } = await svc
      .from("bookings")
      .select("customer_id, professional_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("create-conversation: booking lookup failed", bookingError);
      return jsonResponse({ error: "Booking not found" }, 404);
    }

    // Create conversation row using service role
    const { data: created, error } = await svc
      .from("conversations")
      .insert({
        customer_id: booking.customer_id,
        professional_id: booking.professional_id,
        booking_id: bookingId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("create-conversation: insert failed", error);
      return jsonResponse({ error: "Failed to create conversation" }, 500);
    }

    return jsonResponse({ id: created.id });
  } catch (err) {
    console.error("create-conversation error", err);
    return jsonResponse({ error: "Server error" }, 500);
  }
});
