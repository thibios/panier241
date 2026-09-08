import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

interface FavoritesContextValue {
  favoriteIds: string[]
  isFavorite: (merchantId: string) => boolean
  toggleFavorite: (merchantId: string) => void
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])

  useEffect(() => {
    if (!user) return
    supabase
      .from('favorites')
      .select('merchant_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setFavoriteIds(data.map((row) => row.merchant_id))
      })
  }, [user])

  function isFavorite(merchantId: string) {
    return favoriteIds.includes(merchantId)
  }

  async function toggleFavorite(merchantId: string) {
    if (!user) return
    const alreadyFavorite = favoriteIds.includes(merchantId)

    setFavoriteIds((prev) =>
      alreadyFavorite ? prev.filter((id) => id !== merchantId) : [...prev, merchantId],
    )

    if (alreadyFavorite) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('merchant_id', merchantId)
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, merchant_id: merchantId })
    }
  }

  return (
    <FavoritesContext.Provider value={{ favoriteIds, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites doit être utilisé à l’intérieur de FavoritesProvider')
  return ctx
}
