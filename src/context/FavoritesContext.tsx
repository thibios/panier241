import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { merchants } from '../data/merchants'
import { readSession, writeSession } from '../lib/storage'

interface FavoritesContextValue {
  favoriteIds: string[]
  isFavorite: (merchantId: string) => boolean
  toggleFavorite: (merchantId: string) => void
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

const seedFavoriteIds = merchants.filter((m) => m.isFavorite).map((m) => m.id)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readSession('favorites', seedFavoriteIds))

  useEffect(() => writeSession('favorites', favoriteIds), [favoriteIds])

  function isFavorite(merchantId: string) {
    return favoriteIds.includes(merchantId)
  }

  function toggleFavorite(merchantId: string) {
    setFavoriteIds((prev) =>
      prev.includes(merchantId) ? prev.filter((id) => id !== merchantId) : [...prev, merchantId],
    )
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
