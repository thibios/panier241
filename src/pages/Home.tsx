import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ChevronRight, Scale } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import MarketCard from '../components/ui/MarketCard'
import ProductTile from '../components/ui/ProductTile'
import Reveal from '../components/ui/Reveal'
import ScrollRow from '../components/ui/ScrollRow'
import AddMarketCard from '../components/ui/AddMarketCard'
import { useMarkets } from '../context/MarketsContext'
import CatalogState from '../components/ui/CatalogState'
import { CategoryIcon } from '../components/ui/icons'
import { useMarketPhoto } from '../components/ui/MarketVisual'
import { categories } from '../data/categories'
import { useCatalog } from '../context/CatalogContext'
import { useAuth } from '../context/AuthContext'
import { useAddresses } from '../context/AddressesContext'
import { usePexelsPhotos } from '../context/PexelsContext'
import { supabase } from '../lib/supabaseClient'
import { resolveImage } from '../lib/images'
import type { Market, Merchant } from '../types'

const sectionTitle = 'font-display text-lg font-bold text-brand-dark'

/** Grande carte du carrousel « À la une » : un lieu de vente qui a déjà des commerçants. */
function FeaturedCard({ market, merchantCount }: { market: Market; merchantCount: number }) {
  const photo = useMarketPhoto(market)
  return (
    <Link
      to={`/marche/${market.id}`}
      className="relative block h-44 w-[85%] shrink-0 snap-start overflow-hidden rounded-card bg-brand shadow-card transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
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

/** Carte compacte d'un commerçant dans la rangée horizontale. */
function MerchantTile({ merchant }: { merchant: Merchant }) {
  const pexelsPhotos = usePexelsPhotos()
  const { markets } = useMarkets()
  const market = markets.find((m) => m.id === merchant.marketId)
  const photo = merchant.kioskPhotoUrl
    ? resolveImage(merchant.kioskPhotoUrl, merchant.categories[0], pexelsPhotos)
    : market?.logoUrl ?? resolveImage(null, merchant.categories[0], pexelsPhotos)
  const category = categories.find((c) => c.id === merchant.categories[0])

  return (
    <Link
      to={`/marchand/${merchant.id}`}
      className="block w-40 shrink-0 snap-start overflow-hidden rounded-card border border-line bg-card shadow-card transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
    >
      <div className="flex h-24 w-full items-center justify-center bg-white">
        {photo ? (
          <img
            src={photo}
            alt=""
            loading="lazy"
            className={`h-full w-full ${photo === market?.logoUrl ? 'object-contain p-3' : 'object-cover'}`}
          />
        ) : (
          <CategoryIcon category={merchant.categories[0]} className="h-8 w-8 text-brand" />
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold text-brand-dark">{merchant.name}</p>
        <p className="truncate text-[11px] text-muted">
          {category?.label.split(' ')[0]} · {market?.neighborhood}
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

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('first_name, avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setFirstName(data?.first_name?.trim() || null)
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
      <header className="flex items-start justify-between px-5 pb-4 pt-6">
        <div className="min-w-0">
          <p className="text-sm text-muted">Bonjour{firstName ? ',' : ''}</p>
          <h1 className="truncate font-display text-2xl font-bold text-brand-dark">
            {firstName ?? (
              <>
                Le Panier <span className="text-brand">241</span>
              </>
            )}
          </h1>
          <p className="mt-0.5 text-xs text-muted">{area}</p>
        </div>
        <Link
          to="/profil"
          aria-label="Mon profil"
          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-card font-display text-base font-bold text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            (firstName ?? user?.email ?? '?').charAt(0).toUpperCase()
          )}
        </Link>
      </header>

      <div className="px-5">
        <Link
          to="/recherche"
          className="flex h-14 items-center gap-3 rounded-full border border-line bg-white px-5 shadow-field focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
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

      <section className="mt-7 px-5">
        <h2 className={`${sectionTitle} mb-3`}>Catégories</h2>
        <div className="grid grid-cols-3 gap-3">
          {categories.map((cat, i) => (
            <Reveal key={cat.id} index={i}>
              <Link
                to={`/categorie/${cat.id}`}
                className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-card shadow-card transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
              >
                <span className="flex h-20 w-full items-center justify-center bg-brand-light">
                  {categoryPhotos[cat.id] ? (
                    <img src={categoryPhotos[cat.id] as string} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <CategoryIcon category={cat.id} className="h-6 w-6 text-brand" />
                  )}
                </span>
                <span className="flex flex-1 items-center justify-center px-2 py-2 text-center text-xs font-semibold leading-tight text-brand-dark">{cat.label}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mt-5 px-5">
        <Link
          to="/prix-officiels"
          className="flex items-center gap-3 rounded-card border border-line bg-card p-4 shadow-card transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-brand-dark">
            <Scale className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-brand-dark">Prix officiels de l'État</span>
            <span className="block text-xs text-muted">Riz, sucre, huile, lait, poulet… les prix plafonds à ne pas dépasser</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
        </Link>
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between px-5">
          <h2 className={sectionTitle}>Magasins et enseignes</h2>
          <span className="text-xs font-semibold text-muted">{stores.length} lieux</span>
        </div>
        <ScrollRow label="Magasins et enseignes">
          {stores.map((market) => (
            <MarketCard key={market.id} market={market} className="w-40 shrink-0 snap-start" />
          ))}
        </ScrollRow>
      </section>

      {merchants.length > 0 && (
        <section className="mt-7">
          <h2 className={`${sectionTitle} mb-3 px-5`}>Commerçants</h2>
          <ScrollRow label="Commerçants">
            {merchants.map((merchant) => (
              <MerchantTile key={merchant.id} merchant={merchant} />
            ))}
          </ScrollRow>
        </section>
      )}

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
