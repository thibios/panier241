import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ShoppingBasket } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import ProductPhoto from '../components/ui/ProductPhoto'
import { categories } from '../data/categories'
import { useCatalog } from '../context/CatalogContext'
import { usePexelsPhotos } from '../context/PexelsContext'
import { groupProducts } from '../lib/productGroups'
import { formatFCFA } from '../lib/format'

/** Tous les types de produits d'une catégorie, tous marchands confondus. */
export default function CategoryDetail() {
  const { categoryId } = useParams()
  const { merchants, products, loading } = useCatalog()
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
      <header
        className={`relative rounded-b-[2rem] bg-cover bg-center px-5 pb-6 pt-[calc(env(safe-area-inset-top)+1.25rem)] text-white ${category.colorClass}`}
        style={
          banner
            ? { backgroundImage: `linear-gradient(rgba(20,36,92,0.45), rgba(20,36,92,0.65)), url(${banner})` }
            : undefined
        }
      >
        <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="mt-6 text-2xl font-bold">{category.label}</h1>
        <p className="text-sm text-white/80">
          {groups.length} type{groups.length > 1 ? 's' : ''} de produits chez vos commerçants
        </p>
      </header>

      <div className="space-y-3 px-5 pt-5 pb-8">
        {groups.length > 0 ? (
          groups.map((group) => {
            const cheapest = group.variants[0]
            const sellers = merchants.filter((m) => group.variants.some((v) => v.merchantId === m.id))
            return (
              <div key={group.name} className="rounded-card bg-white p-3 shadow-card">
                <div className="flex items-center gap-3">
                  <ProductPhoto product={cheapest} className="h-16 w-16" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-brand-dark">{group.name}</p>
                    <p className="text-xs text-brand-dark/50">
                      {group.variants.length > 1 ? 'À partir de ' : ''}
                      {formatFCFA(cheapest.price)} / {cheapest.unit}
                    </p>
                    <p className="text-xs text-brand-dark/50">
                      {sellers.length} commerçant{sellers.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {sellers.map((seller) => (
                    <Link
                      key={seller.id}
                      to={`/marchand/${seller.id}`}
                      className="rounded-xl bg-brand-light px-2.5 py-1 text-[11px] font-medium text-brand"
                    >
                      {seller.name}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })
        ) : (
          <div className="rounded-card bg-white p-5 text-center shadow-card">
            <ShoppingBasket className="mx-auto h-9 w-9 text-brand-dark/30" />
            <p className="mt-2 text-sm font-medium text-brand-dark">
              {loading ? 'Chargement...' : 'Aucun produit dans cette catégorie pour l’instant'}
            </p>
          </div>
        )}
      </div>
    </PageShell>
  )
}
