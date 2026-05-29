import React, { useState } from 'react';
import { supabase } from './supabase';

// A simple login / signup / forgot-password screen.
// Shown by main.jsx whenever nobody is signed in.
export default function Auth() {
  // 'signin', 'signup', or 'forgot' (the "send me a reset link" form)
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  async function handleSubmit() {
    setErrorMsg('');
    setInfoMsg('');

    // The "forgot password" mode only needs an email.
    if (mode === 'forgot') {
      if (!email.trim()) {
        setErrorMsg('Please enter the email you signed up with.');
        return;
      }
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          // Where Supabase sends the user after they click the reset link.
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );
      setBusy(false);
      if (error) {
        setErrorMsg(error.message);
      } else {
        setInfoMsg(
          'If an account exists for that email, a reset link is on its way. ' +
          'Check your inbox (and spam) and click the link to set a new password.'
        );
      }
      return;
    }

    // Sign-in / sign-up modes both need email and password.
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both an email and a password.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setBusy(true);

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      setBusy(false);
      if (error) {
        setErrorMsg(error.message);
      } else {
        // Confirm-email is ON, so the user must click a link before logging in.
        setInfoMsg(
          'Account created! Check your email for a confirmation link, ' +
          'then come back here and sign in.'
        );
        setMode('signin');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setBusy(false);
      if (error) {
        setErrorMsg(error.message);
      }
      // On success, main.jsx notices the new session and swaps to the app.
    }
  }

  // Reset the form when switching between modes so leftover text doesn't bleed across.
  function switchMode(newMode) {
    setMode(newMode);
    setErrorMsg('');
    setInfoMsg('');
    setPassword('');
  }

  // Heading and button label depend on which mode we're in.
  const heading =
    mode === 'signin' ? 'Sign in to your account' :
    mode === 'signup' ? 'Create your account' :
    'Reset your password';

  const submitLabel =
    busy ? 'Please wait…' :
    mode === 'signin' ? 'Sign In' :
    mode === 'signup' ? 'Sign Up' :
    'Send reset link';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white p-4 flex items-center justify-center">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 mb-4 shadow-lg shadow-emerald-500/30">
            <div className="grid grid-cols-2 gap-0.5">
              <div className="w-2 h-2 bg-white rounded-sm"></div>
              <div className="w-2 h-2 bg-white/60 rounded-sm"></div>
              <div className="w-2 h-2 bg-white/60 rounded-sm"></div>
              <div className="w-2 h-2 bg-white rounded-sm"></div>
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight">SquareBoard</h1>
          <p className="text-slate-400 mt-2 text-sm">{heading}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => mode === 'forgot' && e.key === 'Enter' && handleSubmit()}
              placeholder="you@example.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition"
            />
          </div>

          {/* Password field only appears for sign-in and sign-up */}
          {mode !== 'forgot' && (
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition"
              />
              {mode === 'signin' && (
                <div className="text-right mt-2">
                  <button
                    onClick={() => switchMode('forgot')}
                    className="text-xs text-slate-400 hover:text-emerald-300 underline underline-offset-2"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">
              {errorMsg}
            </div>
          )}
          {infoMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-sm text-emerald-300">
              {infoMsg}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={busy}
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {submitLabel}
          </button>

          <div className="text-center text-sm text-slate-400">
            {mode === 'signin' && (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => switchMode('signup')}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Sign up
                </button>
              </>
            )}
            {mode === 'signup' && (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => switchMode('signin')}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Sign in
                </button>
              </>
            )}
            {mode === 'forgot' && (
              <>
                Remembered it?{' '}
                <button
                  onClick={() => switchMode('signin')}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Back to sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
