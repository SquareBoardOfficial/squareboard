import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Auth from './Auth.jsx'
import ResetPassword from './ResetPassword.jsx'
import { supabase } from './supabase'

// Root component: decides whether to show the login screen, the password
// reset screen, or the app — based on whether someone is signed in and
// whether they just arrived via a password recovery link.
function Root() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [isRecovery, setIsRecovery] = useState(false)

  useEffect(() => {
    // On first load, ask Supabase if there's already a saved session.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })

    // Listen for auth events so the screen updates instantly.
    // PASSWORD_RECOVERY fires when the user lands via the email reset link.
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecovery(true)
        }
        setSession(newSession)
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  // Brief moment while we check for an existing session.
  if (checking) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-400 flex items-center justify-center">
        Loading…
      </div>
    )
  }

  // Recovery beats everything else: if the user arrived via a reset link,
  // show the password-reset screen even though they're technically signed in.
  if (isRecovery) return <ResetPassword />

  // No session => show login screen. Session => show the app.
  return session ? <App /> : <Auth />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
