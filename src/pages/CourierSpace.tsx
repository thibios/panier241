import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import { markets } from '../data/markets'
import { formatFCFA } from '../lib/format'
import type { Livreur, Order } from '../types'

type Tab = 'disponibles' | 'mes_livraisons'

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
  status: Order['status']
  slot_label: string
  address_label: string
  created_at: string
  livreur_id: string | null
  livreur_name: string | null
  livreur_phone: string | null
  shopping_video_url: string | null
  client_phone: string | null
}

const ORDER_COLUMNS =
  'id, merchant_id, merchant_name, items, subtotal, service_fee, delivery_fee, distance_km, total, status, slot_label, address_label, created_at, livreur_id, livreur_name, livreur_phone, shopping_video_url, client_phone'

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

export default function CourierSpace() {
  const { user } = useAuth()
  const { merchants } = useCatalog()

  const [myLivreur, setMyLivreur] = useState<Livreur | null | undefined>(undefined)
  const [tab, setTab] = useState<Tab>('disponibles')
  const [marketFilter, setMarketFilter] = useState<string>('all')

  const [availableOrders, setAvailableOrders] = useState<Order[]>([])
  const [myDeliveries, setMyDeliveries] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)

  function marketIdForOrder(order: Order) {
    return merchants.find((m) => m.id === order.merchantId)?.marketId
  }

  const filteredAvailableOrders =
    marketFilter === 'all' ? availableOrders : availableOrders.filter((o) => marketIdForOrder(o) === marketFilter)

  useEffect(() => {
    if (!user) return
    supabase
      .from('livreurs')
      .select('id, owner_id, name, phone, vehicle, status')
      .eq('owner_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setMyLivreur(null)
          return
        }
        setMyLivreur({
          id: data.id,
          ownerId: data.owner_id,
          name: data.name,
          phone: data.phone,
          vehicle: data.vehicle,
          status: data.status,
        })
      })
  }, [user])

  async function fetchOrders() {
    setLoading(true)
    const [availableRes, mineRes] = await Promise.all([
      supabase.from('orders').select(ORDER_COLUMNS).eq('status', 'en_livraison').is('livreur_id', null),
      supabase.from('orders').select(ORDER_COLUMNS).not('livreur_id', 'is', null).order('created_at', { ascending: false }),
    ])
    if (availableRes.data) setAvailableOrders(availableRes.data.map(orderFromRow))
    if (mineRes.data) setMyDeliveries(mineRes.data.map(orderFromRow))
    setLoading(false)
  }

  useEffect(() => {
    if (myLivreur && myLivreur.status === 'approved') fetchOrders()
  }, [myLivreur])

  async function acceptDelivery(orderId: string) {
    if (!myLivreur) return
    setIsAccepting(true)
    await supabase
      .from('orders')
      .update({ livreur_id: myLivreur.id, livreur_name: myLivreur.name, livreur_phone: myLivreur.phone })
      .eq('id', orderId)
    await fetchOrders()
    setIsAccepting(false)
    setViewingOrder(null)
    setTab('mes_livraisons')
  }

  async function markDelivered(orderId: string) {
    await supabase.from('orders').update({ status: 'livree' }).eq('id', orderId)
    await fetchOrders()
  }

  if (myLivreur === undefined) {
    return (
      <PageShell>
        <div className="px-5 pt-8 text-center text-sm text-brand-dark/50">Chargement...</div>
      </PageShell>
    )
  }

  if (myLivreur === null) {
    return (
      <PageShell>
        <WovenHeader>
          <h1 className="text-xl font-bold">Espace livreur</h1>
        </WovenHeader>
        <div className="px-5 pt-8 text-center">
          <p className="text-3xl">🛵</p>
          <p className="mt-2 text-sm font-medium text-brand-dark">Tu n'as pas encore de profil livreur</p>
          <p className="mt-1 text-xs text-brand-dark/50">
            Crée ton profil pour accepter des livraisons sur Panier 241.
          </p>
          <Link to="/devenir-livreur" className="mt-4 inline-block">
            <Button>Devenir livreur</Button>
          </Link>
        </div>
      </PageShell>
    )
  }

  if (myLivreur.status !== 'approved') {
    const message =
      myLivreur.status === 'pending'
        ? "Ta demande est en cours de validation par l'équipe Panier 241. Reviens un peu plus tard."
        : 'Ton compte livreur a été suspendu. Contacte l\'administrateur pour plus d\'informations.'
    return (
      <PageShell>
        <WovenHeader>
          <h1 className="text-xl font-bold">{myLivreur.name}</h1>
        </WovenHeader>
        <div className="px-5 pt-8 text-center">
          <p className="text-3xl">{myLivreur.status === 'pending' ? '⏳' : '⛔'}</p>
          <p className="mt-2 text-sm font-medium text-brand-dark">
            {myLivreur.status === 'pending' ? 'En attente de validation' : 'Compte suspendu'}
          </p>
          <p className="mt-1 text-xs text-brand-dark/50">{message}</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <WovenHeader>
        <div className="flex items-center gap-3">
          <Link to="/profil" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">
            ←
          </Link>
          <div>
            <h1 className="text-xl font-bold">{myLivreur.name}</h1>
            <p className="text-sm text-white/80">Espace livreur · {myLivreur.vehicle}</p>
          </div>
        </div>
      </WovenHeader>

      <div className="px-5 pt-5">
        {viewingOrder ? (
          <div className="space-y-3 pb-4">
            <button
              type="button"
              onClick={() => setViewingOrder(null)}
              className="text-xs font-semibold text-brand"
            >
              ← Retour
            </button>

            <Card className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-brand-dark/50">Marchand</p>
                <p className="text-sm font-semibold text-brand-dark">{viewingOrder.merchantName}</p>
              </div>

              <div className="border-t border-brand-light pt-2">
                <p className="text-xs font-semibold text-brand-dark/50">Articles</p>
                <ul className="mt-1 space-y-0.5 text-sm text-brand-dark/70">
                  {viewingOrder.items.map((i) => (
                    <li key={i.productId}>
                      {i.quantity} {i.productName} ({i.unit})
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-brand-light pt-2">
                <p className="text-xs font-semibold text-brand-dark/50">Adresse de livraison</p>
                <p className="text-sm text-brand-dark/70">📍 {viewingOrder.addressLabel}</p>
                <p className="mt-1 text-sm text-brand-dark/70">🕒 {viewingOrder.slotLabel}</p>
              </div>

              <div className="border-t border-brand-light pt-2">
                <p className="text-xs font-semibold text-brand-dark/50">Client</p>
                {viewingOrder.clientPhone ? (
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm text-brand-dark/70">{viewingOrder.clientPhone}</span>
                    <a href={`tel:${viewingOrder.clientPhone}`}>
                      <Button variant="secondary">📞 Appeler</Button>
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-brand-dark/40">Numéro non renseigné.</p>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-brand-light pt-2">
                <span className="text-sm font-bold text-brand-dark">{formatFCFA(viewingOrder.total)}</span>
                <Button disabled={isAccepting} onClick={() => acceptDelivery(viewingOrder.id)}>
                  {isAccepting ? 'Acceptation...' : 'Accepter cette livraison'}
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <>
            <div className="mb-4 flex gap-2 rounded-pill bg-brand-light p-1">
              <button
                type="button"
                onClick={() => setTab('disponibles')}
                className={`flex-1 rounded-pill py-2 text-sm font-semibold transition ${
                  tab === 'disponibles' ? 'bg-white text-brand shadow-card' : 'text-brand-dark/60'
                }`}
              >
                Disponibles {availableOrders.length > 0 && `(${availableOrders.length})`}
              </button>
              <button
                type="button"
                onClick={() => setTab('mes_livraisons')}
                className={`flex-1 rounded-pill py-2 text-sm font-semibold transition ${
                  tab === 'mes_livraisons' ? 'bg-white text-brand shadow-card' : 'text-brand-dark/60'
                }`}
              >
                Mes livraisons {myDeliveries.length > 0 && `(${myDeliveries.length})`}
              </button>
            </div>

            <div className="mb-3 flex justify-end">
              <button type="button" onClick={fetchOrders} className="text-xs font-semibold text-brand">
                {loading ? 'Rafraîchissement...' : 'Rafraîchir'}
              </button>
            </div>

            {tab === 'disponibles' && (
              <div className="space-y-3 pb-4">
                <select
                  value={marketFilter}
                  onChange={(e) => setMarketFilter(e.target.value)}
                  className="w-full rounded-2xl bg-brand-light px-3 py-2.5 text-sm text-brand-dark focus:outline-none"
                >
                  <option value="all">Tous les marchés</option>
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>

                {filteredAvailableOrders.length > 0 ? (
                  filteredAvailableOrders.map((order) => (
                    <Card key={order.id} className="space-y-2">
                      <p className="text-sm font-semibold text-brand-dark">{order.merchantName}</p>
                      <p className="text-xs text-brand-dark/60">
                        {order.items.map((i) => `${i.quantity} ${i.productName}`).join(', ')}
                      </p>
                      <p className="text-xs text-brand-dark/50">📍 {order.addressLabel}</p>
                      <p className="text-xs text-brand-dark/50">🕒 {order.slotLabel}</p>
                      <div className="flex items-center justify-between border-t border-brand-light pt-2">
                        <span className="text-sm font-bold text-brand-dark">{formatFCFA(order.total)}</span>
                        <Button onClick={() => setViewingOrder(order)}>Voir le détail</Button>
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-center text-sm text-brand-dark/50">Aucune livraison disponible pour l'instant.</p>
                )}
              </div>
            )}

            {tab === 'mes_livraisons' && (
              <div className="space-y-3 pb-4">
                {myDeliveries.length > 0 ? (
                  myDeliveries.map((order) => (
                    <Card key={order.id} className="space-y-2">
                      <p className="text-sm font-semibold text-brand-dark">{order.merchantName}</p>
                      <p className="text-xs text-brand-dark/60">
                        {order.items.map((i) => `${i.quantity} ${i.productName}`).join(', ')}
                      </p>
                      <p className="text-xs text-brand-dark/50">📍 {order.addressLabel}</p>
                      <div className="flex items-center justify-between border-t border-brand-light pt-2">
                        <span className="text-sm font-bold text-brand-dark">{formatFCFA(order.total)}</span>
                        {order.status === 'en_livraison' ? (
                          <Button onClick={() => markDelivered(order.id)}>Marquer livrée</Button>
                        ) : (
                          <span className="text-xs font-semibold text-category-legumes">Livrée ✓</span>
                        )}
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-center text-sm text-brand-dark/50">Aucune livraison acceptée pour l'instant.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  )
}
