import { Link } from 'react-router-dom'
import type { Merchant, Product } from '../../types'
import { formatFCFA } from '../../lib/format'
import { getProductDisplayName } from '../../lib/productDisplay'
import ProductPhoto from './ProductPhoto'

export default function ProductResultCard({
  product,
  sellers,
}: {
  product: Product
  sellers: Merchant[]
}) {

  return (
    <div className="rounded-card bg-white p-3 shadow-card">
      <div className="flex items-center gap-3">
        <ProductPhoto product={product} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-brand-dark">{getProductDisplayName(product)}</p>
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
              className="rounded-xl bg-mint px-2.5 py-1 text-[11px] font-semibold text-mint-dark"
            >
              {seller.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
