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
import { ShoppingBasket, Search } from 'lucide-react'
import { CategoryIcon } from '../components/ui/icons'
import { Link } from 'react-router-dom'

export default function Home() {
  const [query, setQuery] = useState('')
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
      if (normalizedQuery) return m.name.toLowerCase().includes(normalizedQuery)
      return isFavorite(m.id)
    })
  }, [merchants, normalizedQuery, isFavorite])

  const matchedProducts = useMemo(() => {
    if (!normalizedQuery) return []
    return products.filter((p) => p.name.toLowerCase().includes(normalizedQuery))
  }, [products, normalizedQuery])

  const hasNoResults =
    isSearching && filteredMarkets.length === 0 && matchedMerchants.length === 0 && matchedProducts.length === 0

  return (
    <PageShell>
      <WovenHeader className="pb-8">
        <h1 className="text-2xl font-bold">Panier 241</h1>
        <p className="mt-1 text-sm text-white/80">
          Vos courses dans les marchés et magasins de Libreville, livrées chez vous.
        </p>
        <div className="mt-4">
          <SearchBar value={query} onChange={setQuery} placeholder="Un marché, un marchand, un produit..." />
        </div>
      </WovenHeader>

      <div className="-mt-4 space-y-6 px-5 pb-2">
        <div className="flex gap-3 overflow-x-auto pb-1 pt-7">
          {categories.map((cat) => {
            const photo = pexelsPhotos[cat.id]
            return (
              <Link key={cat.id} to={`/categorie/${cat.id}`} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
                <div
                  className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full text-white shadow-card ${cat.colorClass}`}
                >
                  {photo ? (
                    <img src={photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <CategoryIcon category={cat.id} className="h-6 w-6" />
                  )}
                </div>
                <span className="text-center text-xs font-medium leading-tight text-brand-dark/70">{cat.label}</span>
              </Link>
            )
          })}
        </div>

        {hasNoResults && (
          <div className="rounded-card bg-white p-5 text-center shadow-card">
            <Search className="mx-auto h-9 w-9 text-brand-dark/30" />
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
                <ShoppingBasket className="mx-auto h-9 w-9 text-brand-dark/30" />
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
