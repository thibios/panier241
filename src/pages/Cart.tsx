import { useEffect, useRef, useState } from 'react'
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
import { newRequestId, paymentCodeFromId } from '../lib/orderEngine'
import type { OrderItem } from '../types'

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
    fulfillmentMode,
    subtotal,
    serviceFee,
    deliveryFee,
    distanceKm,
    total,
    deposit,
  } = useCart()
  const { placeOrder } = useOrders()
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
  const [landmark, setLandmark] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const isPickup = fulfillmentMode === 'retrait'
  // Identifiant de la tentative en cours : réutilisé si l'envoi est relancé après une coupure réseau
  // (la base renvoie alors la même commande), renouvelé dès que le contenu de la commande change.
  const requestIdRef = useRef<string | null>(null)
  useEffect(() => {
    requestIdRef.current = null
  }, [items, selectedSlot, selectedAddressId, paymentMethodId, landmark])

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
    isPickup
      ? 'Retrait sur stand'
      : selectedAddress
        ? `Adresse : ${selectedAddress.label} · ${selectedAddress.neighborhood}, ${selectedAddress.city}`
        : '',
    !isPickup && landmark.trim() ? `Repère : ${landmark.trim()}` : '',
    `Paiement : ${payment.label} (à la réception)`,
    `Total estimé : ${formatFCFA(total)}`,
    deposit > 0 ? `Acompte estimé : ${formatFCFA(deposit)}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const missingAddress = !isPickup && !selectedAddress
  const canSubmit = Boolean(selectedSlot) && !missingAddress && !isSubmitting

  async function handleSubmit() {
    if (!merchant || !selectedSlot || !user) return
    if (missingAddress) {
      setSubmitError('Ajoutez une adresse de livraison, ou choisissez un retrait sur stand.')
      return
    }
    setSubmitError(null)
    setIsSubmitting(true)

    const { data: profileData } = await supabase.from('profiles').select('phone').eq('id', user.id).single()
    const phone = (profileData?.phone ?? '').trim()
    if (!phone) {
      setIsSubmitting(false)
      setSubmitError('Ajoutez votre numéro de téléphone dans votre profil pour que la commande puisse vous joindre.')
      return
    }

    let shoppingVideoUrl: string | null = null
    if (videoFile) {
      const path = `${user.id}/${Date.now()}-${videoFile.name}`
      const { error: uploadError } = await supabase.storage.from('shopping-videos').upload(path, videoFile)
      if (uploadError) {
        setIsSubmitting(false)
        setSubmitError("La vidéo n'a pas pu être envoyée. Réessayez, ou retirez-la pour commander sans vidéo.")
        return
      }
      const { data: publicUrlData } = supabase.storage.from('shopping-videos').getPublicUrl(path)
      shoppingVideoUrl = publicUrlData.publicUrl
    }

    if (!requestIdRef.current) requestIdRef.current = newRequestId()

    const result = await placeOrder({
      requestId: requestIdRef.current,
      merchantId: merchant.id,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      mode: fulfillmentMode,
      slotLabel: `${selectedSlot.dayLabel} · ${selectedSlot.periodLabel} (${selectedSlot.timeRange})`,
      phone,
      paymentMethod: paymentCodeFromId(payment.id),
      address:
        !isPickup && selectedAddress
          ? `${selectedAddress.fullAddress}, ${selectedAddress.neighborhood}, ${selectedAddress.city}`
          : null,
      lat: !isPickup ? selectedAddress?.lat ?? null : null,
      lng: !isPickup ? selectedAddress?.lng ?? null : null,
      landmark: !isPickup ? landmark.trim() || null : null,
      addressLabel:
        !isPickup && selectedAddress
          ? `${selectedAddress.label} · ${selectedAddress.neighborhood}, ${selectedAddress.city}`
          : null,
      shoppingVideoUrl,
    })
    setIsSubmitting(false)

    if (result.error !== null) {
      setSubmitError(result.error)
      return
    }
    requestIdRef.current = null
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

        {isPickup ? (
          <section className="mt-6 px-5">
            <h2 className={sectionTitle}>Retrait sur stand</h2>
            <div className={`${card} flex items-start gap-3 p-4`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light">
                <Store className="h-5 w-5 text-brand" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-dark">{merchant?.name}</p>
                <p className="mt-0.5 text-xs text-muted">{merchant?.address}</p>
                <p className="mt-1 text-xs text-muted">
                  Aucune livraison : vous récupérez la commande sur place quand le commerçant la signale prête.
                </p>
              </div>
            </div>
          </section>
        ) : (
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
          {selectedAddress && selectedAddress.lat == null && (
            <p className="mt-2 text-xs text-muted">Adresse sans position GPS : forfait de livraison appliqué.</p>
          )}
          <label className="mt-3 block">
            <span className="text-xs font-semibold text-brand-dark">Point de repère (optionnel)</span>
            <input
              type="text"
              value={landmark}
              maxLength={200}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="Ex. : portail bleu, face à la pharmacie"
              className="mt-1 h-11 w-full rounded-card border border-line-strong bg-white px-3 text-sm text-brand-dark placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
          </label>
        </section>
        )}

        <section className="mt-6 px-5">
          <h2 className={sectionTitle}>Créneau : livraison ou retrait sur stand</h2>
          <Link
            to="/creneau"
            className={`flex items-center gap-3 rounded-card bg-card p-4 ${
              selectedSlot ? 'border-2 border-brand' : 'border border-line shadow-card'
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                selectedSlot ? 'border-brand' : 'border-line-strong'
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
          <p className="mt-2 text-xs text-muted">
            {isPickup
              ? 'Réglé au commerçant au moment du retrait. Aucun paiement en ligne.'
              : 'Réglé au livreur à la réception. Aucun paiement en ligne.'}
          </p>
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
              <span>
                {isPickup
                  ? 'Retrait sur stand'
                  : `Livraison${distanceKm != null ? ` (${distanceKm.toFixed(1)} km)` : ' (forfait sans GPS)'}`}
              </span>
              <span className="tabular-nums">{formatFCFA(deliveryFee)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-line pt-1 font-display text-lg font-bold text-brand-dark">
              <span>Total estimé</span>
              <span className="tabular-nums">{formatFCFA(total)}</span>
            </div>
            {deposit > 0 && (
              <div className="flex justify-between text-xs text-brand-dark">
                <span>Dont acompte à régler au commerçant (5 % du total)</span>
                <span className="tabular-nums">{formatFCFA(deposit)}</span>
              </div>
            )}
            <p className="text-[11px] text-muted">Le montant définitif est calculé à la validation de la commande.</p>
          </div>
          {submitError && (
            <p role="alert" className="mt-2 text-xs font-semibold text-danger">
              {submitError}
            </p>
          )}
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="mt-3 h-12 w-full rounded-full bg-brand text-sm font-semibold text-on-header transition active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting
              ? 'Envoi de la commande…'
              : !selectedSlot
                ? 'Choisissez un créneau'
                : missingAddress
                  ? 'Ajoutez une adresse'
                  : 'Passer la commande'}
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
