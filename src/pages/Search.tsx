import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, XCircle, Tag, ArrowDownUp, ChevronRight } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import ProductTile from '../components/ui/ProductTile'
import MarketVisual from '../components/ui/MarketVisual'
import Reveal from '../components/ui/Reveal'
import { useMarkets } from '../context/MarketsContext'
import { useTaxonomy } from '../context/TaxonomyContext'
import { visibleFamilies } from '../lib/catalogTaxonomy'
import { useCatalog } from '../context/CatalogContext'
import type { CategoryId } from '../types'

const sectionTitle = 'font-display text-lg font-bold text-brand-dark'

/** Comparaison sans accents ni majuscules : « epicerie » trouve « Épicerie ». */
function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export default function Search() {
  const { merchants, products } = useCatalog()
  const { markets } = useMarkets()
  const { families, labelOf } = useTaxonomy()
  // Filtres : familles non vides seulement.
  const categories = useMemo(() => visibleFamilies(families, products), [families, products])
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [category, setCategory] = useState<CategoryId | null>(null)
  const [sortByPrice, setSortByPrice] = useState(false)

  const q = normalize(query.trim())
  const hasCriteria = q.length > 0 || category !== null

  function updateQuery(value: string) {
    setQuery(value)
    setParams(value ? { q: value } : {}, { replace: true })
  }

  function resetFilters() {
    updateQuery('')
    setCategory(null)
    setSortByPrice(false)
  }

  // Lieux et commerçants : nom, quartier, nom du lieu de vente.
  const matchedPlaces = useMemo(() => {
    if (!q) return []
    return markets.filter((m) => normalize(`${m.name} ${m.neighborhood}`).includes(q))
  }, [q, markets])

  const matchedMerchants = useMemo(() => {
    return merchants.filter((m) => {
      if (category && !m.categories.includes(category)) return false
      if (!q) return category !== null
      const market = markets.find((mk) => mk.id === m.marketId)
      return normalize(`${m.name} ${market?.name ?? ''} ${market?.neighborhood ?? ''}`).includes(q)
    })
  }, [merchants, q, category])

  const matchedProducts = useMemo(() => {
    if (!hasCriteria) return []
    const list = products.filter((p) => {
      if (category && p.category !== category) return false
      if (!q) return true
      const merchant = merchants.find((m) => m.id === p.merchantId)
      // Catalogue global : nom, variante, vendeur, famille et sous-catégorie (« plomberie » trouve les robinets).
      // Une ligne par produit : les rubriques des commerçants n'entrent pas dans la recherche, donc aucun doublon.
      return normalize(
        `${p.name} ${p.variantLabel ?? ''} ${merchant?.name ?? ''} ${labelOf(p.category) ?? ''} ${labelOf(p.subcategoryId) ?? ''}`,
      ).includes(q)
    })
    return sortByPrice ? [...list].sort((a, b) => a.price - b.price) : list
  }, [products, merchants, q, category, sortByPrice, hasCriteria, labelOf])

  // Suggestions : noms de produits qui commencent comme la saisie.
  const suggestions = useMemo(() => {
    if (q.length < 2) return []
    const names = new Set<string>()
    for (const p of products) {
      if (normalize(p.name).startsWith(q) && normalize(p.name) !== q) names.add(p.name)
      if (names.size >= 3) break
    }
    return [...names]
  }, [products, q])

  const noResults = hasCriteria && matchedPlaces.length + matchedMerchants.length + matchedProducts.length === 0

  return (
    <PageShell>
      <header className="px-5 pb-3 pt-6">
        <h1 className="font-display text-2xl font-bold text-brand-dark">Recherche</h1>
        <label className="mt-4 flex h-14 items-center gap-3 rounded-full border border-line-strong bg-white px-5 shadow-field focus-within:ring-2 focus-within:ring-brand">
          <SearchIcon className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            placeholder="Produit, commerce, marché, quartier…"
            aria-label="Rechercher"
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-brand-dark placeholder:font-normal placeholder:text-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button type="button" onClick={() => updateQuery('')} aria-label="Effacer la recherche">
              <XCircle className="h-5 w-5 fill-muted text-white" aria-hidden="true" />
            </button>
          )}
        </label>
        {suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => updateQuery(s)}
                className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-brand-dark"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </header>

      <section className="mt-2">
        <div className="flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label="Filtrer par catégorie">
          {categories.map((cat) => {
            const active = category === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(active ? null : cat.id)}
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition ${
                  active ? 'bg-brand text-on-header' : 'border border-line bg-card text-brand-dark'
                }`}
              >
                <Tag className={`h-4 w-4 ${active ? '' : 'text-brand'}`} aria-hidden="true" />
                {cat.label}
              </button>
            )
          })}
        </div>
      </section>

      {!hasCriteria && (
        <p className="px-5 pt-8 text-center text-sm text-muted">
          Tapez un produit (ciment, riz, fer à béton…), un commerce ou un quartier, ou choisissez une catégorie.
        </p>
      )}

      {matchedPlaces.length + matchedMerchants.length > 0 && (
        <section className="mt-7 px-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className={sectionTitle}>Commerces et marchés</h2>
            <span className="text-xs font-semibold text-muted">
              {matchedPlaces.length + matchedMerchants.length} résultat{matchedPlaces.length + matchedMerchants.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-3">
            {matchedMerchants.map((merchant, i) => {
              const market = markets.find((m) => m.id === merchant.marketId)
              const count = products.filter((p) => p.merchantId === merchant.id).length
              return (
                <Reveal key={merchant.id} index={i}>
                  <Link
                    to={`/marchand/${merchant.id}`}
                    className="flex items-center gap-3 rounded-card border border-line bg-card p-3 shadow-card transition active:scale-[0.98]"
                  >
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-light">
                      {market && <MarketVisual market={market} iconClassName="h-7 w-7 text-brand" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-brand-dark">{merchant.name}</p>
                      <p className="truncate text-[11px] text-muted">
                        {market?.name} · {market?.neighborhood}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-brand-light px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand">
                      {count} produits
                    </span>
                  </Link>
                </Reveal>
              )
            })}
            {matchedPlaces.map((market, i) => {
              const count = merchants.filter((m) => m.marketId === market.id).length
              return (
                <Reveal key={market.id} index={matchedMerchants.length + i}>
                  <Link
                    to={`/marche/${market.id}`}
                    className="flex items-center gap-3 rounded-card border border-line bg-card p-3 shadow-card transition active:scale-[0.98]"
                  >
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-light">
                      <MarketVisual market={market} iconClassName="h-7 w-7 text-brand" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-brand-dark">{market.name}</p>
                      <p className="truncate text-[11px] text-muted">
                        {market.kind === 'marche' ? 'Marché' : 'Magasin'} · {market.neighborhood}
                      </p>
                    </div>
                    {count === 0 ? (
                      <span className="shrink-0 text-[11px] font-semibold text-muted">Bientôt</span>
                    ) : (
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
                    )}
                  </Link>
                </Reveal>
              )
            })}
          </div>
        </section>
      )}

      {matchedProducts.length > 0 && (
        <section className="mt-7 px-5 pb-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className={sectionTitle}>Produits</h2>
            <button
              type="button"
              onClick={() => setSortByPrice((v) => !v)}
              aria-pressed={sortByPrice}
              className={`flex items-center gap-1 text-xs font-semibold ${sortByPrice ? 'text-brand' : 'text-muted'}`}
            >
              <ArrowDownUp className="h-3.5 w-3.5" aria-hidden="true" />
              {sortByPrice ? 'Prix croissant' : 'Trier par prix'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {matchedProducts.slice(0, 40).map((product, i) => (
              <Reveal key={product.id} index={i}>
                <ProductTile product={product} merchant={merchants.find((m) => m.id === product.merchantId)} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {noResults && (
        <section className="mt-7 px-5">
          <div className="rounded-card border border-line bg-card p-6 text-center shadow-card">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-light">
              <SearchIcon className="h-6 w-6 text-brand" aria-hidden="true" />
            </span>
            <p className="mt-3 font-display text-base font-bold text-brand-dark">
              {query.trim() ? `Aucun résultat pour « ${query.trim()} »` : 'Aucun produit dans cette catégorie'}
            </p>
            <p className="mt-1 text-xs text-muted">Essayez un autre mot-clé ou une autre catégorie.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 h-10 rounded-full bg-brand px-5 text-xs font-semibold text-on-header"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </section>
      )}
    </PageShell>
  )
}
