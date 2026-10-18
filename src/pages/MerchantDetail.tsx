import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, MapPin, Star, MessageCircle, ChevronDown } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import { LogoWatermark } from '../components/layout/MarketHeader'
import Button from '../components/ui/Button'
import QuantityStepper from '../components/ui/QuantityStepper'
import ProductPhoto from '../components/ui/ProductPhoto'
import Reveal from '../components/ui/Reveal'
import CatalogState from '../components/ui/CatalogState'
import { CategoryIcon } from '../components/ui/icons'
import { markets } from '../data/markets'
import { useCart } from '../context/CartContext'
import { useFavorites } from '../context/FavoritesContext'
import { useCatalog } from '../context/CatalogContext'
import { usePexelsPhotos } from '../context/PexelsContext'
import { useTaxonomy } from '../context/TaxonomyContext'
import { useMerchantSections } from '../lib/merchantSections'
import { productMatchesCategory, relevantStorefrontCategories } from '../lib/catalogTaxonomy'
import { formatFCFA } from '../lib/format'
import { buildWhatsAppLink } from '../lib/whatsapp'
import { resolveImage } from '../lib/images'
import { groupProducts } from '../lib/productGroups'
import { getProductDisplayName } from '../lib/productDisplay'
import { flyToCart } from '../lib/flyToCart'
import MerchantThemeProvider from '../theme/MerchantThemeProvider'
import { resolveMerchantTheme } from '../theme/tokens'
import type { Product } from '../types'

const categoryDotClass: Record<string, string> = {
  legumes: 'bg-category-legumes',
  fruits: 'bg-category-fruits',
  poisson: 'bg-category-poisson',
  cereales: 'bg-category-cereales',
  restauration: 'bg-category-restauration',
  boulangerie: 'bg-category-boulangerie',
  bricolage: 'bg-category-bricolage',
  epicerie: 'bg-category-epicerie',
  'high-tech': 'bg-category-high-tech',
  maison: 'bg-category-maison',
  mode: 'bg-category-mode',
  beaute: 'bg-category-beaute',
  'auto-moto': 'bg-category-auto-moto',
  bebe: 'bg-category-bebe',
  livres: 'bg-category-livres',
  jeux: 'bg-category-jeux',
  sport: 'bg-category-sport',
  industrie: 'bg-category-industrie',
  chr: 'bg-category-chr',
  numerique: 'bg-category-numerique',
}

export default function MerchantDetail() {
  const { merchantId } = useParams()
  const navigate = useNavigate()
  const { merchants, products, loading, error } = useCatalog()
  const merchant = merchants.find((m) => m.id === merchantId)
  const { items, merchantId: cartMerchantId, addItem, setQuantity, itemCount, subtotal } = useCart()
  const { isFavorite, toggleFavorite } = useFavorites()
  const pexelsPhotos = usePexelsPhotos()
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const { storefronts, labelOf } = useTaxonomy()
  const { sections } = useMerchantSections(merchant?.id)
  /** Vue de la vitrine : « all », « s:<rubrique> » ou « c:<catégorie> ». */
  const [view, setView] = useState('all')

  // Le composant n'est pas remonté quand on navigue d'une fiche marchand à une
  // autre (même route, param différent) : on réinitialise l'accordéon nous-mêmes.
  useEffect(() => {
    setExpandedGroup(null)
    setView('all')
  }, [merchantId])

  const allProducts = useMemo(() => (merchant ? products.filter((p) => p.merchantId === merchant.id) : []), [merchant, products])
  // Rubriques du commerçant qui contiennent au moins un produit visible (état vide propre).
  const shownSections = sections.filter((sec) => sec.isVisible && sec.isActive && sec.productIds.some((id) => allProducts.some((p) => p.id === id)))
  const shownCategories = useMemo(
    () =>
      merchant
        ? relevantStorefrontCategories({ merchantId: merchant.id, marketId: merchant.marketId, storefronts, products: allProducts, labelOf })
        : [],
    [merchant, storefronts, labelOf, allProducts],
  )

  if (!merchant) {
    return (
      <PageShell>
        <div className="space-y-4 px-5 pt-6">
          {loading || error ? (
            <CatalogState />
          ) : (
            <p className="text-sm text-muted">Marchand introuvable.</p>
          )}
          <Link to="/" className="inline-block text-sm font-semibold text-brand">
            <ArrowLeft className="inline h-4 w-4" /> Retour à l'accueil
          </Link>
        </div>
      </PageShell>
    )
  }

  const currentMerchantId = merchant.id
  const market = markets.find((m) => m.id === merchant.marketId)
  const activeSection = view.startsWith('s:') ? shownSections.find((sec) => `s:${sec.id}` === view) : undefined
  const activeCategory = view.startsWith('c:') ? view.slice(2) : null
  const merchantProducts = activeSection
    ? activeSection.productIds.map((id) => allProducts.find((p) => p.id === id)).filter((p): p is Product => Boolean(p))
    : activeCategory
      ? allProducts.filter((p) => productMatchesCategory(p, activeCategory))
      : allProducts
  const showViewTabs = shownSections.length > 0 || shownCategories.length > 1
  const productGroups = groupProducts(merchantProducts)
  const isOtherMerchantInCart = cartMerchantId !== null && cartMerchantId !== currentMerchantId
  const merchantPhoto = resolveImage(merchant.kioskPhotoUrl, merchant.categories[0], pexelsPhotos)

  function getQuantity(productId: string) {
    return items.find((item) => item.productId === productId)?.quantity ?? 0
  }

  /** Ajoute au panier et fait voler la vignette du produit (ou du groupe) vers l'icône panier. */
  function handleAdd(event: MouseEvent<HTMLElement>, product: Product) {
    const source = event.currentTarget.closest('[data-product-card]')?.querySelector('[data-fly-source]')
    flyToCart(source)
    addItem(currentMerchantId, product.id)
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
      <Button variant="secondary" onClick={(event) => handleAdd(event, product)}>
        Ajouter
      </Button>
    )
  }

  return (
    <MerchantThemeProvider theme={resolveMerchantTheme(merchant, market)}>
      <PageShell>
        <header className="woven-pattern relative overflow-hidden rounded-b-[2rem] bg-header px-5 pb-6 pt-[calc(env(safe-area-inset-top)+1.25rem)] text-on-header shadow-card">
          {market?.logoUrl && market.logoWatermark !== false && <LogoWatermark logoUrl={market.logoUrl} />}
          <div className="relative flex items-center justify-between">
            <Link
              to={market ? `/marche/${market.id}` : '/'}
              aria-label="Retour"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-on-header/15 transition active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <button
              type="button"
              onClick={() => toggleFavorite(merchant.id)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-on-header/15 transition active:scale-95"
              aria-label={isFavorite(merchant.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              aria-pressed={isFavorite(merchant.id)}
            >
              <Star className={`h-5 w-5 ${isFavorite(merchant.id) ? 'fill-current' : ''}`} />
            </button>
          </div>
          <div className="relative mt-4 flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-on-header/15 ring-1 ring-on-header/10">
              {merchantPhoto ? (
                <img src={merchantPhoto} alt="" decoding="async" className="h-full w-full bg-white object-cover" />
              ) : (
                <CategoryIcon category={merchant.categories[0]} className="h-8 w-8" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold">{merchant.name}</h1>
              <p className="text-sm text-on-header/80">
                {[merchant.businessType, market?.name ?? merchant.neighborhood].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-5 px-5 pt-5">
          <div className="flex items-center justify-between rounded-card bg-white p-4 shadow-card">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-category-fruits text-category-fruits" aria-hidden="true" />
              {merchant.reviewCount > 0 ? (
                <div>
                  <p className="text-sm font-semibold text-brand-dark">
                    {merchant.rating.toFixed(1)} <span className="font-normal text-muted">/ 5</span>
                  </p>
                  <p className="text-xs text-muted">{merchant.reviewCount} avis</p>
                </div>
              ) : (
                <p className="text-sm text-muted">Pas encore d'avis</p>
              )}
            </div>
            <div className="flex gap-1.5">
              {merchant.categories.map((cat) => (
                <span key={cat} className={`h-2.5 w-2.5 rounded-full ${categoryDotClass[cat]}`} />
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-card bg-white p-4 shadow-card">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
            <p className="text-sm text-brand-dark/70">
              {merchant.address}
              {merchant.neighborhood && !merchant.address.includes(merchant.neighborhood) ? `, ${merchant.neighborhood}` : ''}
            </p>
          </div>

          {merchant.phone && (
            <a
              href={buildWhatsAppLink(merchant.phone, `Bonjour ${merchant.name}, `)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-card bg-white p-4 shadow-card transition active:scale-[0.99]"
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="h-6 w-6 shrink-0 text-category-legumes" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-brand-dark">Contacter sur WhatsApp</p>
                  <p className="text-xs text-muted">{merchant.phone}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            </a>
          )}

          {isOtherMerchantInCart && (
            <p className="rounded-card bg-category-cereales/10 p-3 text-xs text-brand-dark" role="note">
              Ton panier contient des produits d'un autre marchand. Ajouter un produit ici remplacera son
              contenu.
            </p>
          )}

          <div>
            <h2 className="mb-3 text-base font-semibold text-brand-dark">Produits disponibles</h2>
            {showViewTabs && (
              <div className="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label="Rubriques et catégories de la boutique">
                {[
                  { key: 'all', label: 'Tout' },
                  ...shownSections.map((sec) => ({ key: `s:${sec.id}`, label: sec.name })),
                  ...(shownCategories.length > 1 ? shownCategories.map((c) => ({ key: `c:${c.id}`, label: c.label })) : []),
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    aria-pressed={view === tab.key}
                    onClick={() => setView(tab.key)}
                    className={`flex h-9 shrink-0 items-center rounded-xl px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      view === tab.key ? 'bg-brand text-on-header' : 'border border-line bg-card text-brand-dark'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
            {productGroups.length === 0 && (
              <p className="rounded-card bg-white p-4 text-center text-sm text-muted shadow-card">
                {allProducts.length === 0 ? "Ce commerçant n'a pas encore publié de produit." : 'Aucun produit dans cette rubrique pour le moment.'}
              </p>
            )}
            <div className="space-y-3">
              {productGroups.map((group, i) => {
                if (group.variants.length === 1) {
                  const product = group.variants[0]
                  return (
                    <Reveal key={product.id} index={i}>
                      <div data-product-card className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card">
                        <ProductPhoto product={product} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-brand-dark">
                            {getProductDisplayName(product)}
                          </p>
                          <p className="text-xs font-semibold text-brand">
                            {formatFCFA(product.price)}{' '}
                            <span className="font-normal text-muted">/ {product.unit}</span>
                          </p>
                        </div>
                        {addControl(product)}
                      </div>
                    </Reveal>
                  )
                }

                const isExpanded = expandedGroup === group.name
                const cheapest = group.variants[0]
                return (
                  <Reveal key={group.name} index={i}>
                    <div data-product-card className="overflow-hidden rounded-card bg-white shadow-card">
                      <button
                        type="button"
                        onClick={() => setExpandedGroup(isExpanded ? null : group.name)}
                        aria-expanded={isExpanded}
                        className="flex w-full items-center gap-3 p-3 text-left transition active:bg-brand-light/50"
                      >
                        <ProductPhoto product={cheapest} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-brand-dark">{group.name}</p>
                          <p className="text-xs text-muted">
                            À partir de <span className="font-semibold text-brand">{formatFCFA(cheapest.price)}</span> ·{' '}
                            {group.variants.length} variantes
                          </p>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-muted transition-transform duration-300 ease-spring ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          aria-hidden="true"
                        />
                      </button>
                      {isExpanded && (
                        <div className="space-y-2 border-t border-brand-light p-3 pt-2">
                          {group.variants.map((product) => (
                            <div key={product.id} className="flex items-center gap-3 rounded-2xl bg-brand-light/50 p-2">
                              <div className="min-w-0 flex-1 pl-1">
                                <p className="truncate text-sm font-medium text-brand-dark">
                                  {product.variantLabel || getProductDisplayName(product)}
                                </p>
                                <p className="text-xs text-muted">
                                  {formatFCFA(product.price)} / {product.unit}
                                </p>
                              </div>
                              {addControl(product)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Reveal>
                )
              })}
            </div>
          </div>
          {itemCount > 0 && cartMerchantId === merchant.id && <div className="h-16" />}
        </div>

        {itemCount > 0 && cartMerchantId === merchant.id && (
          <div className="fixed inset-x-0 bottom-[5.5rem] z-20 px-5">
            <button
              type="button"
              onClick={() => navigate('/creneau')}
              className="mx-auto flex w-full max-w-md items-center justify-between rounded-2xl bg-brand px-5 py-4 text-white shadow-card transition active:scale-[0.98]"
            >
              <span className="text-sm font-semibold">
                Commander · {itemCount} article{itemCount > 1 ? 's' : ''}
              </span>
              <span className="text-sm font-bold">{formatFCFA(subtotal)}</span>
            </button>
          </div>
        )}
      </PageShell>
    </MerchantThemeProvider>
  )
}
