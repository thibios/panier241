import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import QuantityStepper from '../components/ui/QuantityStepper'
import { useCart } from '../context/CartContext'
import { useOrders } from '../context/OrdersContext'
import { useAddresses } from '../context/AddressesContext'
import { useCatalog } from '../context/CatalogContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { formatFCFA } from '../lib/format'
import { buildWhatsAppLink } from '../lib/whatsapp'
import { resolveImage } from '../lib/images'
import { usePexelsPhotos } from '../context/PexelsContext'
import { getProductDisplayName } from '../lib/productDisplay'
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
    serviceFee,
    deliveryFee,
    distanceKm,
    total,
  } = useCart()
  const { addOrder } = useOrders()
  const { addresses } = useAddresses()
  const { merchants, products } = useCatalog()
  const { user } = useAuth()
  const pexelsPhotos = usePexelsPhotos()
  const merchant = merchants.find((m) => m.id === merchantId) ?? null
  const selectedAddress =
    addresses.find((a) => a.id === selectedAddressId) ?? addresses.find((a) => a.isDefault) ?? addresses[0]
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)

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
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-light text-xl">
                  {(() => {
                    const photo = resolveImage(product.imageUrl, product.category, pexelsPhotos)
                    return photo ? (
                      <img src={photo} alt={getProductDisplayName(product)} className="h-full w-full object-cover" />
                    ) : (
                      product.imageEmoji
                    )
                  })()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-brand-dark">{getProductDisplayName(product)}</p>
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

        <p className="rounded-card bg-category-cereales/10 p-3 text-xs text-category-cereales">
          ℹ️ Le sous-total des marchandises est une estimation — le montant réel peut varier selon le
          marché et sera ajusté par le marchand si besoin.{' '}
          <Link to="/aide" className="font-semibold underline">
            En savoir plus
          </Link>
        </p>

        <Card className="space-y-2">
          <div className="flex items-center justify-between text-sm text-brand-dark/70">
            <span>Sous-total (estimé)</span>
            <span>{formatFCFA(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-brand-dark/70">
            <span>Frais de service (5%)</span>
            <span>{formatFCFA(serviceFee)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-brand-dark/70">
            <span>
              Livraison{distanceKm != null ? ` (2 000 F CFA + ${distanceKm.toFixed(1)} km)` : ''}
            </span>
            <span>{formatFCFA(deliveryFee)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-brand-light pt-2 text-sm font-bold text-brand-dark">
            <span>Total</span>
            <span>{formatFCFA(total)}</span>
          </div>
        </Card>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-brand-dark">Liste de courses filmée (optionnel)</h2>
          <Card className="space-y-2">
            <p className="text-xs text-brand-dark/50">
              Filme rapidement ta liste de courses pour que le marchand voie exactement ce qu'il te faut.
            </p>
            <input
              type="file"
              accept="video/*"
              capture="environment"
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-brand-dark/70"
            />
            {videoFile && <p className="text-xs text-brand">Vidéo prête à être envoyée : {videoFile.name}</p>}
          </Card>
        </section>

        <div className="space-y-2 pb-4">
          {merchant?.phone ? (
            <a
              href={buildWhatsAppLink(merchant.phone, whatsAppSummary)}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button variant="secondary" fullWidth>
                🟢 Envoyer la commande via WhatsApp
              </Button>
            </a>
          ) : (
            <p className="text-center text-xs text-brand-dark/40">
              Ce marchand n'a pas encore renseigné de numéro WhatsApp.
            </p>
          )}
          <Button fullWidth disabled={!selectedSlot || isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? 'Envoi de la commande...' : 'Passer la commande'}
          </Button>
        </div>
      </div>
    </PageShell>
  )
}
