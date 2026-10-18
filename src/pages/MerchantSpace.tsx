import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import StatusBadge from '../components/ui/StatusBadge'
import ProductCategoryFields, { categoryErrorMessage } from '../components/merchant/ProductCategoryFields'
import ShopSectionsManager from '../components/merchant/ShopSectionsManager'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import { formatFCFA } from '../lib/format'
import { SERVICE_FEE_RATE } from '../lib/pricing'
import {
  ORDER_COLUMNS,
  PAYMENT_METHOD_LABELS,
  isBeforeDeparture,
  orderFromRow,
  translateDbError,
  type OrderRow,
} from '../lib/orderEngine'
import type { CategoryId, Merchant, Order, OrderStatus, PaymentMethodCode } from '../types'
import { ArrowLeft, Bike, Store, Hourglass, Ban, Play } from 'lucide-react'
import ProductPhoto from '../components/ui/ProductPhoto'

type Tab = 'produits' | 'commandes'

const inputClass =
  'w-full rounded-2xl bg-brand-light px-3 py-2.5 text-sm text-brand-dark placeholder:text-muted focus:outline-none'

export default function MerchantSpace() {
  const { user } = useAuth()
  const { getProductsForMerchant, refresh: refreshCatalog } = useCatalog()

  const [myMerchant, setMyMerchant] = useState<Merchant | null | undefined>(undefined)
  const [tab, setTab] = useState<Tab>('produits')

  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [editedSubtotal, setEditedSubtotal] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null)
  const [orderErrors, setOrderErrors] = useState<Record<string, string>>({})
  const [ordersError, setOrdersError] = useState<string | null>(null)

  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftCategory, setDraftCategory] = useState<CategoryId>('legumes')
  const [draftSubcategory, setDraftSubcategory] = useState<string | null>(null)
  const [productError, setProductError] = useState<string | null>(null)
  const [draftPrice, setDraftPrice] = useState('')
  const [draftUnit, setDraftUnit] = useState('kg')
  const [draftVariantLabel, setDraftVariantLabel] = useState('')
  const [draftPhotoFile, setDraftPhotoFile] = useState<File | null>(null)
  const [draftPhotoPreview, setDraftPhotoPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('merchants')
      .select('id, owner_id, name, market_id, categories, rating, review_count, address, banner_color, kiosk_photo_url, status, phone')
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
          bannerColor: data.banner_color,
          kioskPhotoUrl: data.kiosk_photo_url,
          status: data.status,
          phone: data.phone,
        })
      })
  }, [user])

  async function fetchOrders(merchantId: string) {
    setOrdersLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_COLUMNS)
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
    setOrdersError(error ? translateDbError(error) : null)
    if (data) setOrders((data as unknown as OrderRow[]).map(orderFromRow))
    setOrdersLoading(false)
  }

  useEffect(() => {
    if (myMerchant && myMerchant.status === 'approved') fetchOrders(myMerchant.id)
  }, [myMerchant])

  function setOrderError(orderId: string, message: string | null) {
    setOrderErrors((prev) => {
      const next = { ...prev }
      if (message) next[orderId] = message
      else delete next[orderId]
      return next
    })
  }

  function replaceOrder(row: unknown) {
    const updated = orderFromRow(row as OrderRow)
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
  }

  /** Changement de statut contrôlé par la base (machine à états de la migration 022). */
  async function updateOrderStatus(orderId: string, status: OrderStatus, reason?: string) {
    setBusyOrderId(orderId)
    setOrderError(orderId, null)
    const { data, error } = await supabase.rpc('set_order_status', {
      p_order_id: orderId,
      p_new_status: status,
      p_reason: reason ?? null,
    })
    setBusyOrderId(null)
    if (error || !data) {
      setOrderError(orderId, translateDbError(error))
      return false
    }
    replaceOrder(data)
    return true
  }

  async function handleCancelOrder(order: Order) {
    const reason = cancelReason.trim()
    if (!reason) {
      setOrderError(order.id, "Indiquez le motif de l'annulation (rupture, fermeture...).")
      return
    }
    if (await updateOrderStatus(order.id, 'annulee', reason)) {
      setCancellingOrderId(null)
      setCancelReason('')
    }
  }

  /** Encaissement hors ligne déclaré par le commerçant (solde d'un retrait ou acompte). */
  async function recordPayment(order: Order, part: 'solde' | 'acompte') {
    const method: PaymentMethodCode = order.paymentMethod ?? 'especes'
    setBusyOrderId(order.id)
    setOrderError(order.id, null)
    const { data, error } = await supabase.rpc('record_payment', {
      p_order_id: order.id,
      p_part: part,
      p_method: method,
    })
    setBusyOrderId(null)
    if (error || !data) {
      setOrderError(order.id, translateDbError(error))
      return
    }
    replaceOrder(data)
  }

  function startEditingAmount(order: Order) {
    setEditingOrderId(order.id)
    setEditedSubtotal(String(order.subtotal))
    setAdjustReason('')
    setOrderError(order.id, null)
  }

  /** Ajustement unique du montant réel (adjust_order_amount) : au-delà de +10 %, le client doit accepter. */
  async function handleSaveAmount(order: Order) {
    const newSubtotal = Math.round(Number(editedSubtotal))
    const reason = adjustReason.trim()
    if (!Number.isFinite(newSubtotal) || newSubtotal <= 0) {
      setOrderError(order.id, 'Indiquez un montant valide, en F CFA.')
      return
    }
    if (!reason) {
      setOrderError(order.id, "Le motif de l'ajustement est obligatoire.")
      return
    }
    setBusyOrderId(order.id)
    setOrderError(order.id, null)
    const { data, error } = await supabase.rpc('adjust_order_amount', {
      p_order_id: order.id,
      p_new_subtotal: newSubtotal,
      p_reason: reason,
    })
    setBusyOrderId(null)
    if (error || !data) {
      setOrderError(order.id, translateDbError(error))
      return
    }
    replaceOrder(data)
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

    setProductError(null)
    const { error: insertError } = await supabase.from('products').insert({
      merchant_id: myMerchant.id,
      name: draftName.trim(),
      category: draftCategory,
      // Colonne de 023 envoyée seulement si une sous-catégorie est choisie.
      ...(draftSubcategory ? { subcategory_id: draftSubcategory } : {}),
      price: Math.round(Number(draftPrice)),
      unit: draftUnit.trim(),
      image_url: imageUrl,
      variant_label: draftVariantLabel.trim() || null,
    })
    if (insertError) {
      // Publication bloquée : la saisie est conservée et l'erreur affichée.
      setProductError(categoryErrorMessage(insertError.message) ?? "Le produit n'a pas pu être ajouté. Réessaie.")
      return
    }
    setDraftSubcategory(null)
    setDraftName('')
    setDraftPrice('')
    setDraftUnit('kg')
    setDraftVariantLabel('')
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
        <div className="px-5 pt-8 text-center text-sm text-muted">Chargement...</div>
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
          <Store className="mx-auto h-9 w-9 text-brand-dark/30" />
          <p className="mt-2 text-sm font-medium text-brand-dark">Tu n'as pas encore de marchand</p>
          <p className="mt-1 text-xs text-muted">
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
          {myMerchant.status === 'pending' ? <Hourglass className="mx-auto h-9 w-9 text-brand-dark/30" /> : <Ban className="mx-auto h-9 w-9 text-category-poisson" />}
          <p className="mt-2 text-sm font-medium text-brand-dark">
            {myMerchant.status === 'pending' ? 'En attente de validation' : 'Compte suspendu'}
          </p>
          <p className="mt-1 text-xs text-muted">{message}</p>
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
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">{myMerchant.name}</h1>
            <p className="text-sm text-white/80">Espace marchand</p>
          </div>
        </div>
      </WovenHeader>

      <div className="px-5 pt-5">
        <div className="mb-4 flex gap-2 rounded-xl bg-brand-light p-1">
          <button
            type="button"
            onClick={() => setTab('produits')}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
              tab === 'produits' ? 'bg-white text-brand shadow-card' : 'text-muted'
            }`}
          >
            Mes produits
          </button>
          <button
            type="button"
            onClick={() => setTab('commandes')}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
              tab === 'commandes' ? 'bg-white text-brand shadow-card' : 'text-muted'
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
                <ProductCategoryFields
                  category={draftCategory}
                  subcategoryId={draftSubcategory}
                  onChange={(v) => {
                    setDraftCategory(v.category)
                    setDraftSubcategory(v.subcategoryId)
                  }}
                  idPrefix="ms-new"
                />
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
                <input
                  type="text"
                  value={draftVariantLabel}
                  onChange={(e) => setDraftVariantLabel(e.target.value)}
                  placeholder="Variante (ex: 12mm, 1kg, Rouge...) — optionnel"
                  className={inputClass}
                />
                <p className="text-xs text-muted">
                  Donne le même nom qu'un produit existant pour créer une variante supplémentaire.
                </p>
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
                {productError && <p role="alert" className="text-xs font-semibold text-danger">{productError}</p>}
              </Card>
            )}

            {myProducts.length > 0 ? (
              myProducts.map((product) => (
                <Card key={product.id} className="flex items-center gap-3">
                  <ProductPhoto product={product} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-brand-dark">
                      {product.name}
                      {product.variantLabel && (
                        <span className="ml-1 font-normal text-muted">· {product.variantLabel}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted">
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
              <p className="text-center text-sm text-muted">Aucun produit pour l'instant.</p>
            )}

            <ShopSectionsManager merchant={myMerchant} products={myProducts} />
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

            {ordersError && (
              <p role="alert" className="text-xs font-semibold text-danger">
                {ordersError}
              </p>
            )}
            {orders.length > 0 ? (
              orders.map((order) => (
                <Card key={order.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted">{order.slotLabel}</p>
                      <p className="text-xs text-muted">{order.addressLabel}</p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-brand-dark/70">
                    {order.items.map((i) => `${i.quantity} ${i.productName}`).join(', ')}
                  </p>

                  {order.fulfillmentMode === 'retrait' && (
                    <p className="text-[11px] font-semibold text-brand-dark">
                      <Store className="mr-1 inline h-3.5 w-3.5" />
                      Retrait sur stand : le client vient chercher la commande.
                    </p>
                  )}

                  {editingOrderId === order.id ? (
                    <div className="space-y-2 border-t border-brand-light pt-2">
                      <input
                        type="number"
                        min="1"
                        value={editedSubtotal}
                        onChange={(e) => setEditedSubtotal(e.target.value)}
                        placeholder="Montant réel des marchandises (F CFA)"
                        className={inputClass}
                      />
                      <input
                        type="text"
                        maxLength={300}
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        placeholder="Motif (obligatoire) : prix du jour, article manquant..."
                        className={inputClass}
                      />
                      <p className="text-[11px] text-muted">
                        Un seul ajustement possible. Jusqu'à {formatFCFA(Math.floor(order.subtotal * 1.1))} (+10 %), il
                        est appliqué directement ; au-delà, le client doit l'accepter. Une baisse est toujours
                        acceptée. Frais de service recalculés par la base ({Math.round(SERVICE_FEE_RATE * 100)} %).
                      </p>
                      <div className="flex items-center gap-2">
                        <Button onClick={() => handleSaveAmount(order)} disabled={busyOrderId === order.id}>
                          Valider
                        </Button>
                        <button
                          type="button"
                          onClick={() => setEditingOrderId(null)}
                          className="text-xs font-semibold text-muted"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 border-t border-brand-light pt-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-sm font-bold text-brand-dark">{formatFCFA(order.total)}</span>
                          {isBeforeDeparture(order.status) && order.adjustmentStatus === 'aucun' && (
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
                          <Button
                            disabled={busyOrderId === order.id || order.adjustmentStatus === 'en_attente'}
                            onClick={() =>
                              updateOrderStatus(
                                order.id,
                                order.fulfillmentMode === 'retrait' ? 'prete_a_retirer' : 'prete_a_livrer',
                              )
                            }
                          >
                            {order.fulfillmentMode === 'retrait' ? 'Marquer prête à retirer' : 'Marquer prête (inviter un livreur)'}
                          </Button>
                        )}
                        {order.status === 'prete_a_retirer' && (
                          <Button
                            disabled={busyOrderId === order.id || order.adjustmentStatus === 'en_attente'}
                            onClick={() => updateOrderStatus(order.id, 'retiree')}
                          >
                            Remise au client
                          </Button>
                        )}
                      </div>
                      {order.adjustmentStatus === 'en_attente' && order.proposedSubtotal != null && (
                        <p className="text-[11px] text-warn-ink">
                          Nouveau montant de {formatFCFA(order.proposedSubtotal)} en attente d'accord du client.
                        </p>
                      )}
                      {order.adjustmentStatus === 'refuse' && (
                        <p className="text-[11px] text-muted">Le client a refusé l'ajustement : montant initial conservé.</p>
                      )}
                      {order.status === 'prete_a_livrer' && (
                        <p className="text-[11px] text-muted">En attente d'un livreur. Seul le livreur marque la commande livrée.</p>
                      )}
                      {order.depositAmount > 0 && order.status !== 'annulee' && (
                        <div className="flex items-center justify-between text-[11px] text-brand-dark">
                          <span>
                            Acompte {formatFCFA(order.depositAmount)}
                            {order.depositStatus === 'encaisse' ? ' : reçu' : order.depositStatus === 'du' ? ' : dû' : ''}
                          </span>
                          {order.depositStatus === 'du' && (
                            <button
                              type="button"
                              disabled={busyOrderId === order.id}
                              onClick={() => recordPayment(order, 'acompte')}
                              className="font-semibold text-brand"
                            >
                              Acompte reçu
                            </button>
                          )}
                        </div>
                      )}
                      {order.fulfillmentMode === 'retrait' &&
                        (order.status === 'prete_a_retirer' || order.status === 'retiree') &&
                        order.paymentStatus !== 'encaisse' && (
                          <button
                            type="button"
                            disabled={busyOrderId === order.id}
                            onClick={() => recordPayment(order, 'solde')}
                            className="text-[11px] font-semibold text-brand"
                          >
                            Paiement reçu ({order.paymentMethod ? PAYMENT_METHOD_LABELS[order.paymentMethod] : 'Espèces'})
                          </button>
                        )}
                      {order.fulfillmentMode === 'retrait' && order.paymentStatus === 'encaisse' && (
                        <p className="text-[11px] text-muted">Paiement reçu.</p>
                      )}
                      {isBeforeDeparture(order.status) &&
                        (cancellingOrderId === order.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              maxLength={300}
                              value={cancelReason}
                              onChange={(e) => setCancelReason(e.target.value)}
                              placeholder="Motif de l'annulation (obligatoire)"
                              className={inputClass}
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                variant="danger"
                                disabled={busyOrderId === order.id}
                                onClick={() => handleCancelOrder(order)}
                              >
                                Confirmer l'annulation
                              </Button>
                              <button
                                type="button"
                                onClick={() => setCancellingOrderId(null)}
                                className="text-xs font-semibold text-muted"
                              >
                                Garder
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setCancellingOrderId(order.id)
                              setCancelReason('')
                            }}
                            className="text-[11px] font-semibold text-danger"
                          >
                            Annuler la commande
                          </button>
                        ))}
                    </div>
                  )}
                  {orderErrors[order.id] && (
                    <p role="alert" className="text-[11px] font-semibold text-danger">
                      {orderErrors[order.id]}
                    </p>
                  )}
                  {order.livreurName && (
                    <p className="text-[11px] text-muted"><Bike className="mr-1 inline h-3.5 w-3.5" />Livreur : {order.livreurName}</p>
                  )}
                  {order.shoppingVideoUrl && (
                    <a
                      href={order.shoppingVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[11px] font-semibold text-brand"
                    >
                      <Play className="mr-1 inline h-3 w-3" />Voir la vidéo de la liste de courses
                    </a>
                  )}
                </Card>
              ))
            ) : (
              <p className="text-center text-sm text-muted">Aucune commande reçue pour l'instant.</p>
            )}
          </div>
        )}
      </div>
    </PageShell>
  )
}
