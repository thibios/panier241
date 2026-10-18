import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Market } from '../types'
import { markets as staticMarkets } from '../data/markets'
import { supabase } from '../lib/supabaseClient'
import { useAuth, isAdminEmail } from './AuthContext'

/** Marché proposé ou ajouté depuis l'application (table custom_markets). */
export interface CustomMarketRow {
  id: string
  name: string
  neighborhood: string
  city: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

/** Identifiant d'un marché ajouté, côté application (merchants.market_id est un texte). */
export const customMarketId = (uuid: string) => `cm-${uuid}`

function toMarket(row: CustomMarketRow): Market {
  // Photo de marché africain variée d'un marché à l'autre, stable pour un même marché.
  const hash = [...row.id].reduce((n, c) => n + c.charCodeAt(0), 0)
  return {
    id: customMarketId(row.id),
    name: row.name,
    neighborhood: row.neighborhood,
    city: row.city,
    kind: 'marche',
    photoQuery: 'african market',
    photoPage: 1 + (hash % 8),
  }
}

interface MarketsContextValue {
  /** Lieux de vente affichés : liste fixe + marchés approuvés. */
  markets: Market[]
  /** Propose un marché (en attente) ou l'ajoute directement si l'utilisateur est administrateur. */
  addMarket: (name: string, neighborhood: string) => Promise<{ error: string | null; approved: boolean }>
  refresh: () => Promise<void>
}

const MarketsContext = createContext<MarketsContextValue | null>(null)

export function MarketsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [markets, setMarkets] = useState<Market[]>(staticMarkets)

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('custom_markets')
      .select('id, name, neighborhood, city, status, created_at')
      .eq('status', 'approved')
      .order('created_at')
    const extra = (data ?? []).map((row) => toMarket(row as CustomMarketRow))
    // La liste fixe est aussi complétée sur place : les composants qui la lisent
    // directement (fiche marchand, panier...) retrouvent ainsi les marchés ajoutés.
    for (const m of extra) if (!staticMarkets.some((s) => s.id === m.id)) staticMarkets.push(m)
    setMarkets([...staticMarkets])
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function addMarket(name: string, neighborhood: string) {
    if (!user) return { error: 'Connectez-vous pour ajouter un marché.', approved: false }
    const approved = isAdminEmail(user.email)
    const { error } = await supabase.from('custom_markets').insert({
      name: name.trim(),
      neighborhood: neighborhood.trim(),
      city: 'Libreville',
      status: approved ? 'approved' : 'pending',
      created_by: user.id,
    })
    if (error) return { error: "Le marché n'a pas pu être enregistré. Vérifiez le nom et le quartier.", approved }
    if (approved) await refresh()
    return { error: null, approved }
  }

  return <MarketsContext.Provider value={{ markets, addMarket, refresh }}>{children}</MarketsContext.Provider>
}

export function useMarkets() {
  const ctx = useContext(MarketsContext)
  if (!ctx) throw new Error('useMarkets doit être utilisé à l’intérieur de MarketsProvider')
  return ctx
}
