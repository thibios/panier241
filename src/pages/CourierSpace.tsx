import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import StatusBadge from '../components/ui/StatusBadge'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { markets } from '../data/markets'
import { formatFCFA } from '../lib/format'
import {
  ORDER_COLUMNS,
  PAYMENT_METHOD_LABELS,
  orderFromRow,
  translateDbError,
  type OrderRow,
} from '../lib/orderEngine'
import type { Livreur, Order, OrderDeliveryDetails, OrderStatus, PaymentMethodCode } from '../types'
import { ArrowLeft, Bike, Hourglass, Ban, MapPin, Clock, Phone, Check, Navigation, Store } from 'lucide-react'

type Tab = 'disponibles' | 'mes_livraisons'

/** Course proposée (list_available_deliveries) : ni téléphone ni adresse complète du client. */
interface AvailableDelivery {
  orderId: string
  merchantName: string
  marketId: string | null
  pickupAddress: string | null
  deliveryArea: string
  distanceKm: number | null
  courierGain: number
  amountToCollect: number
  paymentMethod: PaymentMethodCode | null
  slotLabel: string
  itemCount: number
  createdAt: string
}

interface AvailableDeliveryRow {
  order_id: string
  merchant_name: string
  market_id: string | null
  pickup_address: string | null
  delivery_area: string
  distance_km: number | null
  courier_gain: number
  amount_to_collect: number
  payment_method: PaymentMethodCode | null
  slot_label: string
  item_count: number
  created_at: string
}

/** Course terminée ou en cours, vue dans l'historique (list_my_deliveries) : sans données du client. */
interface PastDelivery {
  orderId: string
  merchantName: string
  deliveryArea: string
  status: OrderStatus
  courierGain: number
  total: number
  paymentMethod: PaymentMethodCode | null
  paymentStatus: 'du' | 'encaisse' | null
  slotLabel: string
  createdAt: string
}

interface PastDeliveryRow {
  order_id: string
  merchant_name: string
  delivery_area: string
  status: OrderStatus
  courier_gain: number
  total: number
  payment_method: PaymentMethodCode | null
  payment_status: 'du' | 'encaisse' | null
  slot_label: string
  created_at: string
}

function mapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

export default function CourierSpace() {
  const { user } = useAuth()

  const [myLivreur, setMyLivreur] = useState<Livreur | null | undefined>(undefined)
  const [tab, setTab] = useState<Tab>('disponibles')
  const [marketFilter, setMarketFilter] = useState<string>('all')

  const [available, setAvailable] = useState<AvailableDelivery[]>([])
  const [missions, setMissions] = useState<Order[]>([])
  const [details, setDetails] = useState<Record<string, OrderDeliveryDetails>>({})
  const [history, setHistory] = useState<PastDelivery[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<AvailableDelivery | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const filteredAvailable =
    marketFilter === 'all' ? available : available.filter((o) => o.marketId === marketFilter)

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
    if (!myLivreur) return
    setLoading(true)
    const [availableRes, missionsRes, historyRes] = await Promise.all([
      supabase.rpc('list_available_deliveries'),
      // La base ne laisse lire au livreur que sa course en cours (téléphone et adresse compris).
      supabase.from('orders').select(ORDER_COLUMNS).eq('livreur_id', myLivreur.id).eq('status', 'en_livraison'),
      supabase.rpc('list_my_deliveries'),
    ])
    const firstError = availableRes.error ?? missionsRes.error ?? historyRes.error
    setError(firstError ? translateDbError(firstError) : null)

    if (availableRes.data) {
      setAvailable(
        (availableRes.data as AvailableDeliveryRow[]).map((r) => ({
          orderId: r.order_id,
          merchantName: r.merchant_name,
          marketId: r.market_id,
          pickupAddress: r.pickup_address,
          deliveryArea: r.delivery_area,
          distanceKm: r.distance_km,
          courierGain: r.courier_gain,
          amountToCollect: r.amount_to_collect,
          paymentMethod: r.payment_method,
          slotLabel: r.slot_label,
          itemCount: r.item_count,
          createdAt: r.created_at,
        })),
      )
    }
    const currentMissions = missionsRes.data ? (missionsRes.data as unknown as OrderRow[]).map(orderFromRow) : []
    setMissions(currentMissions)
    if (historyRes.data) {
      setHistory(
        (historyRes.data as PastDeliveryRow[])
          .filter((r) => r.status !== 'en_livraison')
          .map((r) => ({
            orderId: r.order_id,
            merchantName: r.merchant_name,
            deliveryArea: r.delivery_area,
            status: r.status,
            courierGain: r.courier_gain,
            total: r.total,
            paymentMethod: r.payment_method,
            paymentStatus: r.payment_status,
            slotLabel: r.slot_label,
            createdAt: r.created_at,
          })),
      )
    }

    if (currentMissions.length > 0) {
      const { data: detailRows } = await supabase
        .from('order_delivery_details')
        .select('order_id, full_address, landmark, lat, lng')
        .in(
          'order_id',
          currentMissions.map((m) => m.id),
        )
      const next: Record<string, OrderDeliveryDetails> = {}
      for (const d of detailRows ?? []) {
        next[d.order_id] = {
          orderId: d.order_id,
          fullAddress: d.full_address,
          landmark: d.landmark,
          lat: d.lat,
          lng: d.lng,
        }
      }
      setDetails(next)
    } else {
      setDetails({})
    }
    setLoading(false)
  }

  useEffect(() => {
    if (myLivreur && myLivreur.status === 'approved') fetchOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myLivreur])

  async function acceptDelivery(orderId: string) {
    setBusyId(orderId)
    const { error: rpcError } = await supabase.rpc('set_order_status', {
      p_order_id: orderId,
      p_new_status: 'en_livraison',
    })
    setBusyId(null)
    if (rpcError) {
      // Course prise entre-temps par un autre livreur, ajustement en attente, compte suspendu...
      setError(translateDbError(rpcError))
      await fetchOrders()
      return
    }
    setViewing(null)
    setTab('mes_livraisons')
    await fetchOrders()
  }

  async function markDelivered(orderId: string) {
    setBusyId(orderId)
    const { error: rpcError } = await supabase.rpc('set_order_status', {
      p_order_id: orderId,
      p_new_status: 'livree',
    })
    setBusyId(null)
    if (rpcError) {
      setError(translateDbError(rpcError))
      return
    }
    await fetchOrders()
  }

  async function recordPayment(orderId: string, method: PaymentMethodCode | null) {
    setBusyId(orderId)
    const { error: rpcError } = await supabase.rpc('record_payment', {
      p_order_id: orderId,
      p_part: 'solde',
      p_method: method ?? 'especes',
    })
    setBusyId(null)
    if (rpcError) {
      setError(translateDbError(rpcError))
      return
    }
    await fetchOrders()
  }

  if (myLivreur === undefined) {
    return (
      <PageShell>
        <div className="px-5 pt-8 text-center text-sm text-muted">Chargement...</div>
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
          <Bike className="mx-auto h-9 w-9 text-brand-dark/30" />
          <p className="mt-2 text-sm font-medium text-brand-dark">Tu n'as pas encore de profil livreur</p>
          <p className="mt-1 text-xs text-muted">
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
          {myLivreur.status === 'pending' ? <Hourglass className="mx-auto h-9 w-9 text-brand-dark/30" /> : <Ban className="mx-auto h-9 w-9 text-category-poisson" />}
          <p className="mt-2 text-sm font-medium text-brand-dark">
            {myLivreur.status === 'pending' ? 'En attente de validation' : 'Compte suspendu'}
          </p>
          <p className="mt-1 text-xs text-muted">{message}</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <WovenHeader>
        <div className="flex items-center gap-3">
          <Link to="/profil" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">{myLivreur.name}</h1>
            <p className="text-sm text-white/80">Espace livreur · {myLivreur.vehicle}</p>
          </div>
        </div>
      </WovenHeader>

      <div className="px-5 pt-5">
        {error && (
          <p role="alert" className="mb-3 text-xs font-semibold text-danger">
            {error}
          </p>
        )}
        {viewing ? (
          <div className="space-y-3 pb-4">
            <button type="button" onClick={() => setViewing(null)} className="text-xs font-semibold text-brand">
              <ArrowLeft className="inline h-4 w-4" /> Retour
            </button>

            <Card className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted">Lieu de retrait</p>
                <p className="text-sm font-semibold text-brand-dark">{viewing.merchantName}</p>
                {viewing.pickupAddress && <p className="text-xs text-muted">{viewing.pickupAddress}</p>}
              </div>
              <div className="border-t border-brand-light pt-2">
                <p className="text-xs font-semibold text-muted">Zone de livraison</p>
                <p className="text-sm text-brand-dark/70">
                  <MapPin className="mr-1 inline h-3.5 w-3.5" />
                  {viewing.deliveryArea}
                  {viewing.distanceKm != null ? ` · ${viewing.distanceKm} km` : ''}
                </p>
                <p className="mt-1 text-sm text-brand-dark/70">
                  <Clock className="mr-1 inline h-3.5 w-3.5" />
                  {viewing.slotLabel}
                </p>
                <p className="mt-1 text-xs text-muted">
                  L'adresse complète, le point de repère et le téléphone du client s'affichent une fois la course acceptée.
                </p>
              </div>
              <div className="space-y-1 border-t border-brand-light pt-2 text-sm text-brand-dark">
                <p>
                  Votre gain : <span className="font-bold">{formatFCFA(viewing.courierGain)}</span>
                </p>
                <p>
                  À encaisser auprès du client : <span className="font-bold">{formatFCFA(viewing.amountToCollect)}</span>
                  {viewing.paymentMethod ? ` (${PAYMENT_METHOD_LABELS[viewing.paymentMethod]})` : ''}
                </p>
                <p className="text-xs text-muted">
                  {viewing.itemCount} article{viewing.itemCount > 1 ? 's' : ''}
                </p>
              </div>
              <Button
                fullWidth
                disabled={busyId === viewing.orderId}
                onClick={() => acceptDelivery(viewing.orderId)}
              >
                {busyId === viewing.orderId ? 'Acceptation...' : 'Accepter cette livraison'}
              </Button>
            </Card>
          </div>
        ) : (
          <>
            <div className="mb-4 flex gap-2 rounded-xl bg-brand-light p-1">
              <button
                type="button"
                onClick={() => setTab('disponibles')}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
                  tab === 'disponibles' ? 'bg-white text-brand shadow-card' : 'text-muted'
                }`}
              >
                Disponibles {available.length > 0 && `(${available.length})`}
              </button>
              <button
                type="button"
                onClick={() => setTab('mes_livraisons')}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
                  tab === 'mes_livraisons' ? 'bg-white text-brand shadow-card' : 'text-muted'
                }`}
              >
                Mes livraisons {missions.length > 0 && `(${missions.length})`}
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

                {filteredAvailable.length > 0 ? (
                  filteredAvailable.map((order) => (
                    <Card key={order.orderId} className="space-y-2">
                      <p className="text-sm font-semibold text-brand-dark">{order.merchantName}</p>
                      <p className="text-xs text-muted">
                        <MapPin className="mr-1 inline h-3.5 w-3.5" />
                        {order.deliveryArea}
                        {order.distanceKm != null ? ` · ${order.distanceKm} km` : ''}
                      </p>
                      <p className="text-xs text-muted">
                        <Clock className="mr-1 inline h-3.5 w-3.5" />
                        {order.slotLabel}
                      </p>
                      <div className="flex items-center justify-between border-t border-brand-light pt-2">
                        <span className="text-sm font-bold text-brand-dark">Gain {formatFCFA(order.courierGain)}</span>
                        <Button onClick={() => setViewing(order)}>Voir le détail</Button>
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-center text-sm text-muted">Aucune livraison disponible pour l'instant.</p>
                )}
              </div>
            )}

            {tab === 'mes_livraisons' && (
              <div className="space-y-3 pb-4">
                {missions.length > 0 ? (
                  missions.map((order) => {
                    const d = details[order.id]
                    return (
                      <Card key={order.id} className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-brand-dark">{order.merchantName}</p>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="text-xs text-muted">
                          {order.items.map((i) => `${i.quantity} ${i.productName}`).join(', ')}
                        </p>
                        <div className="space-y-1 border-t border-brand-light pt-2 text-xs text-brand-dark/80">
                          <p className="font-semibold text-muted">Adresse de livraison</p>
                          <p>
                            <MapPin className="mr-1 inline h-3.5 w-3.5" />
                            {d?.fullAddress ?? order.addressLabel}
                          </p>
                          {d?.landmark && <p>Repère : {d.landmark}</p>}
                          {d?.lat != null && d?.lng != null ? (
                            <a
                              href={mapsLink(d.lat, d.lng)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-brand"
                            >
                              <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                              Ouvrir la position GPS dans une carte
                            </a>
                          ) : (
                            <p className="text-muted">Pas de position GPS : appelez le client si besoin.</p>
                          )}
                        </div>
                        {order.clientPhone && (
                          <a href={`tel:${order.clientPhone}`} className="inline-block">
                            <Button variant="secondary">
                              <Phone className="mr-1.5 inline h-4 w-4" />
                              Appeler le client
                            </Button>
                          </a>
                        )}
                        <div className="space-y-2 border-t border-brand-light pt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-brand-dark">
                              À encaisser {formatFCFA(order.total - (order.depositStatus === 'encaisse' ? order.depositAmount : 0))}
                            </span>
                            <Button disabled={busyId === order.id} onClick={() => markDelivered(order.id)}>
                              Marquer livrée
                            </Button>
                          </div>
                          {order.paymentStatus !== 'encaisse' ? (
                            <button
                              type="button"
                              disabled={busyId === order.id}
                              onClick={() => recordPayment(order.id, order.paymentMethod)}
                              className="text-[11px] font-semibold text-brand"
                            >
                              Paiement reçu
                              {order.paymentMethod ? ` (${PAYMENT_METHOD_LABELS[order.paymentMethod]})` : ''}
                            </button>
                          ) : (
                            <p className="text-[11px] text-muted">Paiement reçu.</p>
                          )}
                        </div>
                      </Card>
                    )
                  })
                ) : (
                  <p className="text-center text-sm text-muted">Aucune course en cours.</p>
                )}

                {history.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Courses passées</p>
                    {history.map((h) => (
                      <Card key={h.orderId} className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-brand-dark">
                            <Store className="mr-1 inline h-3.5 w-3.5" />
                            {h.merchantName}
                          </p>
                          {h.status === 'livree' ? (
                            <span className="text-xs font-semibold text-category-legumes">
                              Livrée <Check className="inline h-3.5 w-3.5" />
                            </span>
                          ) : (
                            <StatusBadge status={h.status} />
                          )}
                        </div>
                        <p className="text-xs text-muted">{h.deliveryArea}</p>
                        <p className="text-xs text-brand-dark">
                          Gain {formatFCFA(h.courierGain)} · Total {formatFCFA(h.total)}
                        </p>
                        {h.status === 'livree' && h.paymentStatus !== 'encaisse' && (
                          <button
                            type="button"
                            disabled={busyId === h.orderId}
                            onClick={() => recordPayment(h.orderId, h.paymentMethod)}
                            className="text-[11px] font-semibold text-brand"
                          >
                            Déclarer le paiement reçu
                          </button>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-muted">
                  Une fois la course livrée, l'adresse et le téléphone du client ne sont plus affichés.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  )
}
