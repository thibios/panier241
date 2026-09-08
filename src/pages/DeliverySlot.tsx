import PageShell from '../components/layout/PageShell'
import Card from '../components/ui/Card'

export default function DeliverySlot() {
  return (
    <PageShell>
      <div className="px-5 pt-6">
        <Card>
          <p className="text-sm text-brand-dark/60">Choix du créneau de livraison (à construire à l'étape 3)</p>
        </Card>
      </div>
    </PageShell>
  )
}
