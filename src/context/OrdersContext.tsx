import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { FulfillmentMode, Order, PaymentMethodCode } from '../types'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'
import { readLocal, writeLocal } from '../lib/storage'
import {
  ORDER_COLUMNS,
  historyFromRow,
  orderFromRow,
  translateDbError,
  type OrderHistoryEntry,
  type OrderHistoryRow,
  type OrderRow,
} from '../lib/orderEngine'

/** Paramètres envoyés à create_order : seuls les identifiants et quantités, jamais les prix. */
export interface PlaceOrderInput {
  requestId: string
  merchantId: string
  items: { productId: string; quantity: number }[]
  mode: FulfillmentMode
  slotLabel: string
  phone: string
  paymentMethod: PaymentMethodCode
  address?: string | null
  lat?: number | null
  lng?: number | null
  landmark?: string | null
  addressLabel?: string | null
  shoppingVideoUrl?: string | null
}

type Result<T> = { data: T; error: null } | { data: null; error: string }

interface OrdersContextValue {
  orders: Order[]
  loading: boolean
  /** Crée la commande par la base ; le montant renvoyé est le montant final. */
  placeOrder: (input: PlaceOrderInput) => Promise<Result<Order>>
  cancelOrder: (orderId: string, reason: string) => Promise<{ error: string | null }>
  respondToAdjustment: (orderId: string, accept: boolean) => Promise<{ error: string | null }>
  fetchHistory: (orderId: string) => Promise<Result<OrderHistoryEntry[]>>
  refresh: () => Promise<void>
  unseenCount: number
  markAllSeen: () => void
}

const OrdersContext = createContext<OrdersContextValue | null>(null)

type SeenStatuses = Record<string, Order['status']>

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [seenStatuses, setSeenStatuses] = useState<SeenStatuses>({})
  const [loading, setLoading] = useState(true)

  const seenKey = user ? `notif-seen:${user.id}` : ''

  async function loadOrders() {
    if (!user) return
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_COLUMNS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) console.error('Chargement des commandes impossible :', error.message)
    if (data) setOrders((data as unknown as OrderRow[]).map(orderFromRow))
    setLoading(false)
  }

  useEffect(() => {
    if (!user) return
    setSeenStatuses(readLocal(seenKey, {} as SeenStatuses))
    void loadOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  function upsertLocal(order: Order) {
    setOrders((prev) => {
      const exists = prev.some((o) => o.id === order.id)
      return exists ? prev.map((o) => (o.id === order.id ? order : o)) : [order, ...prev]
    })
    setSeenStatuses((prev) => {
      const next = { ...prev, [order.id]: order.status }
      writeLocal(seenKey, next)
      return next
    })
  }

  async function placeOrder(input: PlaceOrderInput): Promise<Result<Order>> {
    if (!user) return { data: null, error: 'Connectez-vous pour passer commande.' }
    const { data, error } = await supabase.rpc('create_order', {
      p_client_request_id: input.requestId,
      p_merchant_id: input.merchantId,
      p_items: input.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
      p_mode: input.mode,
      p_slot_label: input.slotLabel,
      p_phone: input.phone,
      p_payment_method: input.paymentMethod,
      p_address: input.mode === 'livraison' ? input.address ?? null : null,
      p_lat: input.mode === 'livraison' ? input.lat ?? null : null,
      p_lng: input.mode === 'livraison' ? input.lng ?? null : null,
      p_landmark: input.mode === 'livraison' ? input.landmark ?? null : null,
      p_address_label: input.mode === 'livraison' ? input.addressLabel ?? null : null,
      p_shopping_video_url: input.shoppingVideoUrl ?? null,
    })
    if (error || !data) return { data: null, error: translateDbError(error) }
    const order = orderFromRow(data as unknown as OrderRow)
    upsertLocal(order)
    return { data: order, error: null }
  }

  /** Annulation par le client (motif obligatoire, vérifiée par la base). */
  async function cancelOrder(orderId: string, reason: string) {
    const { data, error } = await supabase.rpc('set_order_status', {
      p_order_id: orderId,
      p_new_status: 'annulee',
      p_reason: reason.slice(0, 300),
    })
    if (error || !data) return { error: translateDbError(error) }
    upsertLocal(orderFromRow(data as unknown as OrderRow))
    return { error: null }
  }

  async function respondToAdjustment(orderId: string, accept: boolean) {
    const { data, error } = await supabase.rpc('respond_to_adjustment', { p_order_id: orderId, p_accept: accept })
    if (error || !data) return { error: translateDbError(error) }
    upsertLocal(orderFromRow(data as unknown as OrderRow))
    return { error: null }
  }

  async function fetchHistory(orderId: string): Promise<Result<OrderHistoryEntry[]>> {
    const { data, error } = await supabase
      .from('order_status_history')
      .select('id, old_status, new_status, actor_role, event, reason, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
    if (error) return { data: null, error: translateDbError(error) }
    return { data: (data as OrderHistoryRow[]).map(historyFromRow), error: null }
  }

  const unseenCount = useMemo(
    () => orders.filter((o) => seenStatuses[o.id] !== o.status).length,
    [orders, seenStatuses],
  )

  function markAllSeen() {
    const next: SeenStatuses = {}
    for (const o of orders) next[o.id] = o.status
    setSeenStatuses(next)
    writeLocal(seenKey, next)
  }

  return (
    <OrdersContext.Provider
      value={{
        orders,
        loading,
        placeOrder,
        cancelOrder,
        respondToAdjustment,
        fetchHistory,
        refresh: loadOrders,
        unseenCount,
        markAllSeen,
      }}
    >
      {children}
    </OrdersContext.Provider>
  )
}

export function useOrders() {
  const ctx = useContext(OrdersContext)
  if (!ctx) throw new Error('useOrders doit être utilisé à l’intérieur de OrdersProvider')
  return ctx
}
