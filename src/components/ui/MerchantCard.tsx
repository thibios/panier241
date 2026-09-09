import { Link } from 'react-router-dom'
import type { Merchant } from '../../types'
import { markets } from '../../data/markets'
import { useFavorites } from '../../context/FavoritesContext'

const categoryDotClass: Record<string, string> = {
  legumes: 'bg-category-legumes',
  fruits: 'bg-category-fruits',
  poisson: 'bg-category-poisson',
  cereales: 'bg-category-cereales',
  bricolage: 'bg-category-bricolage',
  epicerie: 'bg-category-epicerie',
}

export default function MerchantCard({ merchant }: { merchant: Merchant }) {
  const market = markets.find((m) => m.id === merchant.marketId)
  const { isFavorite } = useFavorites()

  return (
    <Link
      to={`/marchand/${merchant.id}`}
      className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card transition active:scale-[0.99]"
    >
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-2xl"
        style={{ backgroundColor: `${merchant.bannerColor}20` }}
      >
        {merchant.kioskPhotoUrl ? (
          <img src={merchant.kioskPhotoUrl} alt={merchant.name} className="h-full w-full object-cover" />
        ) : (
          merchant.imageEmoji
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-brand-dark">{merchant.name}</p>
          {isFavorite(merchant.id) && <span className="text-xs text-category-fruits">★</span>}
        </div>
        <p className="truncate text-xs text-brand-dark/50">{market?.name}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-medium text-brand-dark">
            ⭐ {merchant.rating.toFixed(1)}
            <span className="text-brand-dark/40">({merchant.reviewCount})</span>
          </span>
          <span className="flex gap-1">
            {merchant.categories.map((cat) => (
              <span key={cat} className={`h-2 w-2 rounded-full ${categoryDotClass[cat]}`} />
            ))}
          </span>
        </div>
      </div>
      <span className="text-brand-dark/30">›</span>
    </Link>
  )
}
