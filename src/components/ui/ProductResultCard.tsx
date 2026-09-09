import { Link } from 'react-router-dom'
import type { Merchant, Product } from '../../types'
import { categories } from '../../data/categories'
import { formatFCFA } from '../../lib/format'
import { resolveImage } from '../../lib/images'
import { usePexelsPhotos } from '../../context/PexelsContext'

export default function ProductResultCard({
  product,
  sellers,
}: {
  product: Product
  sellers: Merchant[]
}) {
  const category = categories.find((c) => c.id === product.category)
  const pexelsPhotos = usePexelsPhotos()
  const photo = resolveImage(product.imageUrl, product.category, pexelsPhotos)

  return (
    <div className="rounded-card bg-white p-3 shadow-card">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-xl text-white ${category?.colorClass}`}
        >
          {photo ? (
            <img src={photo} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            product.imageEmoji
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-brand-dark">{product.name}</p>
          <p className="text-xs text-brand-dark/50">
            {formatFCFA(product.price)} / {product.unit}
          </p>
        </div>
      </div>
      {sellers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 pl-[60px]">
          {sellers.map((seller) => (
            <Link
              key={seller.id}
              to={`/marchand/${seller.id}`}
              className="rounded-pill bg-brand-light px-2.5 py-1 text-[11px] font-medium text-brand"
            >
              {seller.imageEmoji} {seller.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
