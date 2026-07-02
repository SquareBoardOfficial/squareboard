// POST /api/stripe-webhook
//
// Stripe calls this endpoint after events happen (we care about
// checkout.session.completed). This is the ONLY place is_unlocked gets
// flipped to true, and it is security-critical:
//
//   1. It verifies Stripe's signature against STRIPE_WEBHOOK_SECRET. This is
//      what proves the request genuinely came from Stripe and not a forger.
//      Without this check, anyone could POST a fake "they paid" event and
//      unlock for free.
//   2. Only after verification does it read the Supabase user ID back out of
//      the session and set is_unlocked = true using the service-role key.
//
// The service-role key bypasses RLS, which is exactly why it must live only
// here (server-side env var) and never in client code.

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Signature verification requires the RAW request body. Vercel parses JSON by
// default, which would corrupt the signature check, so we turn that off and
// read the raw bytes ourselves below.
export const config = {
  api: {
    bodyParser: false,
  },
};

// Collect the raw request body as a Buffer.
async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    const rawBody = await readRawBody(req);
    // Throws if the signature doesn't match — that's the security gate.
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // We only act on a completed checkout. Other event types are acknowledged
  // with 200 so Stripe doesn't retry them.
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId =
      session.client_reference_id ||
      (session.metadata && session.metadata.supabase_user_id);

    if (!userId) {
      console.error('checkout.session.completed with no user id attached');
      // 200 so Stripe doesn't keep retrying a session we can't map to a user.
      return res.status(200).json({ received: true, note: 'no user id' });
    }

    // Create a Supabase client with the service-role key (bypasses RLS).
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabase
      .from('profiles')
      .update({ is_unlocked: true })
      .eq('id', userId);

    if (error) {
      console.error('Failed to flip is_unlocked for', userId, error);
      // 500 tells Stripe to retry later — the payment succeeded, so we do
      // want another attempt at unlocking rather than dropping it.
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    console.log('Unlocked user', userId);
    return res.status(200).json({ received: true });
  }

  // Any other event type: acknowledge and move on.
  return res.status(200).json({ received: true });
}
