import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import { useCart } from '../context/CartContext'

export default function Cart() {
  const { itemCount } = useCart()

  return (
    <PageShell>
      <WovenHeader>
        <h1 className="text-xl font-bold">Mon panier</h1>
      </WovenHeader>
      <div className="px-5 pt-5">
        <Card className="text-sm text-brand-dark/60">
          Écran Panier à construire à l'étape 4. Articles actuellement dans le panier : {itemCount}.
        </Card>
      </div>
    </PageShell>
  )
}
