import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Order } from '../types'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'
import { readLocal, writeLocal } from '../lib/storage'

interface OrdersContextValue {
  orders: Order[]
  loading: boolean
  addOrder: (order: Order) => Promise<void>
  unseenCount: number
  markAllSeen: () => void
}

const OrdersContext = createContext<OrdersContextValue | null>(null)

interface OrderRow {
  id: string
  merchant_id: string
  merchant_name: string
  items: Order['items']
  subtotal: number
  delivery_fee: number
  total: number
  status: Order['status']
  slot_label: string
  address_label: string
  created_at: string
  livreur_id: string | null
  livreur_name: string | null
}

function fromRow(row: OrderRow): Order {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    merchantName: row.merchant_name,
    items: row.items,
    subtotal: row.subtotal,
    deliveryFee: row.delivery_fee,
    total: row.total,
    status: row.status,
    createdAt: row.created_at,
    slotLabel: row.slot_label,
    addressLabel: row.address_label,
    livreurId: row.livreur_id,
    livreurName: row.livreur_name,
  }
}

const ORDER_COLUMNS =
  'id, merchant_id, merchant_name, items, subtotal, delivery_fee, total, status, slot_label, address_label, created_at, livreur_id, livreur_name'

type SeenStatuses = Record<string, Order['status']>

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [seenStatuses, setSeenStatuses] = useState<SeenStatuses>({})
  const [loading, setLoading] = useState(true)

  const seenKey = user ? `notif-seen:${user.id}` : ''

  useEffect(() => {
    if (!user) return
    setSeenStatuses(readLocal(seenKey, {} as SeenStatuses))
    supabase
      .from('orders')
      .select(ORDER_COLUMNS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setOrders(data.map(fromRow))
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function addOrder(order: Order) {
    if (!user) return
    const { data } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        merchant_id: order.merchantId,
        merchant_name: order.merchantName,
        items: order.items,
        subtotal: order.subtotal,
        delivery_fee: order.deliveryFee,
        total: order.total,
        status: order.status,
        slot_label: order.slotLabel,
        address_label: order.addressLabel,
      })
      .select(ORDER_COLUMNS)
      .single()

    if (data) {
      const newOrder = fromRow(data)
      setOrders((prev) => [newOrder, ...prev])
      // La commande qu'on vient de creer soi-meme n'est pas une "nouveaute" a notifier.
      setSeenStatuses((prev) => {
        const next = { ...prev, [newOrder.id]: newOrder.status }
        writeLocal(seenKey, next)
        return next
      })
    }
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
    <OrdersContext.Provider value={{ orders, loading, addOrder, unseenCount, markAllSeen }}>
      {children}
    </OrdersContext.Provider>
  )
}

export function useOrders() {
  const ctx = useContext(OrdersContext)
  if (!ctx) throw new Error('useOrders doit être utilisé à l’intérieur de OrdersProvider')
  return ctx
}
