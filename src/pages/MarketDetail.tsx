import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ShoppingBasket } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import MarketHeader from '../components/layout/MarketHeader'
import Button from '../components/ui/Button'
import MerchantCard from '../components/ui/MerchantCard'
import MarketVisual from '../components/ui/MarketVisual'
import Reveal from '../components/ui/Reveal'
import CatalogState from '../components/ui/CatalogState'
import { markets } from '../data/markets'
import { useCatalog } from '../context/CatalogContext'
import MerchantThemeProvider from '../theme/MerchantThemeProvider'
import { resolveMarketTheme } from '../theme/tokens'

export default function MarketDetail() {
  const { marketId } = useParams()
  const { merchants, loading, error } = useCatalog()
  const market = markets.find((m) => m.id === marketId)

  if (!market) {
    return (
      <PageShell>
        <div className="px-5 pt-6">
          <p className="text-sm text-brand-dark/60">Marché introuvable.</p>
          <Link to="/" className="mt-3 inline-block text-sm font-semibold text-brand">
            <ArrowLeft className="inline h-4 w-4" /> Retour à l'accueil
          </Link>
        </div>
      </PageShell>
    )
  }

  const marketMerchants = merchants.filter((m) => m.marketId === market.id)

  return (
    // La clé relance le fondu d'entrée quand on passe d'un lieu à un autre.
    <MerchantThemeProvider key={market.id} theme={resolveMarketTheme(market)}>
      <PageShell>
        <MarketHeader market={market}>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              aria-label="Retour à l'accueil"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 transition active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/20">
              <MarketVisual market={market} iconClassName="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{market.name}</h1>
              <p className="text-sm text-white/85">
                {market.neighborhood === market.city ? market.city : `${market.neighborhood}, ${market.city}`}
              </p>
            </div>
          </div>
        </MarketHeader>

        <div className="space-y-3 px-5 pb-8 pt-5">
          <h2 className="text-sm font-semibold text-brand-dark">
            Commerçants {marketMerchants.length > 0 && `(${marketMerchants.length})`}
          </h2>

          {marketMerchants.length > 0 ? (
            <div className="space-y-3">
              {marketMerchants.map((merchant, i) => (
                <Reveal key={merchant.id} index={i}>
                  <MerchantCard merchant={merchant} />
                </Reveal>
              ))}
            </div>
          ) : loading || error ? (
            <CatalogState />
          ) : (
            <Reveal>
              <div className="rounded-card bg-white p-5 text-center shadow-card">
                <ShoppingBasket className="mx-auto h-9 w-9 text-brand-dark/30" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-brand-dark">Bientôt disponible</p>
                <p className="mt-1 text-xs text-brand-dark/60">
                  Aucun commerçant n'est encore rattaché à ce lieu sur Le Panier 241. Si tu vends ici, sois le
                  premier à t'inscrire.
                </p>
                <Link to="/devenir-marchand" className="mt-4 inline-block">
                  <Button>Devenir marchand</Button>
                </Link>
              </div>
            </Reveal>
          )}
        </div>
      </PageShell>
    </MerchantThemeProvider>
  )
}
