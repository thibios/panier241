import { useMemo, useState } from 'react'
import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import SearchBar from '../components/ui/SearchBar'
import MarketCard from '../components/ui/MarketCard'
import MerchantCard from '../components/ui/MerchantCard'
import ProductResultCard from '../components/ui/ProductResultCard'
import { categories } from '../data/categories'
import { markets } from '../data/markets'
import { useFavorites } from '../context/FavoritesContext'
import { useCatalog } from '../context/CatalogContext'
import { usePexelsPhotos } from '../context/PexelsContext'
import type { CategoryId } from '../types'

export default function Home() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null)
  const { isFavorite } = useFavorites()
  const { merchants, products } = useCatalog()
  const pexelsPhotos = usePexelsPhotos()

  const normalizedQuery = query.trim().toLowerCase()
  const isSearching = normalizedQuery.length > 0

  const filteredMarkets = useMemo(() => {
    if (!normalizedQuery) return markets
    return markets.filter(
      (m) =>
        m.name.toLowerCase().includes(normalizedQuery) ||
        m.neighborhood.toLowerCase().includes(normalizedQuery),
    )
  }, [normalizedQuery])

  // En recherche : tous les marchands correspondants. Sinon : uniquement les favoris.
  const matchedMerchants = useMemo(() => {
    return merchants.filter((m) => {
      if (activeCategory && !m.categories.includes(activeCategory)) return false
      if (normalizedQuery) return m.name.toLowerCase().includes(normalizedQuery)
      return isFavorite(m.id)
    })
  }, [activeCategory, normalizedQuery, isFavorite])

  const matchedProducts = useMemo(() => {
    if (!normalizedQuery) return []
    return products.filter((p) => {
      if (activeCategory && p.category !== activeCategory) return false
      return p.name.toLowerCase().includes(normalizedQuery)
    })
  }, [activeCategory, normalizedQuery])

  const hasNoResults =
    isSearching && filteredMarkets.length === 0 && matchedMerchants.length === 0 && matchedProducts.length === 0

  function toggleCategory(id: CategoryId) {
    setActiveCategory((prev) => (prev === id ? null : id))
  }

  return (
    <PageShell>
      <WovenHeader className="pb-8">
        <h1 className="text-2xl font-bold">Panier 241</h1>
        <p className="mt-1 text-sm text-white/80">
          Vos marchés et commerçants préférés, livrés chez vous.
        </p>
        <div className="mt-4">
          <SearchBar value={query} onChange={setQuery} placeholder="Un marché, un marchand, un produit..." />
        </div>
      </WovenHeader>

      <div className="-mt-4 space-y-6 px-5 pb-2">
        <div className="flex gap-3 overflow-x-auto pb-1 pt-2">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id
            const photo = pexelsPhotos[cat.id]
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full bg-cover bg-center text-2xl text-white transition [background-blend-mode:multiply] ${cat.colorClass} ${
                    isActive ? 'ring-4 ring-offset-2 ring-offset-surface' : ''
                  }`}
                  style={{
                    ...(photo ? { backgroundImage: `url(${photo})` } : undefined),
                    ...(isActive ? { boxShadow: '0 0 0 4px rgba(20,36,92,0.15)' } : undefined),
                  }}
                >
                  {!photo && cat.icon}
                </div>
                <span className={`text-xs font-medium ${isActive ? 'text-brand-dark' : 'text-brand-dark/70'}`}>
                  {cat.label}
                </span>
              </button>
            )
          })}
        </div>

        {hasNoResults && (
          <div className="rounded-card bg-white p-5 text-center shadow-card">
            <p className="text-2xl">🔍</p>
            <p className="mt-2 text-sm font-medium text-brand-dark">Aucun résultat pour "{query}"</p>
            <p className="mt-1 text-xs text-brand-dark/50">
              Essaie un autre nom de marché, de marchand ou de produit.
            </p>
          </div>
        )}

        {isSearching && matchedProducts.length > 0 && (
          <section>
            <h2 className="mb-3 text-base font-semibold text-brand-dark">Produits</h2>
            <div className="space-y-3">
              {matchedProducts.map((product) => (
                <ProductResultCard
                  key={product.id}
                  product={product}
                  sellers={merchants.filter((m) => m.id === product.merchantId)}
                />
              ))}
            </div>
          </section>
        )}

        {(!isSearching || filteredMarkets.length > 0) && (
          <section>
            <h2 className="mb-3 text-base font-semibold text-brand-dark">
              {isSearching ? 'Marchés' : 'Marchés à proximité'}
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {filteredMarkets.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          </section>
        )}

        {(!isSearching || matchedMerchants.length > 0) && (
          <section>
            <h2 className="mb-3 text-base font-semibold text-brand-dark">
              {isSearching ? 'Marchands' : 'Vos marchands favoris'}
            </h2>
            {matchedMerchants.length > 0 ? (
              <div className="space-y-3">
                {matchedMerchants.map((merchant) => (
                  <MerchantCard key={merchant.id} merchant={merchant} />
                ))}
              </div>
            ) : (
              <div className="rounded-card bg-white p-5 text-center shadow-card">
                <p className="text-2xl">🧺</p>
                <p className="mt-2 text-sm font-medium text-brand-dark">Aucun favori pour l'instant</p>
                <p className="mt-1 text-xs text-brand-dark/50">
                  Ajoutez vos marchands préférés depuis leur fiche pour les retrouver ici rapidement.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </PageShell>
  )
}
