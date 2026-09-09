import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { CategoryId } from '../types'
import { categories } from '../data/categories'
import { getCategoryPhoto } from '../lib/pexels'

type PexelsPhotos = Partial<Record<CategoryId, string | null>>

const PexelsContext = createContext<PexelsPhotos>({})

export function PexelsProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotos] = useState<PexelsPhotos>({})

  useEffect(() => {
    let cancelled = false
    for (const cat of categories) {
      getCategoryPhoto(cat.id).then((url) => {
        if (!cancelled) setPhotos((prev) => ({ ...prev, [cat.id]: url }))
      })
    }
    return () => {
      cancelled = true
    }
  }, [])

  return <PexelsContext.Provider value={photos}>{children}</PexelsContext.Provider>
}

/** Photos Pexels par catégorie, résolues une fois pour toute l'app (undefined = pas encore chargée). */
export function usePexelsPhotos() {
  return useContext(PexelsContext)
}
