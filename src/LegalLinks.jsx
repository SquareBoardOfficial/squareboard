// LegalLinks.jsx
// Small footer row with links to the Terms of Service and Privacy Policy.
//
// WHERE TERMS LIVE: SquareBoard doesn't host its own terms yet. Once the
// terms and privacy pages exist (written or reviewed by a lawyer), set these
// environment variables in Vercel and redeploy:
//
//   VITE_TERMS_URL    e.g. https://squareboardapp.com/terms
//   VITE_PRIVACY_URL  e.g. https://squareboardapp.com/privacy
//
// Until they're set, nothing is shown (no broken links).

const TERMS_URL = import.meta.env.VITE_TERMS_URL || '';
const PRIVACY_URL = import.meta.env.VITE_PRIVACY_URL || '';

export const HAS_TERMS = !!TERMS_URL;

export default function LegalLinks({ className = '' }) {
  if (!TERMS_URL && !PRIVACY_URL) return null;
  return (
    <div className={`flex items-center justify-center gap-3 text-xs text-slate-500 ${className}`}>
      {TERMS_URL && (
        <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 underline underline-offset-2">
          Terms
        </a>
      )}
      {PRIVACY_URL && (
        <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 underline underline-offset-2">
          Privacy
        </a>
      )}
    </div>
  );
}
