import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Store, Trash2, MapPin, Clock, Smartphone, Banknote, MessageCircle, Info, Video, ShoppingBasket } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import QuantityStepper from '../components/ui/QuantityStepper'
import ProductPhoto from '../components/ui/ProductPhoto'
import { useCart } from '../context/CartContext'
import { useOrders } from '../context/OrdersContext'
import { useAddresses } from '../context/AddressesContext'
import { useCatalog } from '../context/CatalogContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { formatFCFA } from '../lib/format'
import { buildWhatsAppLink } from '../lib/whatsapp'
import { getProductDisplayName } from '../lib/productDisplay'
import { markets } from '../data/markets'
import { paymentMethods } from '../data/addresses'
import type { Order, OrderItem } from '../types'

const sectionTitle = 'mb-3 font-display text-lg font-bold text-brand-dark'
const card = 'rounded-card border border-line bg-card shadow-card'

export default function Cart() {
  const navigate = useNavigate()
  const {
    items,
    merchantId,
    selectedSlot,
    selectedAddressId,
    paymentMethodId,
    setPaymentMethodId,
    setQuantity,
    removeItem,
    clearCart,
    itemCount,
    subtotal,
    serviceFee,
    deliveryFee,
    distanceKm,
    total,
  } = useCart()
  const { addOrder } = useOrders()
  const { addresses } = useAddresses()
  const { merchants, products } = useCatalog()
  const { user } = useAuth()
  const merchant = merchants.find((m) => m.id === merchantId) ?? null
  const market = merchant ? markets.find((m) => m.id === merchant.marketId) : undefined
  const selectedAddress =
    addresses.find((a) => a.id === selectedAddressId) ?? addresses.find((a) => a.isDefault) ?? addresses[0]
  const payment = paymentMethods.find((p) => p.id === paymentMethodId) ?? paymentMethods[0]
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)

  if (items.length === 0) {
    return (
      <PageShell>
        <header className="px-5 pb-2 pt-6">
          <h1 className="font-display text-2xl font-bold text-brand-dark">Mon panier</h1>
        </header>
        <div className="px-5 pt-4">
          <div className={`${card} p-6 text-center`}>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-light">
              <ShoppingBasket className="h-6 w-6 text-brand" aria-hidden="true" />
            </span>
            <p className="mt-3 font-display text-base font-bold text-brand-dark">Votre panier est vide</p>
            <p className="mt-1 text-xs text-muted">Parcourez les marchés et les magasins pour composer votre commande.</p>
            <Link
              to="/"
              className="mt-4 inline-flex h-10 items-center rounded-full bg-brand px-5 text-xs font-semibold text-on-header"
            >
              Découvrir les commerçants
            </Link>
          </div>
        </div>
      </PageShell>
    )
  }

  const orderItemsPreview: OrderItem[] = items.flatMap((item) => {
    const product = products.find((p) => p.id === item.productId)
    if (!product) return []
    return [
      {
        productId: product.id,
        productName: getProductDisplayName(product),
        quantity: item.quantity,
        unitPrice: product.price,
        unit: product.unit,
      },
    ]
  })

  const whatsAppSummary = [
    `Nouvelle commande Panier 241${merchant ? ` — ${merchant.name}` : ''}`,
    '',
    ...orderItemsPreview.map((i) => `• ${i.quantity} × ${i.productName} (${i.unit})`),
    '',
    selectedSlot ? `Créneau : ${selectedSlot.dayLabel} · ${selectedSlot.periodLabel} (${selectedSlot.timeRange})` : '',
    selectedAddress ? `Adresse : ${selectedAddress.label} · ${selectedAddress.neighborhood}, ${selectedAddress.city}` : '',
    `Paiement : ${payment.label} (à la réception)`,
    `Total estimé : ${formatFCFA(total)}`,
  ]
    .filter(Boolean)
    .join('\n')

  async function handleSubmit() {
    if (!merchant || !selectedSlot) return

    let shoppingVideoUrl: string | null = null
    if (videoFile && user) {
      const path = `${user.id}/${Date.now()}-${videoFile.name}`
      const { error: uploadError } = await supabase.storage.from('shopping-videos').upload(path, videoFile)
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('shopping-videos').getPublicUrl(path)
        shoppingVideoUrl = publicUrlData.publicUrl
      }
    }

    const order: Order = {
      id: `ord-${Date.now()}`,
      merchantId: merchant.id,
      merchantName: merchant.name,
      items: orderItemsPreview,
      subtotal,
      serviceFee,
      deliveryFee,
      distanceKm,
      total,
      status: 'en_preparation',
      createdAt: new Date().toISOString(),
      slotLabel: `${selectedSlot.dayLabel} · ${selectedSlot.periodLabel} (${selectedSlot.timeRange})`,
      addressLabel: selectedAddress
        ? `${selectedAddress.label} · ${selectedAddress.neighborhood}, ${selectedAddress.city}`
        : '',
      livreurId: null,
      livreurName: null,
      livreurPhone: null,
      shoppingVideoUrl,
      clientPhone: null,
    }

    setIsSubmitting(true)
    await addOrder(order)
    setIsSubmitting(false)
    clearCart()
    navigate('/commandes')
  }

  return (
    <PageShell>
      <div className="pb-72">
        <header className="flex items-center justify-between px-5 pb-2 pt-6">
          <h1 className="font-display text-2xl font-bold text-brand-dark">Mon panier</h1>
          <span className="text-xs font-semibold text-muted">
            {itemCount} article{itemCount > 1 ? 's' : ''}
          </span>
        </header>

        <section className="mt-4 px-5">
          <div className={`${card} overflow-hidden`}>
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Store className="h-5 w-5 text-brand" aria-hidden="true" />
              <p className="flex-1 truncate text-sm font-semibold text-brand-dark">{merchant?.name}</p>
              <span className="text-[10px] text-muted">{market?.neighborhood}</span>
            </div>
            <div className="divide-y divide-line">
              {items.map((item) => {
                const product = products.find((p) => p.id === item.productId)
                if (!product) return null
                return (
                  <div key={item.productId} className="flex gap-3 p-4">
                    <ProductPhoto product={product} className="h-20 w-20 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-brand-dark">{getProductDisplayName(product)}</p>
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          aria-label={`Retirer ${getProductDisplayName(product)} du panier`}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-light"
                        >
                          <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                        </button>
                      </div>
                      <p className="mt-1 font-display text-base font-bold tabular-nums text-brand-dark">
                        {formatFCFA(product.price)}
                        <span className="font-sans text-[11px] font-medium text-muted"> / {product.unit}</span>
                      </p>
                      <div className="mt-2">
                        <QuantityStepper
                          quantity={item.quantity}
                          onIncrement={() => setQuantity(item.productId, item.quantity + 1)}
                          onDecrement={() => setQuantity(item.productId, item.quantity - 1)}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="mt-6 px-5">
          <h2 className={sectionTitle}>Adresse de livraison</h2>
          <div className={`${card} flex items-start gap-3 p-4`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light">
              <MapPin className="h-5 w-5 fill-brand/20 text-brand" aria-hidden="true" />
            </span>
            {selectedAddress ? (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-dark">
                  {selectedAddress.label} · {selectedAddress.neighborhood}
                </p>
                <p className="mt-0.5 text-xs text-muted">{selectedAddress.fullAddress}</p>
              </div>
            ) : (
              <p className="min-w-0 flex-1 text-sm text-muted">Aucune adresse enregistrée.</p>
            )}
            <Link to={selectedAddress ? '/creneau' : '/profil'} className="shrink-0 text-xs font-semibold text-brand">
              {selectedAddress ? 'Modifier' : 'Ajouter'}
            </Link>
          </div>
        </section>

        <section className="mt-6 px-5">
          <h2 className={sectionTitle}>Créneau de livraison</h2>
          <Link
            to="/creneau"
            className={`flex items-center gap-3 rounded-card bg-card p-4 ${
              selectedSlot ? 'border-2 border-brand' : 'border border-line shadow-card'
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                selectedSlot ? 'border-brand' : 'border-line'
              }`}
            >
              {selectedSlot && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
            </span>
            <div className="min-w-0 flex-1">
              {selectedSlot ? (
                <>
                  <p className="text-sm font-semibold text-brand-dark">
                    {selectedSlot.dayLabel} · {selectedSlot.periodLabel}
                  </p>
                  <p className="text-xs text-muted">{selectedSlot.timeRange}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-danger">Choisir un créneau</p>
                  <p className="text-xs text-muted">Livraison ou retrait sur place</p>
                </>
              )}
            </div>
            <Clock className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
          </Link>
        </section>

        <section className="mt-6 px-5">
          <h2 className={sectionTitle}>Paiement</h2>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Moyen de paiement">
            {paymentMethods.map((method) => {
              const active = method.id === payment.id
              const Icon = method.id === 'pay-3' ? Banknote : Smartphone
              return (
                <button
                  key={method.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPaymentMethodId(method.id)}
                  className={`flex flex-col items-center gap-1 rounded-card bg-card p-3 ${
                    active ? 'border-2 border-brand' : 'border border-line'
                  }`}
                >
                  <Icon className={`h-6 w-6 ${active ? 'text-brand' : 'text-muted'}`} aria-hidden="true" />
                  <span className="text-center text-[11px] font-semibold leading-tight text-brand-dark">
                    {method.id === 'pay-3' ? 'Espèces' : method.label}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-muted">Réglé au livreur à la réception. Aucun paiement en ligne.</p>
        </section>

        <section className="mt-6 px-5">
          <h2 className={sectionTitle}>Liste de courses filmée</h2>
          <label className={`${card} flex cursor-pointer items-center gap-3 p-4`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light">
              <Video className="h-5 w-5 text-brand" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-brand-dark">
                {videoFile ? videoFile.name : 'Ajouter une vidéo (optionnel)'}
              </span>
              <span className="block text-xs text-muted">Le commerçant voit exactement ce qu'il vous faut.</span>
            </span>
            <input
              type="file"
              accept="video/*"
              capture="environment"
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </label>
        </section>

        <p className="mx-5 mt-6 flex gap-2 rounded-card bg-muted-bg p-3 text-xs text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Les prix sont des estimations : le montant réel peut varier et sera ajusté par le commerçant.{' '}
            <Link to="/prix-officiels" className="font-semibold text-brand underline">
              Comparer avec les prix officiels
            </Link>
          </span>
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-24 z-20 px-4">
        <div className="mx-auto max-w-md rounded-[1.75rem] border border-line bg-card/95 p-4 shadow-float backdrop-blur-md">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted">
              <span>Sous-total (estimé)</span>
              <span className="tabular-nums">{formatFCFA(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Frais de service (5 %)</span>
              <span className="tabular-nums">{formatFCFA(serviceFee)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Livraison{distanceKm != null ? ` (${distanceKm.toFixed(1)} km)` : ''}</span>
              <span className="tabular-nums">{formatFCFA(deliveryFee)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-line pt-1 font-display text-lg font-bold text-brand-dark">
              <span>Total</span>
              <span className="tabular-nums">{formatFCFA(total)}</span>
            </div>
          </div>
          <button
            type="button"
            disabled={!selectedSlot || isSubmitting}
            onClick={handleSubmit}
            className="mt-3 h-12 w-full rounded-full bg-brand text-sm font-semibold text-on-header transition active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? 'Envoi de la commande…' : selectedSlot ? 'Passer la commande' : 'Choisissez un créneau'}
          </button>
          {merchant?.phone && (
            <a
              href={buildWhatsAppLink(merchant.phone, whatsAppSummary)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-brand"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Envoyer aussi via WhatsApp
            </a>
          )}
        </div>
      </div>
    </PageShell>
  )
}
