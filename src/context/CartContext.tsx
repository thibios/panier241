import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CartItem, DeliverySlotOption } from '../types'
import { readSession, writeSession } from '../lib/storage'
import { useCatalog } from './CatalogContext'
import { useAddresses } from './AddressesContext'
import { markets } from '../data/markets'
import { computeDelivery } from '../lib/pricing'

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
  serviceFee: number
  deliveryFee: number
  distanceKm: number | null
  total: number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { products, merchants } = useCatalog()
  const { addresses } = useAddresses()
  const [items, setItems] = useState<CartItem[]>(() => readSession('cart-items', [] as CartItem[]))
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlotOption | null>(() =>
    readSession('cart-slot', null as DeliverySlotOption | null),
  )
  const [selectedAddressId, setSelectedAddressId] = useState<string>(() => readSession('cart-address', ''))

  useEffect(() => writeSession('cart-items', items), [items])
  useEffect(() => writeSession('cart-slot', selectedSlot), [selectedSlot])
  useEffect(() => writeSession('cart-address', selectedAddressId), [selectedAddressId])

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
  }, [items, products])

  const { serviceFee, deliveryFee, distanceKm, total } = useMemo(() => {
    if (items.length === 0) return { serviceFee: 0, deliveryFee: 0, distanceKm: null, total: 0 }

    const merchant = merchants.find((m) => m.id === merchantId)
    const market = merchant ? markets.find((mk) => mk.id === merchant.marketId) : undefined
    const marketCoords = market ? { lat: market.lat, lng: market.lng } : null

    const address = addresses.find((a) => a.id === selectedAddressId) ?? addresses.find((a) => a.isDefault)
    const addressCoords = address?.lat != null && address?.lng != null ? { lat: address.lat, lng: address.lng } : null

    return computeDelivery(subtotal, marketCoords, addressCoords)
  }, [items.length, subtotal, merchants, merchantId, addresses, selectedAddressId])

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
    serviceFee,
    deliveryFee,
    distanceKm,
    total,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart doit être utilisé à l’intérieur de CartProvider')
  return ctx
}
