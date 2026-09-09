import { useNavigate, useParams, Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import Button from '../components/ui/Button'
import QuantityStepper from '../components/ui/QuantityStepper'
import { markets } from '../data/markets'
import { categories } from '../data/categories'
import { useCart } from '../context/CartContext'
import { useFavorites } from '../context/FavoritesContext'
import { useCatalog } from '../context/CatalogContext'
import { formatFCFA } from '../lib/format'
import { buildWhatsAppLink } from '../lib/whatsapp'

const categoryDotClass: Record<string, string> = {
  legumes: 'bg-category-legumes',
  fruits: 'bg-category-fruits',
  poisson: 'bg-category-poisson',
  cereales: 'bg-category-cereales',
  bricolage: 'bg-category-bricolage',
  epicerie: 'bg-category-epicerie',
}

export default function MerchantDetail() {
  const { merchantId } = useParams()
  const navigate = useNavigate()
  const { merchants, getProductsForMerchant } = useCatalog()
  const merchant = merchants.find((m) => m.id === merchantId)
  const { items, merchantId: cartMerchantId, addItem, setQuantity, itemCount, subtotal } = useCart()
  const { isFavorite, toggleFavorite } = useFavorites()

  if (!merchant) {
    return (
      <PageShell>
        <div className="px-5 pt-6">
          <p className="text-sm text-brand-dark/60">Marchand introuvable.</p>
          <Link to="/" className="mt-3 inline-block text-sm font-semibold text-brand">
            ← Retour à l'accueil
          </Link>
        </div>
      </PageShell>
    )
  }

  const market = markets.find((m) => m.id === merchant.marketId)
  const merchantProducts = getProductsForMerchant(merchant.id)
  const isOtherMerchantInCart = cartMerchantId !== null && cartMerchantId !== merchant.id

  function getQuantity(productId: string) {
    return items.find((item) => item.productId === productId)?.quantity ?? 0
  }

  return (
    <PageShell>
      <div
        className="relative px-5 pb-6 pt-[calc(env(safe-area-inset-top)+1.25rem)] text-white"
        style={{ backgroundColor: merchant.bannerColor }}
      >
        <div className="flex items-center justify-between">
          <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">
            ←
          </Link>
          <button
            type="button"
            onClick={() => toggleFavorite(merchant.id)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg"
            aria-label="Ajouter aux favoris"
          >
            {isFavorite(merchant.id) ? '★' : '☆'}
          </button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-4xl">
            {merchant.imageEmoji}
          </div>
          <div>
            <h1 className="text-xl font-bold">{merchant.name}</h1>
            <p className="text-sm text-white/80">{market?.name}</p>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-5 pt-5">
        <div className="flex items-center justify-between rounded-card bg-white p-4 shadow-card">
          <div className="flex items-center gap-2">
            <span className="text-lg">⭐</span>
            <div>
              <p className="text-sm font-semibold text-brand-dark">
                {merchant.rating.toFixed(1)} <span className="font-normal text-brand-dark/50">/ 5</span>
              </p>
              <p className="text-xs text-brand-dark/50">{merchant.reviewCount} avis</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {merchant.categories.map((cat) => (
              <span key={cat} className={`h-2.5 w-2.5 rounded-full ${categoryDotClass[cat]}`} />
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-card bg-white p-4 shadow-card">
          <span className="text-lg">📍</span>
          <p className="text-sm text-brand-dark/70">{merchant.address}</p>
        </div>

        {merchant.phone && (
          <a
            href={buildWhatsAppLink(merchant.phone, `Bonjour ${merchant.name}, `)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-card bg-white p-4 shadow-card"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🟢</span>
              <div>
                <p className="text-sm font-medium text-brand-dark">Contacter sur WhatsApp</p>
                <p className="text-xs text-brand-dark/50">{merchant.phone}</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-brand">→</span>
          </a>
        )}

        {isOtherMerchantInCart && (
          <p className="rounded-card bg-category-cereales/10 p-3 text-xs text-category-cereales">
            Ton panier contient des produits d'un autre marchand. Ajouter un produit ici remplacera son
            contenu.
          </p>
        )}

        <div>
          <h2 className="mb-3 text-base font-semibold text-brand-dark">Produits disponibles</h2>
          <div className="space-y-3">
            {merchantProducts.map((product) => {
              const category = categories.find((c) => c.id === product.category)
              const quantity = getQuantity(product.id)
              return (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card"
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-xl text-white ${category?.colorClass}`}
                  >
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
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
                  {quantity > 0 ? (
                    <QuantityStepper
                      quantity={quantity}
                      onIncrement={() => addItem(merchant.id, product.id)}
                      onDecrement={() => setQuantity(product.id, quantity - 1)}
                    />
                  ) : (
                    <Button variant="secondary" onClick={() => addItem(merchant.id, product.id)}>
                      Ajouter
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        {itemCount > 0 && cartMerchantId === merchant.id && <div className="h-16" />}
      </div>

      {itemCount > 0 && cartMerchantId === merchant.id && (
        <div className="fixed inset-x-0 bottom-16 z-20 px-5 pb-3">
          <button
            type="button"
            onClick={() => navigate('/creneau')}
            className="mx-auto flex w-full max-w-md items-center justify-between rounded-pill bg-brand px-5 py-4 text-white shadow-card"
          >
            <span className="text-sm font-semibold">
              Commander · {itemCount} article{itemCount > 1 ? 's' : ''}
            </span>
            <span className="text-sm font-bold">{formatFCFA(subtotal)}</span>
          </button>
        </div>
      )}
    </PageShell>
  )
}
