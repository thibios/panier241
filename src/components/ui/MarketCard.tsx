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
      className={`flex flex-col overflow-hidden rounded-card border border-line bg-card shadow-card transition duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${className}`}
    >
      <div className="flex h-24 w-full items-center justify-center overflow-hidden bg-brand-light">
        <MarketVisual market={market} iconClassName="h-9 w-9 text-brand" />
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold text-brand-dark">{market.name}</p>
        <p className="truncate text-[11px] text-muted">{market.neighborhood}</p>
        <p className={`mt-1 text-[11px] font-semibold ${merchantCount === 0 ? 'text-muted' : 'text-brand'}`}>
          {merchantCount === 0
            ? 'Bientôt disponible'
            : `${merchantCount} commerçant${merchantCount > 1 ? 's' : ''}`}
        </p>
      </div>
    </Link>
  )
}
