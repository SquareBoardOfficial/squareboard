// LegalLinks.jsx
// Small footer row with links to the Terms of Service and Privacy Policy.
//
// Link targets are set in ./legal.js.
import { TERMS_URL, PRIVACY_URL } from './legal';

export default function LegalLinks({ className = '' }) {
  if (!TERMS_URL && !PRIVACY_URL) return null;
  return (
    <div className={`flex items-center justify-center gap-3 text-xs text-slate-500 ${className}`}>
      {TERMS_URL && (
        <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 underline underline-offset-2">
          Terms of Use
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
