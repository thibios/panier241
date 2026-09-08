import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { CartItem, DeliverySlotOption } from '../types'
import { products } from '../data/products'
import { merchants } from '../data/merchants'
import { addresses } from '../data/addresses'

interface CartContextValue {
  items: CartItem[]
  merchantId: string | null
  selectedSlot: DeliverySlotOption | null
  selectedAddressId: string
  addItem: (merchantId: string, productId: string) => void
  removeItem: (productId: string) => void
  setQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  setSelectedSlot: (slot: DeliverySlotOption | null) => void
  setSelectedAddressId: (addressId: string) => void
  itemCount: number
  subtotal: number
  deliveryFee: number
  total: number
}

const CartContext = createContext<CartContextValue | null>(null)

const DELIVERY_FEE = 1500

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlotOption | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? '',
  )

  const merchantId = items[0]?.merchantId ?? null

  function addItem(newMerchantId: string, productId: string) {
    setItems((prev) => {
      // Un panier ne contient les produits que d'un seul marchand à la fois.
      const sameMerchant = prev.length === 0 || prev[0].merchantId === newMerchantId
      const base = sameMerchant ? prev : []
      const existing = base.find((item) => item.productId === productId)
      if (existing) {
        return base.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }
      return [...base, { productId, merchantId: newMerchantId, quantity: 1 }]
    })
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((item) => item.productId !== productId))
  }

  function setQuantity(productId: string, quantity: number) {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((item) => item.productId !== productId)
      return prev.map((item) => (item.productId === productId ? { ...item, quantity } : item))
    })
  }

  function clearCart() {
    setItems([])
    setSelectedSlot(null)
  }

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId)
      return sum + (product?.price ?? 0) * item.quantity
    }, 0)
  }, [items])

  const deliveryFee = items.length > 0 ? DELIVERY_FEE : 0
  const total = subtotal + deliveryFee

  const value: CartContextValue = {
    items,
    merchantId,
    selectedSlot,
    selectedAddressId,
    addItem,
    removeItem,
    setQuantity,
    clearCart,
    setSelectedSlot,
    setSelectedAddressId,
    itemCount,
    subtotal,
    deliveryFee,
    total,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart doit être utilisé à l’intérieur de CartProvider')
  return ctx
}

export function getCartMerchant(merchantId: string | null) {
  return merchants.find((m) => m.id === merchantId) ?? null
}
