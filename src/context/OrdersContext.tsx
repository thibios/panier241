import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Order } from '../types'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

interface OrdersContextValue {
  orders: Order[]
  addOrder: (order: Order) => Promise<void>
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
  }
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    if (!user) return
    supabase
      .from('orders')
      .select('id, merchant_id, merchant_name, items, subtotal, delivery_fee, total, status, slot_label, address_label, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setOrders(data.map(fromRow))
      })
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
      .select('id, merchant_id, merchant_name, items, subtotal, delivery_fee, total, status, slot_label, address_label, created_at')
      .single()

    if (data) setOrders((prev) => [fromRow(data), ...prev])
  }

  return <OrdersContext.Provider value={{ orders, addOrder }}>{children}</OrdersContext.Provider>
}

export function useOrders() {
  const ctx = useContext(OrdersContext)
  if (!ctx) throw new Error('useOrders doit être utilisé à l’intérieur de OrdersProvider')
  return ctx
}
