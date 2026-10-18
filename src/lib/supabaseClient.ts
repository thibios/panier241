import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes (voir .env.example).',
  )
}

const REMEMBER_KEY = 'panier241:remember-me'

/** « Rester connecté » : vrai par défaut ; faux si l'utilisateur l'a décoché à sa dernière connexion. */
export function getRememberMe(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== '0'
  } catch {
    return true
  }
}

export function setRememberMe(value: boolean) {
  try {
    localStorage.setItem(REMEMBER_KEY, value ? '1' : '0')
  } catch {
    // Stockage indisponible : la session restera celle par défaut.
  }
}

/**
 * La session (jetons Supabase, jamais le mot de passe) est gardée dans
 * localStorage si « Rester connecté » est coché, sinon dans sessionStorage :
 * elle disparaît alors à la fermeture de l'onglet.
 */
const sessionStore = {
  getItem(key: string) {
    try {
      return localStorage.getItem(key) ?? sessionStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem(key: string, value: string) {
    try {
      if (getRememberMe()) {
        localStorage.setItem(key, value)
        sessionStorage.removeItem(key)
      } else {
        sessionStorage.setItem(key, value)
        localStorage.removeItem(key)
      }
    } catch {
      // Stockage indisponible (navigation privée stricte) : session limitée à la page.
    }
  },
  removeItem(key: string) {
    try {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    } catch {
      // Rien à nettoyer.
    }
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: sessionStore, persistSession: true, autoRefreshToken: true },
})
