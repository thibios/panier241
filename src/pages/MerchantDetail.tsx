import { useEffect, useState } from 'react'
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
import { resolveImage } from '../lib/images'
import { usePexelsPhotos } from '../context/PexelsContext'
import { groupProducts } from '../lib/productGroups'
import { getProductDisplayName } from '../lib/productDisplay'
import type { Product } from '../types'

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
  const pexelsPhotos = usePexelsPhotos()
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  // Le composant n'est pas remonté quand on navigue d'une fiche marchand à une
  // autre (même route, param différent) : on réinitialise l'accordéon nous-mêmes.
  useEffect(() => {
    setExpandedGroup(null)
  }, [merchantId])

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

  const currentMerchantId = merchant.id
  const market = markets.find((m) => m.id === merchant.marketId)
  const merchantProducts = getProductsForMerchant(currentMerchantId)
  const productGroups = groupProducts(merchantProducts)
  const isOtherMerchantInCart = cartMerchantId !== null && cartMerchantId !== currentMerchantId

  function getQuantity(productId: string) {
    return items.find((item) => item.productId === productId)?.quantity ?? 0
  }

  function productThumbnail(product: Product) {
    const category = categories.find((c) => c.id === product.category)
    const photo = resolveImage(product.imageUrl, product.category, pexelsPhotos)
    return (
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-xl text-white ${category?.colorClass}`}
      >
        {photo ? (
          <img src={photo} alt={getProductDisplayName(product)} className="h-full w-full object-cover" />
        ) : (
          product.imageEmoji
        )}
      </div>
    )
  }

  function addControl(product: Product) {
    const quantity = getQuantity(product.id)
    return quantity > 0 ? (
      <QuantityStepper
        quantity={quantity}
        onIncrement={() => addItem(currentMerchantId, product.id)}
        onDecrement={() => setQuantity(product.id, quantity - 1)}
      />
    ) : (
      <Button variant="secondary" onClick={() => addItem(currentMerchantId, product.id)}>
        Ajouter
      </Button>
    )
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
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/20 text-4xl">
            {(() => {
              const photo = resolveImage(merchant.kioskPhotoUrl, merchant.categories[0], pexelsPhotos)
              return photo ? (
                <img src={photo} alt={merchant.name} className="h-full w-full object-cover" />
              ) : (
                merchant.imageEmoji
              )
            })()}
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
            {productGroups.map((group) => {
              if (group.variants.length === 1) {
                const product = group.variants[0]
                return (
                  <div key={product.id} className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card">
                    {productThumbnail(product)}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-brand-dark">{getProductDisplayName(product)}</p>
                      <p className="text-xs text-brand-dark/50">
                        {formatFCFA(product.price)} / {product.unit}
                      </p>
                    </div>
                    {addControl(product)}
                  </div>
                )
              }

              const isExpanded = expandedGroup === group.name
              const cheapest = group.variants[0]
              return (
                <div key={group.name} className="overflow-hidden rounded-card bg-white shadow-card">
                  <button
                    type="button"
                    onClick={() => setExpandedGroup(isExpanded ? null : group.name)}
                    className="flex w-full items-center gap-3 p-3 text-left"
                  >
                    {productThumbnail(cheapest)}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-brand-dark">{group.name}</p>
                      <p className="text-xs text-brand-dark/50">
                        À partir de {formatFCFA(cheapest.price)} · {group.variants.length} variantes
                      </p>
                    </div>
                    <span className={`text-brand-dark/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      ▾
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="space-y-2 border-t border-brand-light p-3 pt-2">
                      {group.variants.map((product) => (
                        <div key={product.id} className="flex items-center gap-3 rounded-2xl bg-brand-light/50 p-2">
                          <div className="min-w-0 flex-1 pl-1">
                            <p className="truncate text-sm font-medium text-brand-dark">
                              {product.variantLabel || getProductDisplayName(product)}
                            </p>
                            <p className="text-xs text-brand-dark/50">
                              {formatFCFA(product.price)} / {product.unit}
                            </p>
                          </div>
                          {addControl(product)}
                        </div>
                      ))}
                    </div>
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
