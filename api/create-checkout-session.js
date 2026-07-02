// POST /api/create-checkout-session
//
// Creates a Stripe Checkout Session for the one-time $5 SquareBoard unlock.
// The browser calls this when a user clicks "Upgrade", then redirects to the
// returned Stripe-hosted checkout URL. No card data ever touches our servers.
//
// We stamp the session with the user's Supabase ID in BOTH client_reference_id
// and metadata so the webhook (stripe-webhook.js) can tell whose account to
// unlock after payment succeeds.

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Read and JSON-parse the request body ourselves. On Vercel's Node runtime
// req.body is not reliably pre-parsed for this function style — it can arrive
// as a string or undefined — so we handle every case here.
async function parseJsonBody(req) {
  // Already an object (some runtimes do parse it) — use as-is.
  if (req.body && typeof req.body === 'object') return req.body;
  // A raw string body — parse it.
  if (typeof req.body === 'string' && req.body.length) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  // Nothing parsed yet — read the raw stream and parse.
  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  // Only POST is allowed — a GET here almost always means something is wrong.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // The browser sends the signed-in user's Supabase ID and an email (optional,
    // used to prefill Stripe's form). userId is required — without it the webhook
    // wouldn't know who to unlock.
    const { userId, email, origin } = await parseJsonBody(req);

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Where to send the user after they finish (or abandon) checkout.
    // We trust an origin passed from the client but fall back to the request
    // host so this works in preview deployments and production alike.
    const baseUrl =
      origin ||
      (req.headers.origin) ||
      (req.headers.host ? `https://${req.headers.host}` : '');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment', // one-time payment, not a subscription
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'SquareBoard Unlock',
              description:
                'One-time unlock: unlimited active boards, custom themes, and custom payout splits.',
            },
            unit_amount: 500, // $5.00, in cents
          },
          quantity: 1,
        },
      ],
      // The webhook reads these back to know which user paid.
      client_reference_id: userId,
      metadata: { supabase_user_id: userId },
      // Prefill the email if we have it (nice-to-have, not required).
      ...(email ? { customer_email: email } : {}),
      success_url: `${baseUrl}/?unlocked=1`,
      cancel_url: `${baseUrl}/?canceled=1`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('create-checkout-session error:', err);
    return res.status(500).json({ error: 'Could not create checkout session' });
  }
}
