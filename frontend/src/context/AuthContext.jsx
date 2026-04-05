import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, supabaseReady } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(supabaseReady)

  useEffect(() => {
    if (!supabaseReady) return

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn = (email, password) =>
    supabaseReady
      ? supabase.auth.signInWithPassword({ email, password })
      : Promise.reject(new Error('Supabase nicht konfiguriert'))

  const signUp = (email, password) =>
    supabaseReady
      ? supabase.auth.signUp({ email, password })
      : Promise.reject(new Error('Supabase nicht konfiguriert'))

  const signOut = () =>
    supabaseReady ? supabase.auth.signOut() : Promise.resolve()

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, supabaseReady }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
