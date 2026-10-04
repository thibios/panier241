import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ShoppingBasket } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import { HeroBackdrop } from '../components/layout/MarketHeader'
import ProductPhoto from '../components/ui/ProductPhoto'
import CategoryTabs from '../components/ui/CategoryTabs'
import Reveal from '../components/ui/Reveal'
import CatalogState from '../components/ui/CatalogState'
import { categories } from '../data/categories'
import { useCatalog } from '../context/CatalogContext'
import { usePexelsPhotos } from '../context/PexelsContext'
import { groupProducts } from '../lib/productGroups'
import { formatFCFA } from '../lib/format'

/** Tous les types de produits d'une catégorie, tous marchands confondus. */
export default function CategoryDetail() {
  const { categoryId } = useParams()
  const { merchants, products, loading, error } = useCatalog()
  const pexelsPhotos = usePexelsPhotos()
  const category = categories.find((c) => c.id === categoryId)

  if (!category) {
    return (
      <PageShell>
        <div className="px-5 pt-6">
          <p className="text-sm text-brand-dark/60">Catégorie introuvable.</p>
          <Link to="/" className="mt-3 inline-block text-sm font-semibold text-brand">
            <ArrowLeft className="inline h-4 w-4" /> Retour à l'accueil
          </Link>
        </div>
      </PageShell>
    )
  }

  const groups = groupProducts(products.filter((p) => p.category === category.id))
  const banner = pexelsPhotos[category.id]

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
            {groups.length} type{groups.length > 1 ? 's' : ''} de produits chez vos commerçants
          </p>
        </div>
      </header>

      <div className="space-y-4 px-5 pb-8 pt-5">
        <CategoryTabs activeId={category.id} />

        {groups.length > 0 ? (
          // La clé relance l'apparition en cascade à chaque changement de catégorie.
          <div key={category.id} className="space-y-3">
            {groups.map((group, i) => {
              const cheapest = group.variants[0]
              const sellers = merchants.filter((m) => group.variants.some((v) => v.merchantId === m.id))
              return (
                <Reveal key={group.name} index={i}>
                  <div className="rounded-card bg-white p-3 shadow-card">
                    <div className="flex items-center gap-3">
                      <ProductPhoto product={cheapest} className="h-16 w-16" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-brand-dark">{group.name}</p>
                        <p className="text-xs text-brand-dark/60">
                          {group.variants.length > 1 ? 'À partir de ' : ''}
                          <span className="font-semibold text-brand">{formatFCFA(cheapest.price)}</span> / {cheapest.unit}
                        </p>
                        <p className="text-xs text-brand-dark/60">
                          {sellers.length} commerçant{sellers.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {sellers.map((seller) => (
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
              <p className="mt-2 text-sm font-medium text-brand-dark">Bientôt disponible</p>
              <p className="mt-1 text-xs text-brand-dark/60">
                Aucun commerçant ne propose encore de produits dans cette catégorie.
              </p>
            </div>
          </Reveal>
        )}
      </div>
    </PageShell>
  )
}
