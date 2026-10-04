import { useMemo, useState } from 'react'
import { ShoppingBasket, Search } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import SearchBar from '../components/ui/SearchBar'
import CategoryTabs from '../components/ui/CategoryTabs'
import MarketCard from '../components/ui/MarketCard'
import MerchantCard from '../components/ui/MerchantCard'
import ProductResultCard from '../components/ui/ProductResultCard'
import Reveal from '../components/ui/Reveal'
import CatalogState from '../components/ui/CatalogState'
import { markets } from '../data/markets'
import { useFavorites } from '../context/FavoritesContext'
import { useCatalog } from '../context/CatalogContext'

export default function Home() {
  const [query, setQuery] = useState('')
  const { isFavorite } = useFavorites()
  const { merchants, products, error } = useCatalog()

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

  const stores = filteredMarkets.filter((m) => m.kind === 'supermarche')
  const localMarkets = filteredMarkets.filter((m) => m.kind === 'marche')

  const hasNoResults =
    isSearching && filteredMarkets.length === 0 && matchedMerchants.length === 0 && matchedProducts.length === 0

  return (
    <PageShell>
      <WovenHeader className="pb-8">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Panier<span className="text-accent">241</span>
        </h1>
        <p className="mt-1 text-sm text-white/85">
          Vos courses dans les marchés et magasins de Libreville, livrées chez vous.
        </p>
        <div className="mt-4">
          <SearchBar value={query} onChange={setQuery} placeholder="Un marché, un marchand, un produit..." />
        </div>
      </WovenHeader>

      <div className="space-y-7 px-5 pb-2 pt-5">
        <CategoryTabs />

        {error && <CatalogState />}

        {hasNoResults && (
          <div className="rounded-card bg-white p-5 text-center shadow-card">
            <Search className="mx-auto h-9 w-9 text-brand-dark/30" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-brand-dark">Aucun résultat pour "{query}"</p>
            <p className="mt-1 text-xs text-brand-dark/60">
              Essaie un autre nom de marché, de marchand ou de produit.
            </p>
          </div>
        )}

        {isSearching && matchedProducts.length > 0 && (
          <section>
            <h2 className="mb-3 text-base font-semibold text-brand-dark">Produits</h2>
            <div className="space-y-3">
              {matchedProducts.map((product, i) => (
                <Reveal key={product.id} index={i}>
                  <ProductResultCard
                    product={product}
                    sellers={merchants.filter((m) => m.id === product.merchantId)}
                  />
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {stores.length > 0 && (
          <section>
            <h2 className="mb-3 text-base font-semibold text-brand-dark">Magasins et enseignes</h2>
            <div className="grid grid-cols-2 gap-3">
              {stores.map((market, i) => (
                <Reveal key={market.id} index={i % 2}>
                  <MarketCard market={market} className="h-full" />
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {localMarkets.length > 0 && (
          <section>
            <h2 className="mb-3 text-base font-semibold text-brand-dark">Marchés de proximité</h2>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {localMarkets.map((market, i) => (
                <Reveal key={market.id} index={i} className="shrink-0">
                  <MarketCard market={market} />
                </Reveal>
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
                {matchedMerchants.map((merchant, i) => (
                  <Reveal key={merchant.id} index={i}>
                    <MerchantCard merchant={merchant} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <Reveal>
                <div className="rounded-card bg-white p-5 text-center shadow-card">
                  <ShoppingBasket className="mx-auto h-9 w-9 text-brand-dark/30" aria-hidden="true" />
                  <p className="mt-2 text-sm font-medium text-brand-dark">Aucun favori pour l'instant</p>
                  <p className="mt-1 text-xs text-brand-dark/60">
                    Ajoutez vos marchands préférés depuis leur fiche pour les retrouver ici rapidement.
                  </p>
                </div>
              </Reveal>
            )}
          </section>
        )}
      </div>
    </PageShell>
  )
}
