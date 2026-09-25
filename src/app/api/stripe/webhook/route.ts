import type { NextRequest } from "next/server";

import { BASE_URL } from "@/lib/api/client";

/**
 * Stripe's webhook, relayed to the API.
 *
 * The API listens on loopback only, so Stripe cannot reach it; this app is the
 * public origin. Nothing is checked here — the API verifies the signature with
 * the webhook secret, which this app never holds. The body is forwarded as the
 * exact bytes Stripe sent, because the signature covers those bytes.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature." }, { status: 400 });
  }

  const body = Buffer.from(await request.arrayBuffer());

  const upstream = await fetch(`${BASE_URL}/api/stripe/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": signature },
    body,
    cache: "no-store",
  }).catch(() => null);

  if (!upstream) {
    // A non-2xx makes Stripe retry, which is what should happen while the API
    // is restarting.
    return Response.json({ error: "Payments service unavailable." }, { status: 503 });
  }

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
}
