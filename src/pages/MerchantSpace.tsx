import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import StatusBadge from '../components/ui/StatusBadge'
import { categories } from '../data/categories'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import { formatFCFA } from '../lib/format'
import { SERVICE_FEE_RATE } from '../lib/pricing'
import { resolveImage } from '../lib/images'
import { usePexelsPhotos } from '../context/PexelsContext'
import type { CategoryId, Merchant, Order, OrderStatus } from '../types'

type Tab = 'produits' | 'commandes'

const inputClass =
  'w-full rounded-2xl bg-brand-light px-3 py-2.5 text-sm text-brand-dark placeholder:text-brand-dark/40 focus:outline-none'

interface OrderRow {
  id: string
  merchant_id: string
  merchant_name: string
  items: Order['items']
  subtotal: number
  service_fee: number
  delivery_fee: number
  distance_km: number | null
  total: number
  status: OrderStatus
  slot_label: string
  address_label: string
  created_at: string
  livreur_id: string | null
  livreur_name: string | null
  livreur_phone: string | null
  shopping_video_url: string | null
  client_phone: string | null
}

function orderFromRow(row: OrderRow): Order {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    merchantName: row.merchant_name,
    items: row.items,
    subtotal: row.subtotal,
    serviceFee: row.service_fee,
    deliveryFee: row.delivery_fee,
    distanceKm: row.distance_km,
    total: row.total,
    status: row.status,
    createdAt: row.created_at,
    slotLabel: row.slot_label,
    addressLabel: row.address_label,
    livreurId: row.livreur_id,
    livreurName: row.livreur_name,
    livreurPhone: row.livreur_phone,
    shoppingVideoUrl: row.shopping_video_url,
    clientPhone: row.client_phone,
  }
}

const ORDER_COLUMNS =
  'id, merchant_id, merchant_name, items, subtotal, service_fee, delivery_fee, distance_km, total, status, slot_label, address_label, created_at, livreur_id, livreur_name, livreur_phone, shopping_video_url, client_phone'

export default function MerchantSpace() {
  const { user } = useAuth()
  const { getProductsForMerchant, refresh: refreshCatalog } = useCatalog()
  const pexelsPhotos = usePexelsPhotos()

  const [myMerchant, setMyMerchant] = useState<Merchant | null | undefined>(undefined)
  const [tab, setTab] = useState<Tab>('produits')

  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [editedSubtotal, setEditedSubtotal] = useState('')

  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftCategory, setDraftCategory] = useState<CategoryId>('legumes')
  const [draftPrice, setDraftPrice] = useState('')
  const [draftUnit, setDraftUnit] = useState('kg')
  const [draftPhotoFile, setDraftPhotoFile] = useState<File | null>(null)
  const [draftPhotoPreview, setDraftPhotoPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('merchants')
      .select('id, owner_id, name, market_id, categories, rating, review_count, address, image_emoji, banner_color, kiosk_photo_url, status, phone')
      .eq('owner_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setMyMerchant(null)
          return
        }
        setMyMerchant({
          id: data.id,
          ownerId: data.owner_id,
          name: data.name,
          marketId: data.market_id,
          categories: data.categories,
          rating: data.rating,
          reviewCount: data.review_count,
          address: data.address,
          imageEmoji: data.image_emoji,
          bannerColor: data.banner_color,
          kioskPhotoUrl: data.kiosk_photo_url,
          status: data.status,
          phone: data.phone,
        })
      })
  }, [user])

  async function fetchOrders(merchantId: string) {
    setOrdersLoading(true)
    const { data } = await supabase
      .from('orders')
      .select(ORDER_COLUMNS)
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
    if (data) setOrders(data.map(orderFromRow))
    setOrdersLoading(false)
  }

  useEffect(() => {
    if (myMerchant && myMerchant.status === 'approved') fetchOrders(myMerchant.id)
  }, [myMerchant])

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)))
    await supabase.from('orders').update({ status }).eq('id', orderId)
  }

  function startEditingAmount(order: Order) {
    setEditingOrderId(order.id)
    setEditedSubtotal(String(order.subtotal))
  }

  async function handleSaveAmount(order: Order) {
    const newSubtotal = Math.round(Number(editedSubtotal))
    if (!Number.isFinite(newSubtotal) || newSubtotal < 0) return
    const newServiceFee = Math.round(newSubtotal * SERVICE_FEE_RATE)
    const newTotal = newSubtotal + newServiceFee + order.deliveryFee

    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id ? { ...o, subtotal: newSubtotal, serviceFee: newServiceFee, total: newTotal } : o,
      ),
    )
    await supabase
      .from('orders')
      .update({ subtotal: newSubtotal, service_fee: newServiceFee, total: newTotal })
      .eq('id', order.id)
    setEditingOrderId(null)
  }

  function handleDraftPhotoChange(file: File | null) {
    setDraftPhotoFile(file)
    setDraftPhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleAddProduct() {
    if (!myMerchant || !user || !draftName.trim() || !draftPrice.trim() || !draftUnit.trim()) return

    let imageUrl: string | null = null
    if (draftPhotoFile) {
      const path = `${user.id}/${Date.now()}-${draftPhotoFile.name}`
      const { error: photoError } = await supabase.storage.from('product-photos').upload(path, draftPhotoFile)
      if (!photoError) {
        imageUrl = supabase.storage.from('product-photos').getPublicUrl(path).data.publicUrl
      }
    }

    await supabase.from('products').insert({
      merchant_id: myMerchant.id,
      name: draftName.trim(),
      category: draftCategory,
      price: Math.round(Number(draftPrice)),
      unit: draftUnit.trim(),
      image_emoji: categories.find((c) => c.id === draftCategory)?.icon ?? '🛒',
      image_url: imageUrl,
    })
    setDraftName('')
    setDraftPrice('')
    setDraftUnit('kg')
    setDraftPhotoFile(null)
    setDraftPhotoPreview(null)
    setIsAddingProduct(false)
    await refreshCatalog()
  }

  async function handleDeleteProduct(productId: string) {
    await supabase.from('products').delete().eq('id', productId)
    await refreshCatalog()
  }

  if (myMerchant === undefined) {
    return (
      <PageShell>
        <div className="px-5 pt-8 text-center text-sm text-brand-dark/50">Chargement...</div>
      </PageShell>
    )
  }

  if (myMerchant === null) {
    return (
      <PageShell>
        <WovenHeader>
          <h1 className="text-xl font-bold">Espace marchand</h1>
        </WovenHeader>
        <div className="px-5 pt-8 text-center">
          <p className="text-3xl">🏪</p>
          <p className="mt-2 text-sm font-medium text-brand-dark">Tu n'as pas encore de marchand</p>
          <p className="mt-1 text-xs text-brand-dark/50">
            Crée ton profil marchand pour vendre tes produits sur Panier 241.
          </p>
          <Link to="/devenir-marchand" className="mt-4 inline-block">
            <Button>Devenir marchand</Button>
          </Link>
        </div>
      </PageShell>
    )
  }

  if (myMerchant.status !== 'approved') {
    const message =
      myMerchant.status === 'pending'
        ? "Ta demande est en cours de validation par l'équipe Panier 241. Reviens un peu plus tard."
        : 'Ton compte marchand a été suspendu. Contacte l\'administrateur pour plus d\'informations.'
    return (
      <PageShell>
        <WovenHeader>
          <h1 className="text-xl font-bold">{myMerchant.name}</h1>
        </WovenHeader>
        <div className="px-5 pt-8 text-center">
          <p className="text-3xl">{myMerchant.status === 'pending' ? '⏳' : '⛔'}</p>
          <p className="mt-2 text-sm font-medium text-brand-dark">
            {myMerchant.status === 'pending' ? 'En attente de validation' : 'Compte suspendu'}
          </p>
          <p className="mt-1 text-xs text-brand-dark/50">{message}</p>
        </div>
      </PageShell>
    )
  }

  const myProducts = getProductsForMerchant(myMerchant.id)

  return (
    <PageShell>
      <WovenHeader>
        <div className="flex items-center gap-3">
          <Link to="/profil" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">
            ←
          </Link>
          <div>
            <h1 className="text-xl font-bold">{myMerchant.name}</h1>
            <p className="text-sm text-white/80">Espace marchand</p>
          </div>
        </div>
      </WovenHeader>

      <div className="px-5 pt-5">
        <div className="mb-4 flex gap-2 rounded-pill bg-brand-light p-1">
          <button
            type="button"
            onClick={() => setTab('produits')}
            className={`flex-1 rounded-pill py-2 text-sm font-semibold transition ${
              tab === 'produits' ? 'bg-white text-brand shadow-card' : 'text-brand-dark/60'
            }`}
          >
            Mes produits
          </button>
          <button
            type="button"
            onClick={() => setTab('commandes')}
            className={`flex-1 rounded-pill py-2 text-sm font-semibold transition ${
              tab === 'commandes' ? 'bg-white text-brand shadow-card' : 'text-brand-dark/60'
            }`}
          >
            Commandes reçues {orders.length > 0 && `(${orders.length})`}
          </button>
        </div>

        {tab === 'produits' && (
          <div className="space-y-3 pb-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsAddingProduct((v) => !v)}
                className="text-xs font-semibold text-brand"
              >
                {isAddingProduct ? 'Annuler' : '+ Ajouter un produit'}
              </button>
            </div>

            {isAddingProduct && (
              <Card className="space-y-2">
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Nom du produit"
                  className={inputClass}
                />
                <select
                  value={draftCategory}
                  onChange={(e) => setDraftCategory(e.target.value as CategoryId)}
                  className={inputClass}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={draftPrice}
                    onChange={(e) => setDraftPrice(e.target.value)}
                    placeholder="Prix (F CFA)"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={draftUnit}
                    onChange={(e) => setDraftUnit(e.target.value)}
                    placeholder="Unité"
                    className={inputClass}
                  />
                </div>
                <div className="flex items-center gap-2">
                  {draftPhotoPreview && (
                    <img
                      src={draftPhotoPreview}
                      alt="Aperçu du produit"
                      className="h-10 w-10 shrink-0 rounded-2xl object-cover"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleDraftPhotoChange(e.target.files?.[0] ?? null)}
                    className="w-full text-xs text-brand-dark/70"
                  />
                </div>
                <Button
                  fullWidth
                  disabled={!draftName.trim() || !draftPrice.trim() || !draftUnit.trim()}
                  onClick={handleAddProduct}
                >
                  Ajouter
                </Button>
              </Card>
            )}

            {myProducts.length > 0 ? (
              myProducts.map((product) => (
                <Card key={product.id} className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-light text-xl">
                    {(() => {
                      const photo = resolveImage(product.imageUrl, product.category, pexelsPhotos)
                      return photo ? (
                        <img src={photo} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        product.imageEmoji
                      )
                    })()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-brand-dark">{product.name}</p>
                    <p className="text-xs text-brand-dark/50">
                      {formatFCFA(product.price)} / {product.unit}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(product.id)}
                    className="text-xs font-semibold text-category-poisson"
                  >
                    Supprimer
                  </button>
                </Card>
              ))
            ) : (
              <p className="text-center text-sm text-brand-dark/50">Aucun produit pour l'instant.</p>
            )}
          </div>
        )}

        {tab === 'commandes' && (
          <div className="space-y-3 pb-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => fetchOrders(myMerchant.id)}
                className="text-xs font-semibold text-brand"
              >
                {ordersLoading ? 'Rafraîchissement...' : 'Rafraîchir'}
              </button>
            </div>

            {orders.length > 0 ? (
              orders.map((order) => (
                <Card key={order.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-brand-dark/50">{order.slotLabel}</p>
                      <p className="text-xs text-brand-dark/50">{order.addressLabel}</p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-brand-dark/70">
                    {order.items.map((i) => `${i.quantity} ${i.productName}`).join(', ')}
                  </p>

                  {editingOrderId === order.id ? (
                    <div className="flex items-center gap-2 border-t border-brand-light pt-2">
                      <input
                        type="number"
                        min="0"
                        value={editedSubtotal}
                        onChange={(e) => setEditedSubtotal(e.target.value)}
                        placeholder="Sous-total réel (F CFA)"
                        className={inputClass}
                      />
                      <Button onClick={() => handleSaveAmount(order)}>Valider</Button>
                      <button
                        type="button"
                        onClick={() => setEditingOrderId(null)}
                        className="text-xs font-semibold text-brand-dark/50"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between border-t border-brand-light pt-2">
                      <div>
                        <span className="text-sm font-bold text-brand-dark">{formatFCFA(order.total)}</span>
                        {order.status !== 'livree' && (
                          <button
                            type="button"
                            onClick={() => startEditingAmount(order)}
                            className="ml-2 text-[11px] font-semibold text-brand"
                          >
                            Ajuster le montant réel
                          </button>
                        )}
                      </div>
                      {order.status === 'en_preparation' && (
                        <Button onClick={() => updateOrderStatus(order.id, 'en_livraison')}>
                          Marquer prête (inviter un livreur)
                        </Button>
                      )}
                      {order.status === 'en_livraison' && (
                        <Button variant="secondary" onClick={() => updateOrderStatus(order.id, 'livree')}>
                          Marquer livrée
                        </Button>
                      )}
                    </div>
                  )}
                  {order.livreurName && (
                    <p className="text-[11px] text-brand-dark/40">🛵 Livreur : {order.livreurName}</p>
                  )}
                  {order.shoppingVideoUrl && (
                    <a
                      href={order.shoppingVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[11px] font-semibold text-brand"
                    >
                      ▶️ Voir la vidéo de la liste de courses
                    </a>
                  )}
                </Card>
              ))
            ) : (
              <p className="text-center text-sm text-brand-dark/50">Aucune commande reçue pour l'instant.</p>
            )}
          </div>
        )}
      </div>
    </PageShell>
  )
}
