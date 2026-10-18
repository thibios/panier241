import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ShoppingBasket, SlidersHorizontal, X } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import { HeroBackdrop } from '../components/layout/MarketHeader'
import ProductPhoto from '../components/ui/ProductPhoto'
import CategoryTabs from '../components/ui/CategoryTabs'
import Reveal from '../components/ui/Reveal'
import CatalogState from '../components/ui/CatalogState'
import { useCatalog } from '../context/CatalogContext'
import { useTaxonomy } from '../context/TaxonomyContext'
import { usePexelsPhotos } from '../context/PexelsContext'
import { groupProducts } from '../lib/productGroups'
import { formatFCFA } from '../lib/format'
import {
  applicableAttributes,
  attributeValues,
  formatAttributeValue,
  matchesAttributeFilters,
  usedSubcategories,
} from '../lib/catalogTaxonomy'

const filterChip = (active: boolean) =>
  `flex h-9 shrink-0 items-center rounded-xl px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
    active ? 'bg-brand text-on-header' : 'border border-line bg-card text-brand-dark'
  }`
const field =
  'w-full rounded-xl border border-line-strong bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand'

/** Tous les produits d'une famille, tous commerçants confondus, avec filtres de la famille. */
export default function CategoryDetail() {
  const { categoryId } = useParams()
  const { merchants, products, loading, error } = useCatalog()
  const { getFamily, getSubcategory, subcategoriesOf, attributes, subcategories } = useTaxonomy()
  const pexelsPhotos = usePexelsPhotos()

  // Une adresse de sous-catégorie ouvre sa famille, sous-catégorie présélectionnée.
  const linkedSub = getSubcategory(categoryId)
  const category = getFamily(linkedSub ? linkedSub.parentId : categoryId)

  const [subId, setSubId] = useState<string | null>(linkedSub?.id ?? null)
  const [merchantId, setMerchantId] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [attrFilters, setAttrFilters] = useState<Record<string, string[]>>({})
  const [showFilters, setShowFilters] = useState(false)

  // Changement de catégorie (même route) : filtres remis à zéro.
  useEffect(() => {
    setSubId(linkedSub?.id ?? null)
    setMerchantId('')
    setMinPrice('')
    setMaxPrice('')
    setAttrFilters({})
  }, [categoryId, linkedSub?.id])

  const familyProducts = useMemo(
    () => (category ? products.filter((p) => p.category === category.id) : []),
    [products, category],
  )
  const subs = useMemo(
    () => (category ? usedSubcategories(subcategoriesOf(category.id), familyProducts) : []),
    [category, subcategoriesOf, familyProducts],
  )
  const scoped = useMemo(
    () => (subId ? familyProducts.filter((p) => p.subcategoryId === subId) : familyProducts),
    [familyProducts, subId],
  )
  const attrs = useMemo(
    () =>
      category
        ? applicableAttributes(attributes, category.id, subId, subcategories).filter((a) => attributeValues(scoped, a.key).length > 1)
        : [],
    [attributes, category, subId, subcategories, scoped],
  )
  const sellers = useMemo(
    () => merchants.filter((m) => familyProducts.some((p) => p.merchantId === m.id)),
    [merchants, familyProducts],
  )

  const min = minPrice ? Number(minPrice) : null
  const max = maxPrice ? Number(maxPrice) : null
  const activeAttrFilters = Object.fromEntries(Object.entries(attrFilters).filter(([key]) => attrs.some((a) => a.key === key)))
  const filtered = scoped.filter(
    (p) =>
      (!merchantId || p.merchantId === merchantId) &&
      (min === null || p.price >= min) &&
      (max === null || p.price <= max) &&
      matchesAttributeFilters(p, activeAttrFilters),
  )
  const missingInfo = Object.values(activeAttrFilters).some((v) => v.length > 0)
    ? scoped.filter((p) => Object.keys(activeAttrFilters).some((k) => activeAttrFilters[k].length > 0 && p.attributes?.[k] === undefined)).length
    : 0
  const activeFilterCount =
    (merchantId ? 1 : 0) + (min !== null ? 1 : 0) + (max !== null ? 1 : 0) + Object.values(activeAttrFilters).filter((v) => v.length > 0).length

  if (!category) {
    return (
      <PageShell>
        <div className="px-5 pt-6">
          <p className="text-sm text-muted">Catégorie introuvable.</p>
          <Link to="/" className="mt-3 inline-block text-sm font-semibold text-brand">
            <ArrowLeft className="inline h-4 w-4" /> Retour à l'accueil
          </Link>
        </div>
      </PageShell>
    )
  }

  const groups = groupProducts(filtered)
  const banner = category.imageUrl ?? pexelsPhotos[category.id]

  function toggleAttr(key: string, value: string) {
    setAttrFilters((prev) => {
      const current = prev[key] ?? []
      return { ...prev, [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] }
    })
  }

  function resetFilters() {
    setMerchantId('')
    setMinPrice('')
    setMaxPrice('')
    setAttrFilters({})
  }

  return (
    <PageShell>
      <header className="relative overflow-hidden rounded-b-[2rem] bg-header px-5 pb-6 pt-[calc(env(safe-area-inset-top)+1.25rem)] text-white">
        {banner && <HeroBackdrop key={banner} photo={banner} />}
        <div className="relative">
          <Link
            to="/"
            aria-label="Retour à l'accueil"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 transition active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="mt-6 text-2xl font-bold">{category.label}</h1>
          <p className="text-sm text-white/85">
            {groups.length} type{groups.length > 1 ? 's' : ''} de produits
            {sellers.length > 0 && ` · ${sellers.length} commerçant${sellers.length > 1 ? 's' : ''}`}
          </p>
        </div>
      </header>

      <div className="space-y-4 px-5 pb-8 pt-5">
        <CategoryTabs activeId={category.id} />

        {subs.length > 0 && (
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label="Sous-catégories">
            <button type="button" aria-pressed={subId === null} onClick={() => setSubId(null)} className={filterChip(subId === null)}>
              Tout
            </button>
            {subs.map((s) => (
              <button key={s.id} type="button" aria-pressed={subId === s.id} onClick={() => setSubId(subId === s.id ? null : s.id)} className={filterChip(subId === s.id)}>
                {s.shortLabel ?? s.label}
              </button>
            ))}
          </div>
        )}

        {familyProducts.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              className="flex min-h-11 items-center gap-2 text-sm font-semibold text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filtres{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>
            {showFilters && (
              <div className="mt-2 space-y-3 rounded-card border border-line bg-card p-4 shadow-card">
                {sellers.length > 1 && (
                  <div>
                    <label htmlFor="f-merchant" className="mb-1 block text-xs font-semibold text-brand-dark">Commerçant</label>
                    <select id="f-merchant" value={merchantId} onChange={(e) => setMerchantId(e.target.value)} className={field}>
                      <option value="">Tous les commerçants</option>
                      {sellers.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <p className="mb-1 text-xs font-semibold text-brand-dark">Prix du magasin (F CFA)</p>
                  <div className="flex gap-2">
                    <input type="number" inputMode="numeric" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Minimum" aria-label="Prix minimum" className={field} />
                    <input type="number" inputMode="numeric" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Maximum" aria-label="Prix maximum" className={field} />
                  </div>
                </div>
                {attrs.map((a) => {
                  const values = attributeValues(scoped, a.key)
                  return (
                    <div key={a.key}>
                      <p className="mb-1 text-xs font-semibold text-brand-dark">{a.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {values.map((v) => {
                          const active = (attrFilters[a.key] ?? []).includes(String(v))
                          return (
                            <button key={String(v)} type="button" aria-pressed={active} onClick={() => toggleAttr(a.key, String(v))} className={filterChip(active)}>
                              {formatAttributeValue(v, a)}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                {activeFilterCount > 0 && (
                  <button type="button" onClick={resetFilters} className="flex items-center gap-1 text-xs font-semibold text-muted">
                    <X className="h-3.5 w-3.5" aria-hidden="true" /> Effacer les filtres
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {missingInfo > 0 && (
          <p className="text-xs text-muted" role="note">
            {missingInfo} produit{missingInfo > 1 ? 's' : ''} sans cette information {missingInfo > 1 ? 'ne sont' : "n'est"} pas affiché{missingInfo > 1 ? 's' : ''} avec ce filtre.
          </p>
        )}

        {groups.length > 0 ? (
          // La clé relance l'apparition en cascade à chaque changement de catégorie.
          <div key={`${category.id}-${subId ?? ''}`} className="space-y-3">
            {groups.map((group, i) => {
              const cheapest = group.variants[0]
              const groupSellers = merchants.filter((m) => group.variants.some((v) => v.merchantId === m.id))
              return (
                <Reveal key={group.name} index={i}>
                  <div className="rounded-card bg-white p-3 shadow-card">
                    <div className="flex items-center gap-3">
                      <ProductPhoto product={cheapest} className="h-16 w-16" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-brand-dark">{group.name}</p>
                        <p className="text-xs text-muted">
                          {group.variants.length > 1 ? 'À partir de ' : ''}
                          <span className="font-semibold text-brand">{formatFCFA(cheapest.price)}</span> / {cheapest.unit}
                        </p>
                        <p className="text-xs text-muted">
                          {groupSellers.length} commerçant{groupSellers.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {groupSellers.map((seller) => (
                        <Link
                          key={seller.id}
                          to={`/marchand/${seller.id}`}
                          className="rounded-xl bg-accent/20 px-2.5 py-1.5 text-[11px] font-semibold text-brand-dark transition active:scale-95"
                        >
                          {seller.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        ) : loading || error ? (
          <CatalogState />
        ) : (
          <Reveal key={category.id}>
            <div className="rounded-card bg-white p-5 text-center shadow-card">
              <ShoppingBasket className="mx-auto h-9 w-9 text-brand-dark/30" aria-hidden="true" />
              {familyProducts.length > 0 ? (
                <>
                  <p className="mt-2 text-sm font-medium text-brand-dark">Aucun produit avec ces filtres</p>
                  <button type="button" onClick={resetFilters} className="mt-2 text-xs font-semibold text-brand">Effacer les filtres</button>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm font-medium text-brand-dark">Bientôt disponible</p>
                  <p className="mt-1 text-xs text-muted">Aucun commerçant ne propose encore de produits dans cette catégorie.</p>
                </>
              )}
            </div>
          </Reveal>
        )}
      </div>
    </PageShell>
  )
}
