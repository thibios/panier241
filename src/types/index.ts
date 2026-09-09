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
  lat: number
  lng: number
}

export interface Product {
  id: string
  merchantId: string
  name: string
  category: CategoryId
  price: number // en F CFA
  unit: string // ex: "kg", "botte", "pièce"
  imageEmoji: string
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

export interface Merchant {
  id: string
  ownerId: string | null
  name: string
  marketId: string
  categories: CategoryId[]
  rating: number
  reviewCount: number
  address: string
  imageEmoji: string
  bannerColor: string
  kioskPhotoUrl: string | null
  status: ApprovalStatus
  phone: string | null
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
  lat: number | null
  lng: number | null
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
  serviceFee: number
  deliveryFee: number
  distanceKm: number | null
  total: number
  status: OrderStatus
  createdAt: string // ISO
  slotLabel: string
  addressLabel: string
  livreurId: string | null
  livreurName: string | null
  livreurPhone: string | null
  shoppingVideoUrl: string | null
}

export interface Livreur {
  id: string
  ownerId: string
  name: string
  phone: string
  vehicle: string
  status: ApprovalStatus
}

export interface PaymentMethod {
  id: string
  label: string
  detail: string
}
