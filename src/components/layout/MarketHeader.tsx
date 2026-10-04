import type { ReactNode } from 'react'
import type { Market } from '../../types'
import { useMarketPhoto } from '../ui/MarketVisual'

/**
 * En-tête d'un lieu de vente : photo de marché en fond pour un marché
 * traditionnel, logo de l'enseigne en filigrane pour un magasin.
 */
export default function MarketHeader({ market, children }: { market: Market; children: ReactNode }) {
  const photo = useMarketPhoto(market)
  return (
    <header
      className="woven-pattern relative overflow-hidden rounded-b-[2rem] bg-brand-dark bg-cover bg-center px-5 pb-6 pt-[calc(env(safe-area-inset-top)+1.25rem)] text-white"
      style={
        photo ? { backgroundImage: `linear-gradient(rgba(37,40,44,0.55), rgba(37,40,44,0.75)), url(${photo})` } : undefined
      }
    >
      {market.logoUrl && <LogoWatermark logoUrl={market.logoUrl} />}
      <div className="relative">{children}</div>
    </header>
  )
}

/** Logo d'enseigne en filigrane, à placer dans un conteneur `relative overflow-hidden`. */
export function LogoWatermark({ logoUrl }: { logoUrl: string }) {
  return (
    <img
      src={logoUrl}
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute -right-6 top-1/2 h-44 w-44 -translate-y-1/2 rounded-3xl object-contain opacity-20"
    />
  )
}
