import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, MapPin, Plus, Search } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import MarketCard from '../components/ui/MarketCard'
import ProductTile from '../components/ui/ProductTile'
import Reveal from '../components/ui/Reveal'
import ScrollRow from '../components/ui/ScrollRow'
import BrandLogo from '../components/ui/BrandLogo'
import AddMarketCard from '../components/ui/AddMarketCard'
import { useMarkets } from '../context/MarketsContext'
import CatalogState from '../components/ui/CatalogState'
import { CategoryIcon } from '../components/ui/icons'
import { useMarketPhoto } from '../components/ui/MarketVisual'
import { useTaxonomy } from '../context/TaxonomyContext'
import { visibleFamilies } from '../lib/catalogTaxonomy'
import { useCatalog } from '../context/CatalogContext'
import { useAuth } from '../context/AuthContext'
import { useAddresses } from '../context/AddressesContext'
import { usePexelsPhotos } from '../context/PexelsContext'
import { supabase } from '../lib/supabaseClient'
import type { Market } from '../types'

const sectionTitle = 'font-display text-lg font-bold text-brand-dark'

/** Nombre de catégories visibles avant « Voir toutes les catégories ». */
const VISIBLE_CATEGORIES = 8

/** Grande carte du carrousel « À la une » : un lieu de vente qui a déjà des commerçants. */
function FeaturedCard({ market, merchantCount }: { market: Market; merchantCount: number }) {
  const photo = useMarketPhoto(market)
  return (
    <Link
      to={`/marche/${market.id}`}
      className="relative block h-44 w-[85%] shrink-0 snap-start overflow-hidden rounded-card bg-brand shadow-card transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {market.logoUrl ? (
        <img src={market.logoUrl} alt="" className="absolute inset-0 h-full w-full bg-white object-contain px-10 pb-20 pt-5" />
      ) : (
        photo && <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-brand via-brand/50 to-transparent" />
      <div className="absolute bottom-4 left-4 right-4 text-on-header">
        <span className="inline-block rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-dark">
          À la une
        </span>
        <p className="mt-2 font-display text-lg font-bold leading-tight">{market.name}</p>
        <p className="text-xs opacity-85">
          {merchantCount > 0 ? `${merchantCount} commerçant${merchantCount > 1 ? 's' : ''}` : 'Bientôt disponible'} · {market.neighborhood}
        </p>
      </div>
    </Link>
  )
}

export default function Home() {
  const { merchants, products, error } = useCatalog()
  const { user } = useAuth()
  const { addresses } = useAddresses()
  const [firstName, setFirstName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const { markets } = useMarkets()
  const categoryPhotos = usePexelsPhotos()
  const { families } = useTaxonomy()
  const [showAllCategories, setShowAllCategories] = useState(false)
  // Familles non vides (ou mises en avant par l'éditorial) ; règle de public.visible_categories() (023).
  const categories = useMemo(() => visibleFamilies(families, products), [families, products])
  const shownCategories = showAllCategories ? categories : categories.slice(0, VISIBLE_CATEGORIES)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        const meta = user.user_metadata ?? {}
        const fromEmail = (user.email ?? '').split('@')[0].replace(/[._-]+/g, ' ').trim()
        const name =
          data?.first_name?.trim() ||
          (meta.first_name as string | undefined)?.trim() ||
          data?.last_name?.trim() ||
          (meta.last_name as string | undefined)?.trim() ||
          fromEmail
        setFirstName(name ? name.charAt(0).toUpperCase() + name.slice(1) : null)
        setAvatarUrl(data?.avatar_url ?? null)
      })
  }, [user])

  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0]
  const area = defaultAddress ? `${defaultAddress.neighborhood}, ${defaultAddress.city}` : 'Libreville'

  const merchantCountByMarket = useMemo(() => {
    const counts = new Map<string, number>()
    for (const m of merchants) counts.set(m.marketId, (counts.get(m.marketId) ?? 0) + 1)
    return counts
  }, [merchants])

  // À la une : d'abord les lieux qui ont des commerçants, puis les enseignes avec logo et les marchés.
  const featured = markets
    .filter((m) => (merchantCountByMarket.get(m.id) ?? 0) > 0 || m.logoUrl || m.kind === 'marche')
    .sort((a, b) => (merchantCountByMarket.get(b.id) ?? 0) - (merchantCountByMarket.get(a.id) ?? 0))
  const stores = markets.filter((m) => m.kind === 'supermarche')
  const localMarkets = markets.filter((m) => m.kind === 'marche')

  // Quatre produits de commerçants différents, pour donner un aperçu du catalogue.
  const discoverProducts = useMemo(() => {
    const picked = []
    const seenNames = new Set<string>()
    for (const merchant of merchants) {
      for (const p of products.filter((p) => p.merchantId === merchant.id)) {
        if (seenNames.has(p.name)) continue
        seenNames.add(p.name)
        picked.push(p)
        if (picked.filter((x) => x.merchantId === merchant.id).length >= 2) break
      }
    }
    return picked.slice(0, 4)
  }, [merchants, products])

  return (
    <PageShell>
      <header className="px-5 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <BrandLogo />
          <Link
            to="/profil"
            aria-label="Mon profil"
            className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-card font-display text-base font-bold text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              (firstName ?? user?.email ?? '?').charAt(0).toUpperCase()
            )}
          </Link>
        </div>
        <div className="mt-5">
          <p className="font-display text-xl font-bold text-brand-dark">Bonjour{firstName ? `, ${firstName}` : ''}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {area}
          </p>
        </div>
      </header>

      <div className="px-5">
        <Link
          to="/recherche"
          className="flex h-14 items-center gap-3 rounded-full border border-line-strong bg-white px-5 shadow-field focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Search className="h-5 w-5 text-brand" aria-hidden="true" />
          <span className="text-sm text-muted">Produits, commerces, marchés…</span>
        </Link>
      </div>

      {error && (
        <div className="px-5 pt-5">
          <CatalogState />
        </div>
      )}

      {featured.length > 0 && (
        <section className="mt-6">
          <ScrollRow label="À la une" dots arrowTop="top-[30%]">
            {featured.map((market) => (
              <FeaturedCard key={market.id} market={market} merchantCount={merchantCountByMarket.get(market.id) ?? 0} />
            ))}
          </ScrollRow>
        </section>
      )}

      {categories.length > 0 && (
      <section className="mt-7 px-5">
        <h2 className={`${sectionTitle} mb-3`}>Catégories</h2>
        <div className="grid grid-cols-4 gap-2">
          {shownCategories.map((cat, i) => (
            <Reveal key={cat.id} index={i % VISIBLE_CATEGORIES}>
              <Link
                to={`/categorie/${cat.id}`}
                aria-label={cat.label}
                className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-card shadow-card transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span className="flex h-16 w-full items-center justify-center bg-brand-light">
                  {cat.imageUrl ?? categoryPhotos[cat.id] ? (
                    <img src={(cat.imageUrl ?? categoryPhotos[cat.id]) as string} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <CategoryIcon category={cat.id} className="h-6 w-6 text-brand" />
                  )}
                </span>
                <span className="flex flex-1 items-center justify-center px-1 py-1.5 text-center text-[11px] font-semibold leading-tight text-brand-dark">{cat.shortLabel ?? cat.label}</span>
              </Link>
            </Reveal>
          ))}
        </div>
        {categories.length > VISIBLE_CATEGORIES && (
          <button
            type="button"
            onClick={() => setShowAllCategories((v) => !v)}
            aria-expanded={showAllCategories}
            className="mx-auto mt-3 flex min-h-11 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {showAllCategories ? 'Voir moins' : 'Voir toutes les catégories'}
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showAllCategories ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        )}
      </section>
      )}

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between px-5">
          <h2 className={sectionTitle}>Magasins et enseignes</h2>
        </div>
        <ScrollRow label="Magasins et enseignes">
          {stores.map((market) => (
            <MarketCard key={market.id} market={market} className="w-40 shrink-0 snap-start" />
          ))}
          <AddMarketCard kind="supermarche" />
        </ScrollRow>
      </section>

      <section className="mt-7 px-5">
        <h2 className={`${sectionTitle} mb-3`}>Commerçants</h2>
        <Link
          to="/devenir-marchand"
          className="flex items-center gap-3 rounded-card border-2 border-dashed border-brand/40 bg-card p-4 transition hover:border-brand active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-brand-dark">
            <Plus className="h-6 w-6" strokeWidth={2.6} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-brand">Ajouter un commerçant</span>
            <span className="block text-xs text-muted">Vous vendez au marché ou en boutique ? Inscrivez votre commerce.</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
        </Link>
      </section>

      <section className="mt-7">
        <h2 className={`${sectionTitle} mb-3 px-5`}>Marchés de proximité</h2>
        <ScrollRow label="Marchés de proximité">
          {localMarkets.map((market) => (
            <MarketCard key={market.id} market={market} className="w-40 shrink-0 snap-start" />
          ))}
          <AddMarketCard />
        </ScrollRow>
      </section>

      {discoverProducts.length > 0 && (
        <section className="mt-7 px-5 pb-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className={sectionTitle}>Produits à découvrir</h2>
            <Link to="/recherche" className="flex items-center text-xs font-semibold text-brand">
              Tout voir <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {discoverProducts.map((product, i) => (
              <Reveal key={product.id} index={i}>
                <ProductTile product={product} merchant={merchants.find((m) => m.id === product.merchantId)} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  )
}
