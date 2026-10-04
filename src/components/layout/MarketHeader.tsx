import type { ReactNode } from 'react'
import type { Market } from '../../types'
import { useMarketPhoto } from '../ui/MarketVisual'

/** Image de fond d'un en-tête, avec zoom lent très discret et voile sombre pour la lisibilité. */
export function HeroBackdrop({ photo }: { photo: string }) {
  return (
    <>
      <img
        src={photo}
        alt=""
        aria-hidden="true"
        decoding="async"
        className="ken-burns absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-brand-dark/60" />
    </>
  )
}

/**
 * En-tête d'un lieu de vente : photo de marché en fond pour un marché
 * traditionnel, logo de l'enseigne en filigrane pour un magasin.
 */
export default function MarketHeader({ market, children }: { market: Market; children: ReactNode }) {
  const photo = useMarketPhoto(market)
  return (
    <header className="woven-pattern relative overflow-hidden rounded-b-[2rem] bg-header px-5 pb-6 pt-[calc(env(safe-area-inset-top)+1.25rem)] text-white">
      {photo && <HeroBackdrop photo={photo} />}
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
