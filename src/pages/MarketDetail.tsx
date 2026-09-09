import { useParams, Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import Button from '../components/ui/Button'
import MerchantCard from '../components/ui/MerchantCard'
import { markets } from '../data/markets'
import { useCatalog } from '../context/CatalogContext'

export default function MarketDetail() {
  const { marketId } = useParams()
  const { merchants } = useCatalog()
  const market = markets.find((m) => m.id === marketId)

  if (!market) {
    return (
      <PageShell>
        <div className="px-5 pt-6">
          <p className="text-sm text-brand-dark/60">Marché introuvable.</p>
          <Link to="/" className="mt-3 inline-block text-sm font-semibold text-brand">
            ← Retour à l'accueil
          </Link>
        </div>
      </PageShell>
    )
  }

  const marketMerchants = merchants.filter((m) => m.marketId === market.id)

  return (
    <PageShell>
      <WovenHeader>
        <div className="flex items-center gap-3">
          <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">
            ←
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl">
              {market.imageEmoji}
            </div>
            <div>
              <h1 className="text-xl font-bold">{market.name}</h1>
              <p className="text-sm text-white/80">
                {market.neighborhood}, {market.city}
              </p>
            </div>
          </div>
        </div>
      </WovenHeader>

      <div className="space-y-3 px-5 pt-5 pb-8">
        <h2 className="text-sm font-semibold text-brand-dark">
          Marchands {marketMerchants.length > 0 && `(${marketMerchants.length})`}
        </h2>

        {marketMerchants.length > 0 ? (
          <div className="space-y-3">
            {marketMerchants.map((merchant) => (
              <MerchantCard key={merchant.id} merchant={merchant} />
            ))}
          </div>
        ) : (
          <div className="rounded-card bg-white p-5 text-center shadow-card">
            <p className="text-2xl">🧺</p>
            <p className="mt-2 text-sm font-medium text-brand-dark">Aucun marchand pour l'instant ici</p>
            <p className="mt-1 text-xs text-brand-dark/50">
              Personne n'a encore rejoint ce lieu de vente sur Panier 241. Si tu es marchand ici, sois le
              premier à t'inscrire.
            </p>
            <Link to="/devenir-marchand" className="mt-4 inline-block">
              <Button>Devenir marchand</Button>
            </Link>
          </div>
        )}
      </div>
    </PageShell>
  )
}
