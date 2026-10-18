export type CategoryId =
  | 'legumes'
  | 'fruits'
  | 'poisson'
  | 'cereales'
  | 'restauration'
  | 'boulangerie'
  | 'bricolage'
  | 'epicerie'

export interface Category {
  id: CategoryId
  label: string
  /** Doit correspondre à une clé de la palette theme.colors.category. */
  colorClass: string
}

export interface Market {
  id: string
  name: string
  neighborhood: string
  city: string
  kind: 'marche' | 'supermarche'
  /** Marché traditionnel : mot-clé Pexels de la photo à afficher, et rang du résultat retenu. */
  photoQuery?: string
  photoPage?: number
  /** Enseigne : logo officiel, affiché en vignette et en filigrane. */
  logoUrl?: string
  /** Faux pour ne pas répéter le logo en filigrane dans l'en-tête (par défaut : vrai). */
  logoWatermark?: boolean
  /** Position GPS ; absente tant que l'emplacement exact n'est pas confirmé (forfait de livraison). */
  lat?: number
  lng?: number
}

export interface Product {
  id: string
  merchantId: string
  name: string
  category: CategoryId
  price: number // en F CFA
  unit: string // ex: "kg", "botte", "pièce"
  imageUrl: string | null
  variantLabel: string | null
  /** Type de produit saisi par le commerçant (Plat, Boisson, Gâteau...). */
  productType?: string | null
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
  bannerColor: string
  kioskPhotoUrl: string | null
  status: ApprovalStatus
  phone: string | null
  /** Type de commerce choisi à l'inscription (Restaurant, Pâtisserie...). */
  businessType?: string | null
  /** Quartier du commerce, surtout utile pour un commerçant indépendant. */
  neighborhood?: string | null
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

export type OrderStatus = 'en_preparation' | 'en_livraison' | 'livree' | 'annulee'

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
  clientPhone: string | null
  /** Annulation par le client (commande encore en préparation). */
  cancelledAt?: string | null
  cancelReason?: string | null
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
