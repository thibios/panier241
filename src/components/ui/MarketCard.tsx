import type { Market } from '../../types'

export default function MarketCard({ market }: { market: Market }) {
  return (
    <div className="flex w-40 shrink-0 flex-col gap-2 rounded-card bg-white p-3 shadow-card">
      <div className="flex h-20 items-center justify-center rounded-2xl bg-brand-light text-4xl">
        {market.imageEmoji}
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight text-brand-dark">{market.name}</p>
        <p className="text-xs text-brand-dark/50">{market.neighborhood}</p>
        <p className="mt-1 text-xs font-medium text-brand">{market.merchantCount} marchands</p>
      </div>
    </div>
  )
}
