import { useNavigate, Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import QuantityStepper from '../components/ui/QuantityStepper'
import { useCart, getCartMerchant } from '../context/CartContext'
import { useOrders } from '../context/OrdersContext'
import { useAddresses } from '../context/AddressesContext'
import { products } from '../data/products'
import { formatFCFA } from '../lib/format'
import type { Order, OrderItem } from '../types'

export default function Cart() {
  const navigate = useNavigate()
  const {
    items,
    merchantId,
    selectedSlot,
    selectedAddressId,
    setQuantity,
    clearCart,
    subtotal,
    deliveryFee,
    total,
  } = useCart()
  const { addOrder } = useOrders()
  const { addresses } = useAddresses()
  const merchant = getCartMerchant(merchantId)
  const selectedAddress =
    addresses.find((a) => a.id === selectedAddressId) ?? addresses.find((a) => a.isDefault) ?? addresses[0]

  if (items.length === 0) {
    return (
      <PageShell>
        <WovenHeader>
          <h1 className="text-xl font-bold">Mon panier</h1>
        </WovenHeader>
        <div className="px-5 pt-8 text-center">
          <p className="text-3xl">🧺</p>
          <p className="mt-2 text-sm font-medium text-brand-dark">Ton panier est vide</p>
          <p className="mt-1 text-xs text-brand-dark/50">
            Parcours les marchés et marchands pour composer ta commande.
          </p>
          <Link to="/" className="mt-4 inline-block">
            <Button>Découvrir les marchands</Button>
          </Link>
        </div>
      </PageShell>
    )
  }

  function handleSubmit() {
    if (!merchant || !selectedSlot) return

    const orderItems: OrderItem[] = items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!
      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        unit: product.unit,
      }
    })

    const order: Order = {
      id: `ord-${Date.now()}`,
      merchantId: merchant.id,
      merchantName: merchant.name,
      items: orderItems,
      subtotal,
      deliveryFee,
      total,
      status: 'en_preparation',
      createdAt: new Date().toISOString(),
      slotLabel: `${selectedSlot.dayLabel} · ${selectedSlot.periodLabel} (${selectedSlot.timeRange})`,
      addressLabel: selectedAddress
        ? `${selectedAddress.label} · ${selectedAddress.neighborhood}, ${selectedAddress.city}`
        : '',
    }

    addOrder(order)
    clearCart()
    navigate('/commandes')
  }

  return (
    <PageShell>
      <WovenHeader>
        <h1 className="text-xl font-bold">Mon panier</h1>
        {merchant && <p className="mt-1 text-sm text-white/80">{merchant.name}</p>}
      </WovenHeader>

      <div className="space-y-5 px-5 pt-5">
        <div className="space-y-3">
          {items.map((item) => {
            const product = products.find((p) => p.id === item.productId)
            if (!product) return null
            return (
              <div key={item.productId} className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-xl">
                  {product.imageEmoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-brand-dark">{product.name}</p>
                  <p className="text-xs text-brand-dark/50">{formatFCFA(product.price)} / {product.unit}</p>
                </div>
                <QuantityStepper
                  quantity={item.quantity}
                  onIncrement={() => setQuantity(item.productId, item.quantity + 1)}
                  onDecrement={() => setQuantity(item.productId, item.quantity - 1)}
                />
              </div>
            )
          })}
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-brand-dark">Livraison</h2>
            <Link to="/creneau" className="text-xs font-semibold text-brand">
              Modifier
            </Link>
          </div>
          <Card className="space-y-1 text-xs text-brand-dark/70">
            {selectedSlot ? (
              <p>🕒 {selectedSlot.dayLabel} · {selectedSlot.periodLabel} ({selectedSlot.timeRange})</p>
            ) : (
              <p className="text-category-poisson">Aucun créneau choisi — clique sur "Modifier" pour en choisir un.</p>
            )}
            {selectedAddress && (
              <p>📍 {selectedAddress.label} — {selectedAddress.fullAddress}, {selectedAddress.neighborhood}</p>
            )}
          </Card>
        </section>

        <Card className="space-y-2">
          <div className="flex items-center justify-between text-sm text-brand-dark/70">
            <span>Sous-total</span>
            <span>{formatFCFA(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-brand-dark/70">
            <span>Frais de livraison</span>
            <span>{formatFCFA(deliveryFee)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-brand-light pt-2 text-sm font-bold text-brand-dark">
            <span>Total</span>
            <span>{formatFCFA(total)}</span>
          </div>
        </Card>

        <div className="pb-4">
          <Button fullWidth disabled={!selectedSlot} onClick={handleSubmit}>
            Passer la commande
          </Button>
        </div>
      </div>
    </PageShell>
  )
}
