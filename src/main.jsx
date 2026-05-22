import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Auth from './Auth.jsx'
import { supabase } from './supabase'

// Root component: decides whether to show the login screen or the app,
// based on whether someone is currently signed in.
function Root() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // On first load, ask Supabase if there's already a saved session.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })

    // Listen for sign-in / sign-out events so the screen updates instantly.
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
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

  // No session => show login screen. Session => show the app.
  return session ? <App /> : <Auth />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
