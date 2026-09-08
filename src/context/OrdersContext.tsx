import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Order, OrderStatus } from '../types'

interface OrdersContextValue {
  orders: Order[]
  addOrder: (order: Order) => void
  advanceStatus: (orderId: string) => void
}

const OrdersContext = createContext<OrdersContextValue | null>(null)

const statusSequence: OrderStatus[] = ['en_preparation', 'en_livraison', 'livree']

const seedOrders: Order[] = [
  {
    id: 'ord-seed-1',
    merchantId: 'mch-poissonnerie-nkembo',
    merchantName: 'Poissonnerie de Nkembo',
    items: [
      { productId: 'prd-machoiron', productName: 'Machoiron fumé', quantity: 2, unitPrice: 3500, unit: 'kg' },
      { productId: 'prd-crevette', productName: 'Crevettes fraîches', quantity: 1, unitPrice: 4500, unit: 'kg' },
    ],
    subtotal: 11500,
    deliveryFee: 1500,
    total: 13000,
    status: 'en_livraison',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    slotLabel: "Aujourd'hui · Après-midi (12h00 - 15h00)",
    addressLabel: 'Domicile · Louis, Libreville',
  },
  {
    id: 'ord-seed-2',
    merchantId: 'mch-maman-adjoua',
    merchantName: 'Chez Maman Adjoua',
    items: [
      { productId: 'prd-tomate', productName: 'Tomates fraîches', quantity: 2, unitPrice: 1500, unit: 'kg' },
      { productId: 'prd-banane-plantain', productName: 'Bananes plantain', quantity: 1, unitPrice: 2000, unit: 'régime' },
    ],
    subtotal: 5000,
    deliveryFee: 1500,
    total: 6500,
    status: 'livree',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    slotLabel: 'Lun. 2 sept. · Matin (8h00 - 11h00)',
    addressLabel: 'Domicile · Louis, Libreville',
  },
  {
    id: 'ord-seed-3',
    merchantId: 'mch-epicerie-akebe',
    merchantName: 'Épicerie Traditionnelle Akébé',
    items: [
      { productId: 'prd-riz', productName: 'Riz local', quantity: 5, unitPrice: 800, unit: 'kg' },
      { productId: 'prd-arachide', productName: 'Pâte d’arachide', quantity: 1, unitPrice: 2500, unit: 'pot' },
    ],
    subtotal: 6500,
    deliveryFee: 1500,
    total: 8000,
    status: 'livree',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
    slotLabel: 'Mar. 27 août · Soir (16h00 - 19h00)',
    addressLabel: 'Bureau · Batterie IV, Libreville',
  },
]

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(seedOrders)

  function addOrder(order: Order) {
    setOrders((prev) => [order, ...prev])
  }

  function advanceStatus(orderId: string) {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order
        const currentIndex = statusSequence.indexOf(order.status)
        const nextStatus = statusSequence[Math.min(currentIndex + 1, statusSequence.length - 1)]
        return { ...order, status: nextStatus }
      }),
    )
  }

  return <OrdersContext.Provider value={{ orders, addOrder, advanceStatus }}>{children}</OrdersContext.Provider>
}

export function useOrders() {
  const ctx = useContext(OrdersContext)
  if (!ctx) throw new Error('useOrders doit être utilisé à l’intérieur de OrdersProvider')
  return ctx
}
