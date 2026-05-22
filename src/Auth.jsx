import React, { useState } from 'react';
import { supabase } from './supabase';

// A simple login / signup screen.
// Shown by main.jsx whenever nobody is signed in.
export default function Auth() {
  const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  async function handleSubmit() {
    setErrorMsg('');
    setInfoMsg('');

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
          <p className="text-slate-400 mt-2 text-sm">
            {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
          </p>
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
              placeholder="you@example.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition"
            />
          </div>

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
          </div>

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
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>

          <div className="text-center text-sm text-slate-400">
            {mode === 'signin' ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => { setMode('signup'); setErrorMsg(''); setInfoMsg(''); }}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('signin'); setErrorMsg(''); setInfoMsg(''); }}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
