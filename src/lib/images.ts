import type { CategoryId } from '../types'

/**
 * Priorité d'affichage d'une image : vraie photo uploadée > photo Pexels de
 * la catégorie > null (l'appelant retombe alors sur l'emoji dans le JSX).
 */
export function resolveImage(
  realUrl: string | null | undefined,
  category: CategoryId | undefined,
  pexelsPhotos: Partial<Record<CategoryId, string | null>>,
): string | null {
  if (realUrl) return realUrl
  if (category && pexelsPhotos[category]) return pexelsPhotos[category] as string
  return null
}
