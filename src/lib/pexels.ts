import { useEffect, useState } from 'react'
import type { CategoryId } from '../types'

const CACHE_PREFIX = 'pexels-cache:v2:'
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 jours

/** Mots-clés Pexels par catégorie (anglais : de meilleurs résultats sur Pexels). */
const categoryKeywords: Record<CategoryId, string> = {
  legumes: 'fresh vegetables',
  fruits: 'fresh fruits',
  poisson: 'fresh fish and meat',
  cereales: 'grains and spices',
  bricolage: 'construction tools hardware',
  epicerie: 'grocery store shelf',
}

interface CacheEntry {
  url: string
  fetchedAt: number
}

function cacheKey(query: string, locale: string | undefined) {
  return `${CACHE_PREFIX}${locale ?? 'en'}:${query.trim().toLowerCase()}`
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
export function getPexelsPhoto(query: string, locale?: string): Promise<string | null> {
  const key = cacheKey(query, locale)
  const cached = readCache(key)
  if (cached) return Promise.resolve(cached)

  const pending = inFlight.get(key)
  if (pending) return pending

  const params = new URLSearchParams({ query: query.trim() })
  if (locale) params.set('locale', locale)
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

export function getCategoryPhoto(categoryId: CategoryId): Promise<string | null> {
  return getPexelsPhoto(categoryKeywords[categoryId])
}

/**
 * Photo Pexels correspondant au nom d'un produit (recherche en français).
 * `null` tant qu'elle n'est pas chargée, ou si `productName` est null.
 */
export function useProductNamePhoto(productName: string | null): string | null {
  const [url, setUrl] = useState<string | null>(() =>
    productName ? readCache(cacheKey(productName, 'fr-FR')) : null,
  )

  useEffect(() => {
    if (!productName) {
      setUrl(null)
      return
    }
    let cancelled = false
    setUrl(readCache(cacheKey(productName, 'fr-FR')))
    getPexelsPhoto(productName, 'fr-FR').then((result) => {
      if (!cancelled) setUrl(result)
    })
    return () => {
      cancelled = true
    }
  }, [productName])

  return url
}
