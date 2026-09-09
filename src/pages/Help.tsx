import { Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import { BASE_DELIVERY_FEE, RATE_PER_KM, SERVICE_FEE_RATE } from '../lib/pricing'
import { formatFCFA } from '../lib/format'

export default function Help() {
  return (
    <PageShell>
      <WovenHeader>
        <div className="flex items-center gap-3">
          <Link to="/profil" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">
            ←
          </Link>
          <h1 className="text-xl font-bold">Aide</h1>
        </div>
      </WovenHeader>

      <div className="space-y-4 px-5 pt-5 pb-8">
        <Card className="space-y-2">
          <h2 className="font-display text-base font-semibold text-brand-dark">
            Pourquoi le sous-total est-il "estimé" ?
          </h2>
          <p className="text-sm text-brand-dark/70">
            Les prix affichés dans l'application sont ceux annoncés par les marchands, mais les
            produits frais (marchés, magasins) peuvent voir leur prix varier légèrement d'un jour à
            l'autre ou d'un point de vente à l'autre. Le marchand ajuste donc le sous-total après avoir
            réellement fait les achats, pour refléter le montant exact payé.
          </p>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-base font-semibold text-brand-dark">
            Comment est calculé le total ?
          </h2>
          <p className="text-sm text-brand-dark/70">Le total de ta commande se compose de 3 éléments :</p>
          <ul className="space-y-2 text-sm text-brand-dark/70">
            <li>
              <span className="font-semibold text-brand-dark">1. Sous-total des marchandises</span> — le
              prix des produits que tu as choisis (estimatif, voir ci-dessus).
            </li>
            <li>
              <span className="font-semibold text-brand-dark">
                2. Frais de service ({(SERVICE_FEE_RATE * 100).toFixed(0)}%)
              </span>{' '}
              — {(SERVICE_FEE_RATE * 100).toFixed(0)}% du sous-total, qui couvre le fonctionnement de
              Panier 241.
            </li>
            <li>
              <span className="font-semibold text-brand-dark">3. Frais de livraison</span> — un forfait
              de base de {formatFCFA(BASE_DELIVERY_FEE)}, plus {formatFCFA(RATE_PER_KM)} par kilomètre
              entre le marché et ton adresse de livraison (calculé via ta position GPS quand elle est
              disponible).
            </li>
          </ul>
          <p className="rounded-2xl bg-brand-light p-3 text-xs text-brand-dark/60">
            Exemple : pour 10 000 F CFA d'achats et une livraison à 4 km, le total serait 10 000 +{' '}
            {formatFCFA(Math.round(10000 * SERVICE_FEE_RATE))} (service) +{' '}
            {formatFCFA(BASE_DELIVERY_FEE + 4 * RATE_PER_KM)} (livraison) ={' '}
            {formatFCFA(10000 + Math.round(10000 * SERVICE_FEE_RATE) + BASE_DELIVERY_FEE + 4 * RATE_PER_KM)}.
          </p>
        </Card>

        <Card className="space-y-2">
          <h2 className="font-display text-base font-semibold text-brand-dark">
            Pourquoi autoriser ma position ?
          </h2>
          <p className="text-sm text-brand-dark/70">
            Autoriser la géolocalisation quand tu ajoutes une adresse permet de calculer des frais de
            livraison justes, basés sur la distance réelle. Si tu refuses, un forfait de livraison par
            défaut est appliqué à la place — tu peux toujours commander normalement.
          </p>
        </Card>
      </div>
    </PageShell>
  )
}
