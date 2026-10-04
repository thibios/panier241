import { Link } from 'react-router-dom'
import type { Market } from '../../types'
import { useCatalog } from '../../context/CatalogContext'
import MarketVisual from './MarketVisual'

export default function MarketCard({ market, className = 'w-40 shrink-0' }: { market: Market; className?: string }) {
  const { merchants } = useCatalog()
  const merchantCount = merchants.filter((m) => m.marketId === market.id).length

  return (
    <Link
      to={`/marche/${market.id}`}
      className={`group flex flex-col gap-2 rounded-card bg-white p-3 shadow-card transition duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${className}`}
    >
      <div className="flex h-24 items-center justify-center overflow-hidden rounded-2xl bg-brand-light">
        <MarketVisual market={market} iconClassName="h-9 w-9 text-brand" />
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight text-brand-dark">{market.name}</p>
        <p className="text-xs text-brand-dark/60">{market.neighborhood}</p>
        <p className={`mt-1 text-xs font-medium ${merchantCount === 0 ? 'text-brand-dark/50' : 'text-brand'}`}>
          {merchantCount === 0
            ? 'Bientôt disponible'
            : `${merchantCount} commerçant${merchantCount > 1 ? 's' : ''}`}
        </p>
      </div>
    </Link>
  )
}
