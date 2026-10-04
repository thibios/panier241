import type { Market } from '../../types'
import { usePexelsPhoto } from '../../lib/pexels'
import { MarketIcon } from './icons'

/** Photo Pexels d'un marché traditionnel (null pour une enseigne ou tant qu'elle charge). */
export function useMarketPhoto(market: Market): string | null {
  return usePexelsPhoto(market.photoQuery ?? null, undefined, market.photoPage ?? 1)
}

/**
 * Visuel d'un lieu de vente : logo de l'enseigne s'il existe, sinon photo de
 * marché africain, sinon icône.
 */
export default function MarketVisual({ market, iconClassName }: { market: Market; iconClassName: string }) {
  const photo = useMarketPhoto(market)
  if (market.logoUrl) {
    return <img src={market.logoUrl} alt={`Logo ${market.name}`} loading="lazy" decoding="async" className="h-full w-full bg-white object-contain p-1.5" />
  }
  if (photo) return <img src={photo} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
  return <MarketIcon kind={market.kind} className={iconClassName} />
}
