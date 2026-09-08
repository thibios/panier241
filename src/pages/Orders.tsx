import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import { useOrders } from '../context/OrdersContext'

export default function Orders() {
  const { orders } = useOrders()

  return (
    <PageShell>
      <WovenHeader>
        <h1 className="text-xl font-bold">Mes commandes</h1>
      </WovenHeader>
      <div className="px-5 pt-5">
        <Card className="text-sm text-brand-dark/60">
          Écran Commandes (onglets En cours / Historique) à construire à l'étape 5.
          Commandes mockées disponibles : {orders.length}.
        </Card>
      </div>
    </PageShell>
  )
}
