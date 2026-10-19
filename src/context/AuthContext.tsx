import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
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
  /** Compte inscrit dans admin_users (migration 027), que la double authentification soit faite ou non. */
  isAdminMember: boolean
  /** Administrateur effectif : inscrit dans admin_users ET session en aal2 (réponse de public.is_admin()). */
  isAdmin: boolean
  /** Un facteur TOTP vérifié existe mais la session n'est qu'en aal1 : le code à 6 chiffres est requis. */
  mfaRequired: boolean
  /** Relit le niveau d'authentification et les droits admin (après vérification ou retrait d'un facteur). */
  refreshSecurity: () => Promise<void>
}

interface SecurityState {
  isAdminMember: boolean
  isAdmin: boolean
  mfaRequired: boolean
}

const NO_SECURITY: SecurityState = { isAdminMember: false, isAdmin: false, mfaRequired: false }

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Droits lus en base (migration 027) : le rôle admin n'est plus déduit de l'e-mail.
 * Les refus de la base font foi ; en cas d'erreur de lecture, aucun droit n'est accordé côté écran.
 */
async function readSecurity(userId: string): Promise<SecurityState> {
  const [aalRes, memberRes, adminRes] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.rpc('is_admin'),
  ])
  return {
    mfaRequired: !aalRes.error && aalRes.data.currentLevel === 'aal1' && aalRes.data.nextLevel === 'aal2',
    isAdminMember: !memberRes.error && memberRes.data !== null,
    isAdmin: !adminRes.error && adminRes.data === true,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [security, setSecurity] = useState<SecurityState>(NO_SECURITY)
  // Compte pour lequel les droits ont été lus : l'écran attend cette lecture à chaque connexion.
  const [securityCheckedFor, setSecurityCheckedFor] = useState<string | null>(null)
  const userId = session?.user.id ?? null
  const accessToken = session?.access_token ?? null

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

  // Relu à chaque nouveau jeton (connexion, code vérifié, rafraîchissement) ; hors du rappel
  // onAuthStateChange, où un appel Supabase attendu bloquerait le client.
  useEffect(() => {
    if (!userId || !accessToken) {
      setSecurity(NO_SECURITY)
      return
    }
    let cancelled = false
    readSecurity(userId)
      // Réseau indisponible : aucun droit admin accordé (la base refuse de toute façon en aal1).
      .catch(() => NO_SECURITY)
      .then((next) => {
        if (cancelled) return
        setSecurity(next)
        setSecurityCheckedFor(userId)
      })
    return () => {
      cancelled = true
    }
  }, [userId, accessToken])

  const refreshSecurity = useCallback(async () => {
    if (!userId) return
    setSecurity(await readSecurity(userId))
  }, [userId])

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
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading: loading || (userId !== null && securityCheckedFor !== userId),
        signUp,
        signIn,
        signOut,
        ...security,
        refreshSecurity,
      }}
    >
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
