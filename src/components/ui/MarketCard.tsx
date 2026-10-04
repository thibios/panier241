import { Link } from 'react-router-dom'
import type { Market } from '../../types'
import { useCatalog } from '../../context/CatalogContext'
import MarketVisual from './MarketVisual'

export default function MarketCard({ market }: { market: Market }) {
  const { merchants } = useCatalog()
  const merchantCount = merchants.filter((m) => m.marketId === market.id).length

  return (
    <Link
      to={`/marche/${market.id}`}
      className="flex w-40 shrink-0 flex-col gap-2 rounded-card bg-white p-3 shadow-card transition active:scale-[0.99]"
    >
      <div className="flex h-24 items-center justify-center overflow-hidden rounded-2xl bg-brand-light">
        <MarketVisual market={market} iconClassName="h-9 w-9 text-brand" />
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight text-brand-dark">{market.name}</p>
        <p className="text-xs text-brand-dark/50">{market.neighborhood}</p>
        <p className="mt-1 text-xs font-medium text-brand">{merchantCount === 0 ? 'Bientôt disponible' : `${merchantCount} commerçant${merchantCount > 1 ? 's' : ''}`}</p>
      </div>
    </Link>
  )
}
