import { useMemo, useState } from 'react'
import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import SearchBar from '../components/ui/SearchBar'
import MarketCard from '../components/ui/MarketCard'
import MerchantCard from '../components/ui/MerchantCard'
import { categories } from '../data/categories'
import { markets } from '../data/markets'
import { merchants } from '../data/merchants'
import type { CategoryId } from '../types'

export default function Home() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null)

  const normalizedQuery = query.trim().toLowerCase()

  const filteredMarkets = useMemo(() => {
    if (!normalizedQuery) return markets
    return markets.filter(
      (m) =>
        m.name.toLowerCase().includes(normalizedQuery) ||
        m.neighborhood.toLowerCase().includes(normalizedQuery),
    )
  }, [normalizedQuery])

  const favoriteMerchants = useMemo(() => {
    return merchants.filter((m) => {
      if (!m.isFavorite) return false
      if (activeCategory && !m.categories.includes(activeCategory)) return false
      if (normalizedQuery && !m.name.toLowerCase().includes(normalizedQuery)) return false
      return true
    })
  }, [activeCategory, normalizedQuery])

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
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white transition ${cat.colorClass} ${
                    isActive ? 'ring-4 ring-offset-2 ring-offset-surface' : ''
                  }`}
                  style={isActive ? { boxShadow: '0 0 0 4px rgba(20,36,92,0.15)' } : undefined}
                >
                  {cat.icon}
                </div>
                <span className={`text-xs font-medium ${isActive ? 'text-brand-dark' : 'text-brand-dark/70'}`}>
                  {cat.label}
                </span>
              </button>
            )
          })}
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-brand-dark">Marchés à proximité</h2>
          </div>
          {filteredMarkets.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {filteredMarkets.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          ) : (
            <p className="rounded-card bg-white p-4 text-sm text-brand-dark/50 shadow-card">
              Aucun marché ne correspond à ta recherche.
            </p>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-brand-dark">Vos marchands favoris</h2>
          </div>
          {favoriteMerchants.length > 0 ? (
            <div className="space-y-3">
              {favoriteMerchants.map((merchant) => (
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
      </div>
    </PageShell>
  )
}
