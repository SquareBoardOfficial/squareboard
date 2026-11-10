// Terms.jsx
// SquareBoard's Terms of Use, shown at /terms (signed in or not).
//
// STARTING DRAFT: written in plain language as a placeholder. It has NOT been
// reviewed by a lawyer. Have it reviewed before a wide launch, and update the
// "Last updated" date whenever it changes. If the terms move to their own
// page somewhere else, set VITE_TERMS_URL in Vercel and the app's links will
// point there instead.

const LAST_UPDATED = 'November 10, 2026';
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || '';

function Section({ title, children }) {
  return (
    <section className="mb-6">
      <h2 className="text-lg font-bold mb-2">{title}</h2>
      <div className="space-y-2 text-sm text-slate-300 leading-relaxed">{children}</div>
    </section>
  );
}

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white p-4">
      <div className="max-w-2xl mx-auto py-8">
        <a href="/" className="text-sm text-slate-400 hover:text-white">← SquareBoard</a>
        <h1 className="text-3xl font-black tracking-tight mt-4">Terms of Use</h1>
        <p className="text-xs text-slate-500 mt-1 mb-8">Last updated {LAST_UPDATED}</p>

        <Section title="1. Using SquareBoard">
          <p>
            SquareBoard is a tool for setting up and following football squares boards with
            friends, family and groups. By creating an account or using SquareBoard, you agree
            to these terms. If you don't agree, please don't use the app.
          </p>
          <p>You must be at least 18 years old, or the age of majority where you live, to create an account.</p>
        </Section>

        <Section title="2. For entertainment">
          <p>
            SquareBoard is provided for entertainment. You may not use SquareBoard to run,
            organize or record gambling, betting or wagering of any kind, including collecting
            money for squares or paying out prizes based on results.
          </p>
          <p>
            You are responsible for making sure the way you and your group use SquareBoard
            follows the laws that apply where you live.
          </p>
        </Section>

        <Section title="3. Hosts">
          <p>
            When you create a board, you're its host. You're responsible for your board and
            for how your group uses it, including the names, titles and messages on it.
          </p>
        </Section>

        <Section title="4. Your account">
          <p>
            Keep your login details private. You're responsible for activity on your account.
            Don't use someone else's account or create accounts to get around limits.
          </p>
        </Section>

        <Section title="5. Content and conduct">
          <p>
            Don't post anything unlawful, abusive, hateful, or that infringes someone else's
            rights, and don't try to disrupt or misuse the service.
          </p>
        </Section>

        <Section title="6. Reports and removal">
          <p>
            Anyone can use "Report a problem" on a board to tell us about misuse. We may review,
            hide or remove boards, comments or accounts, and limit access to SquareBoard, if we
            believe these terms have been broken.
          </p>
        </Section>

        <Section title="7. Paid features">
          <p>
            Some features, like unlimited boards and custom themes, need a one-time unlock.
            Payments are processed by Stripe. The unlock is for the features described at the
            time of purchase.
          </p>
        </Section>

        <Section title="8. No warranty">
          <p>
            SquareBoard is provided "as is" and "as available." We don't promise it will always
            be available, error-free, or that scores, numbers or results shown will be accurate.
          </p>
        </Section>

        <Section title="9. Limitation of liability">
          <p>
            To the fullest extent allowed by law, SquareBoard and its operators aren't liable for
            any indirect or consequential losses, or for any losses arising from how users or
            groups use the app. Our total liability for any claim is limited to the amount you
            paid us in the 12 months before the claim.
          </p>
        </Section>

        <Section title="10. Changes">
          <p>
            We may update these terms. If we make important changes, we'll let you know in the
            app. Continuing to use SquareBoard after changes means you accept them.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            {CONTACT_EMAIL ? (
              <>Questions? Email <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</>
            ) : (
              <>Questions or concerns? Use the "Report a problem" link on any board and we'll get back to you.</>
            )}
          </p>
        </Section>
      </div>
    </div>
  );
}
