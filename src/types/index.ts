export type CategoryId = 'legumes' | 'fruits' | 'poisson' | 'cereales'

export interface Category {
  id: CategoryId
  label: string
  /** Emoji utilisé comme icône légère (pas d'image en dur). */
  icon: string
  /** Doit correspondre à une clé de la palette theme.colors.category. */
  colorClass: string
}

export interface Market {
  id: string
  name: string
  neighborhood: string
  city: string
  imageEmoji: string
  merchantCount: number
}

export interface Product {
  id: string
  name: string
  category: CategoryId
  price: number // en F CFA
  unit: string // ex: "kg", "botte", "pièce"
  imageEmoji: string
}

export interface Merchant {
  id: string
  name: string
  marketId: string
  categories: CategoryId[]
  rating: number
  reviewCount: number
  address: string
  imageEmoji: string
  bannerColor: string
  isFavorite: boolean
  productIds: string[]
}

export type DeliveryPeriod = 'matin' | 'apres-midi' | 'soir' | 'retrait'

export interface DeliverySlotOption {
  id: string
  dayLabel: string
  date: string // ISO
  period: DeliveryPeriod
  periodLabel: string
  timeRange: string
}

export interface Address {
  id: string
  label: string
  fullAddress: string
  neighborhood: string
  city: string
  isDefault: boolean
}

export interface CartItem {
  productId: string
  merchantId: string
  quantity: number
}

export type OrderStatus = 'en_preparation' | 'en_livraison' | 'livree'

export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  unit: string
}

export interface Order {
  id: string
  merchantId: string
  merchantName: string
  items: OrderItem[]
  subtotal: number
  deliveryFee: number
  total: number
  status: OrderStatus
  createdAt: string // ISO
  slotLabel: string
  addressLabel: string
}

export interface PaymentMethod {
  id: string
  label: string
  detail: string
}

export interface UserProfile {
  firstName: string
  lastName: string
  phone: string
  email: string
  memberSince: string
  favoriteCount: number
  averageRatingGiven: number
}
