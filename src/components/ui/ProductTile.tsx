import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import type { Merchant, Product } from '../../types'
import { useCart } from '../../context/CartContext'
import { formatFCFA } from '../../lib/format'
import { flyToCart } from '../../lib/flyToCart'
import { getProductDisplayName } from '../../lib/productDisplay'
import ProductPhoto from './ProductPhoto'

/**
 * Carte produit en grille (accueil, recherche). Le bouton + ajoute au panier ;
 * si le panier contient déjà les produits d'un autre marchand, il ouvre plutôt
 * la vitrine de ce marchand, qui explique le remplacement du panier.
 */
export default function ProductTile({ product, merchant }: { product: Product; merchant: Merchant | undefined }) {
  const navigate = useNavigate()
  const { merchantId: cartMerchantId, addItem } = useCart()

  function handleAdd(event: MouseEvent<HTMLButtonElement>) {
    if (cartMerchantId && cartMerchantId !== product.merchantId) {
      navigate(`/marchand/${product.merchantId}`)
      return
    }
    flyToCart(event.currentTarget.closest('[data-product-card]')?.querySelector('[data-fly-source]'))
    addItem(product.merchantId, product.id)
  }

  return (
    <div data-product-card className="overflow-hidden rounded-card border border-line bg-card shadow-card">
      <button
        type="button"
        onClick={() => navigate(`/marchand/${product.merchantId}`)}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
      >
        <ProductPhoto product={product} className="h-32 w-full !rounded-none" />
      </button>
      <div className="p-3">
        <p className="truncate text-sm font-semibold text-brand-dark">{getProductDisplayName(product)}</p>
        <p className="truncate text-[11px] text-muted">{merchant?.name ?? ''}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="min-w-0 leading-tight">
            <span className="block font-display text-sm font-bold tabular-nums text-brand-dark">{formatFCFA(product.price)}</span>
            <span className="block truncate text-[10px] font-medium text-muted">par {product.unit}</span>
          </p>
          <button
            type="button"
            onClick={handleAdd}
            aria-label={`Ajouter ${getProductDisplayName(product)} au panier`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-brand-dark transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            <Plus className="h-4 w-4" strokeWidth={2.8} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
