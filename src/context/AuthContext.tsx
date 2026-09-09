import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { clearSession } from '../lib/storage'

interface SignUpInput {
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signUp: (input: SignUpInput) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const ADMIN_EMAIL = 'thibiosang@gmail.com'

export function isAdminEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === ADMIN_EMAIL
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  async function signUp({ email, password, firstName, lastName, phone }: SignUpInput) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName, phone },
      },
    })
    return { error: error ? translateAuthError(error.message) : null }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? translateAuthError(error.message) : null }
  }

  async function signOut() {
    // Le panier est stocke localement, independamment du compte : on l'efface pour
    // eviter qu'il ne "fuite" vers le prochain compte connecte sur cet appareil.
    clearSession('cart-items')
    clearSession('cart-slot')
    clearSession('cart-address')
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

function translateAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.'
  if (message.includes('User already registered')) return 'Un compte existe déjà avec cet email.'
  if (message.includes('Password should be at least')) return 'Le mot de passe doit contenir au moins 6 caractères.'
  return message
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé à l’intérieur de AuthProvider')
  return ctx
}
