import { useEffect, useState } from 'react'
import type { CategoryId } from '../types'

const CACHE_PREFIX = 'pexels-cache:v3:'
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 jours

/** Mots-clés Pexels par catégorie (anglais : de meilleurs résultats sur Pexels). */
const categoryKeywords: Record<CategoryId, string> = {
  legumes: 'african market vegetables',
  fruits: 'african market fruits',
  poisson: 'african fish market',
  cereales: 'african market spices grains',
  bricolage: 'african construction site workers',
  epicerie: 'african grocery shop',
}

interface CacheEntry {
  url: string
  fetchedAt: number
}

export interface PexelsOptions {
  /** 'fr-FR' pour chercher en français ; anglais par défaut. */
  locale?: 'fr-FR'
  /** Rang du résultat à prendre (1 = premier), pour varier les photos d'un même mot-clé. */
  page?: number
}

function cacheKey(query: string, { locale, page = 1 }: PexelsOptions = {}) {
  return `${CACHE_PREFIX}${locale ?? 'en'}:${page}:${query.trim().toLowerCase()}`
}

function readCache(key: string): string | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null
    return entry.url
  } catch {
    return null
  }
}

function writeCache(key: string, url: string) {
  try {
    const entry: CacheEntry = { url, fetchedAt: Date.now() }
    localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // stockage indisponible (navigation privée, quota...) — tant pis, pas bloquant
  }
}

/** Requêtes en cours, pour que plusieurs composants demandant la même photo partagent un seul appel. */
const inFlight = new Map<string, Promise<string | null>>()

/**
 * Récupère une photo Pexels pour un mot-clé, via la fonction serverless
 * /api/pexels (la clé API n'est jamais exposée au navigateur). Retourne null en
 * cas d'échec (réseau, quota, aucun résultat) : l'appelant retombe alors sur
 * son repli. Seul un vrai résultat est mis en cache, pour qu'un échec soit
 * retenté au prochain chargement.
 */
export function getPexelsPhoto(query: string, options: PexelsOptions = {}): Promise<string | null> {
  const key = cacheKey(query, options)
  const cached = readCache(key)
  if (cached) return Promise.resolve(cached)

  const pending = inFlight.get(key)
  if (pending) return pending

  const params = new URLSearchParams({ query: query.trim() })
  if (options.locale) params.set('locale', options.locale)
  if (options.page && options.page > 1) params.set('page', String(options.page))
  const request = fetch(`/api/pexels?${params}`)
    .then(async (res) => {
      if (!res.ok) return null
      const data = await res.json()
      const url: string | null = data?.url ?? null
      if (url) writeCache(key, url)
      return url
    })
    .catch(() => null)
    .finally(() => inFlight.delete(key))
  inFlight.set(key, request)
  return request
}

/** Rang du résultat retenu par catégorie, quand le premier se répète d'une catégorie à l'autre. */
const categoryPage: Partial<Record<CategoryId, number>> = { fruits: 2 }

export function getCategoryPhoto(categoryId: CategoryId): Promise<string | null> {
  return getPexelsPhoto(categoryKeywords[categoryId], { page: categoryPage[categoryId] })
}

/**
 * Photo Pexels pour un mot-clé. `null` tant qu'elle n'est pas chargée, en cas
 * d'échec, ou si `query` est null.
 */
export function usePexelsPhoto(query: string | null, locale?: 'fr-FR', page = 1): string | null {
  const [url, setUrl] = useState<string | null>(() => (query ? readCache(cacheKey(query, { locale, page })) : null))

  useEffect(() => {
    if (!query) {
      setUrl(null)
      return
    }
    let cancelled = false
    setUrl(readCache(cacheKey(query, { locale, page })))
    getPexelsPhoto(query, { locale, page }).then((result) => {
      if (!cancelled) setUrl(result)
    })
    return () => {
      cancelled = true
    }
  }, [query, locale, page])

  return url
}

/** Photo Pexels correspondant au nom d'un produit (recherche en français). */
export function useProductNamePhoto(productName: string | null): string | null {
  return usePexelsPhoto(productName, 'fr-FR')
}
