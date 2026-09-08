import { useParams, Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import Card from '../components/ui/Card'
import { merchants } from '../data/merchants'

export default function MerchantDetail() {
  const { merchantId } = useParams()
  const merchant = merchants.find((m) => m.id === merchantId)

  return (
    <PageShell>
      <div className="px-5 pt-6">
        <Card>
          <p className="text-sm text-brand-dark/60">Fiche marchand (à construire à l'étape 2)</p>
          <p className="mt-2 font-display text-lg font-semibold text-brand-dark">
            {merchant?.name ?? 'Marchand introuvable'}
          </p>
          <Link to="/" className="mt-4 inline-block text-sm font-semibold text-brand">
            ← Retour à l'accueil
          </Link>
        </Card>
      </div>
    </PageShell>
  )
}
