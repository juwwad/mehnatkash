import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function createJwt(
  privateKeyJwk: JsonWebKey,
  audience: string,
  subject: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject,
  };

  const enc = new TextEncoder();
  const headerB64 = uint8ArrayToBase64Url(enc.encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(unsignedToken)
  );

  const sigArray = new Uint8Array(signature);
  const sigB64 = uint8ArrayToBase64Url(sigArray);

  return `${unsignedToken}.${sigB64}`;
}

async function encryptPayload(
  payload: string,
  subscriptionKey: string,
  subscriptionAuth: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeyPair.publicKey)
  );

  const clientPublicKey = await crypto.subtle.importKey(
    "raw",
    base64UrlToUint8Array(subscriptionKey),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientPublicKey },
      serverKeyPair.privateKey,
      256
    )
  );

  const authSecret = base64UrlToUint8Array(subscriptionAuth);

  const ikmKey = await crypto.subtle.importKey(
    "raw",
    authSecret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const ikm = new Uint8Array(
    await crypto.subtle.sign("HMAC", ikmKey, sharedSecret)
  );

  const keyInfoBuf = new Uint8Array([
    ...enc.encode("Content-Encoding: aes128gcm\0"),
  ]);

  const nonceInfoBuf = new Uint8Array([
    ...enc.encode("Content-Encoding: nonce\0"),
  ]);

  const prkKeyFinal = await crypto.subtle.importKey(
    "raw",
    salt,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const prk = new Uint8Array(
    await crypto.subtle.sign("HMAC", prkKeyFinal, ikm)
  );

  const cekInfo = new Uint8Array([...keyInfoBuf, 1]);
  const cekKeyImport = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const cekFull = new Uint8Array(
    await crypto.subtle.sign("HMAC", cekKeyImport, cekInfo)
  );
  const cek = cekFull.slice(0, 16);

  const nonceInfo = new Uint8Array([...nonceInfoBuf, 1]);
  const nonceKeyImport = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const nonceFull = new Uint8Array(
    await crypto.subtle.sign("HMAC", nonceKeyImport, nonceInfo)
  );
  const nonce = nonceFull.slice(0, 12);

  const payloadBytes = enc.encode(payload);
  const paddedPayload = new Uint8Array([...payloadBytes, 2]);

  const aesKey = await crypto.subtle.importKey(
    "raw",
    cek,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      aesKey,
      paddedPayload
    )
  );

  const rs = new DataView(new ArrayBuffer(4));
  rs.setUint32(0, 4096);
  const header = new Uint8Array([
    ...salt,
    ...new Uint8Array(rs.buffer),
    serverPublicKeyRaw.length,
    ...serverPublicKeyRaw,
  ]);

  const body = new Uint8Array([...header, ...encrypted]);

  return { ciphertext: body, salt, serverPublicKey: serverPublicKeyRaw };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = user.id;

    const rawBody = await req.json();
    const userId = rawBody.userId;

    // Sanitize and cap notification content to prevent content injection
    const safeTitle = String(rawBody.title || "").slice(0, 80).replace(/[<>]/g, "");
    const safeBody = String(rawBody.body || "").slice(0, 200).replace(/[<>]/g, "");
    // Only allow known safe keys in data payload
    const rawData = rawBody.data && typeof rawBody.data === "object" ? rawBody.data : {};
    const allowedDataKeys = ["bookingId", "conversationId", "type", "url"];
    const safeData: Record<string, string> = {};
    for (const key of allowedDataKeys) {
      if (key in rawData && typeof rawData[key] === "string") {
        safeData[key] = String(rawData[key]).slice(0, 255);
      }
    }

    // Validate userId as UUID
    if (!userId || !UUID_RE.test(userId)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also validate callerId format
    if (!UUID_RE.test(callerId)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for data operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the caller has a relationship with the target user (via bookings or conversations)
    const { data: hasRelation } = await supabase.rpc("has_role", { _user_id: callerId, _role: "admin" });
    
    if (!hasRelation) {
      // Use parameterized filters instead of string interpolation
      const { data: callerProfessional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", callerId);

      const { data: targetProfessional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", userId);

      const callerProfIds = (callerProfessional || []).map((p: any) => p.id);
      const targetProfIds = (targetProfessional || []).map((p: any) => p.id);

      // Check shared bookings using safe parameterized queries
      let hasSharedBooking = false;
      if (callerProfIds.length > 0) {
        const { data: b1 } = await supabase
          .from("bookings")
          .select("id")
          .eq("customer_id", userId)
          .in("professional_id", callerProfIds)
          .limit(1);
        if (b1 && b1.length > 0) hasSharedBooking = true;
      }
      if (!hasSharedBooking && targetProfIds.length > 0) {
        const { data: b2 } = await supabase
          .from("bookings")
          .select("id")
          .eq("customer_id", callerId)
          .in("professional_id", targetProfIds)
          .limit(1);
        if (b2 && b2.length > 0) hasSharedBooking = true;
      }
      if (!hasSharedBooking) {
        // Also check if caller is customer and target is professional or vice versa
        const { data: b3 } = await supabase
          .from("bookings")
          .select("id")
          .eq("customer_id", callerId)
          .eq("customer_id", userId) // won't match unless same person
          .limit(1);
        // Simplified: check conversations instead
      }

      // Check shared conversations using safe parameterized queries
      let hasSharedConvo = false;
      if (!hasSharedBooking) {
        if (callerProfIds.length > 0) {
          const { data: c1 } = await supabase
            .from("conversations")
            .select("id")
            .eq("customer_id", userId)
            .in("professional_id", callerProfIds)
            .limit(1);
          if (c1 && c1.length > 0) hasSharedConvo = true;
        }
        if (!hasSharedConvo && targetProfIds.length > 0) {
          const { data: c2 } = await supabase
            .from("conversations")
            .select("id")
            .eq("customer_id", callerId)
            .in("professional_id", targetProfIds)
            .limit(1);
          if (c2 && c2.length > 0) hasSharedConvo = true;
        }
        if (!hasSharedConvo) {
          // Check reverse: caller is customer, target is customer in same convo
          // This covers customer-to-customer edge case (shouldn't normally happen)
        }
      }

      if (!hasSharedBooking && !hasSharedConvo) {
        return new Response(
          JSON.stringify({ error: "Not authorized to notify this user" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get VAPID keys - prefer environment secrets
    const envPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const envPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    let vapidPrivateKeyJson: string;
    let vapidPublicKey: string;

    if (envPrivateKey && envPublicKey) {
      vapidPrivateKeyJson = envPrivateKey;
      vapidPublicKey = envPublicKey;
    } else {
      // Fallback: read from push_config table
      const { data: config } = await supabase
        .from("push_config")
        .select("*")
        .limit(1)
        .single();

      if (!config) {
        return new Response(
          JSON.stringify({ error: "Push configuration not available" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      vapidPrivateKeyJson = config.private_key;
      vapidPublicKey = config.public_key;
    }

    // Get user's push subscriptions
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No push subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const privateKeyJwk = JSON.parse(vapidPrivateKeyJson);
    const payload = JSON.stringify({
      title: safeTitle || "TashkHaath Connect",
      body: safeBody || "You have a new notification",
      icon: "/app-icon.svg",
      badge: "/app-icon.svg",
      data: safeData,
    });

    let sent = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      try {
        const url = new URL(sub.endpoint);
        const audience = `${url.protocol}//${url.host}`;

        const jwt = await createJwt(
          privateKeyJwk,
          audience,
          `mailto:noreply@tashkhaath.app`
        );

        const { ciphertext } = await encryptPayload(
          payload,
          sub.p256dh,
          sub.auth
        );

        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            TTL: "86400",
            Urgency: "high",
          },
          body: ciphertext,
        });

        if (response.ok || response.status === 201) {
          sent++;
        } else {
          const text = await response.text();
          errors.push(`${response.status}: ${text}`);

          if (response.status === 404 || response.status === 410) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
          }
        }
      } catch (e) {
        errors.push(e.message);
      }
    }

    return new Response(
      JSON.stringify({ sent, total: subscriptions.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
