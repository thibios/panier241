import type { CategoryId } from '../types'

const CACHE_PREFIX = 'pexels-cache:v1:'
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
  url: string | null
  fetchedAt: number
}

function readCache(categoryId: CategoryId): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + categoryId)
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null
    return entry
  } catch {
    return null
  }
}

function writeCache(categoryId: CategoryId, url: string | null) {
  try {
    const entry: CacheEntry = { url, fetchedAt: Date.now() }
    localStorage.setItem(CACHE_PREFIX + categoryId, JSON.stringify(entry))
  } catch {
    // stockage indisponible (navigation privée, quota...) — tant pis, pas bloquant
  }
}

/**
 * Récupère une photo Pexels représentative d'une catégorie, via la fonction
 * serverless /api/pexels (la clé API n'est jamais exposée au navigateur).
 * Retourne null en cas d'échec (réseau, quota, absence de l'API en local) —
 * l'appelant doit alors retomber sur l'emoji de la catégorie.
 */
export async function getCategoryPhoto(categoryId: CategoryId): Promise<string | null> {
  const cached = readCache(categoryId)
  if (cached) return cached.url

  try {
    const res = await fetch(`/api/pexels?query=${encodeURIComponent(categoryKeywords[categoryId])}`)
    if (!res.ok) return null
    const data = await res.json()
    const url: string | null = data?.url ?? null
    // On ne met en cache qu'un vrai résultat : un échec (API absente en local,
    // quota dépassé...) doit pouvoir être retenté au prochain chargement plutôt
    // que de rester bloqué sur l'emoji pendant 30 jours.
    if (url) writeCache(categoryId, url)
    return url
  } catch {
    return null
  }
}
