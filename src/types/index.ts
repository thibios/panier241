export type CategoryId =
  | 'legumes'
  | 'fruits'
  | 'poisson'
  | 'cereales'
  | 'restauration'
  | 'boulangerie'
  | 'bricolage'
  | 'epicerie'
  | 'high-tech'
  | 'maison'
  | 'mode'
  | 'beaute'
  | 'auto-moto'
  | 'bebe'
  | 'livres'
  | 'jeux'
  | 'sport'
  | 'industrie'
  | 'chr'
  | 'numerique'

export interface Category {
  id: CategoryId
  label: string
  /** Libellé court pour la grille de l'accueil ; à défaut, `label`. */
  shortLabel?: string
  /** Doit correspondre à une clé de la palette theme.colors.category. */
  colorClass: string
  /** Champs issus de la table categories (023) ; absents dans le repli statique. */
  sortOrder?: number
  isActive?: boolean
  /** Indicateur éditorial : affichée à l'accueil même sans produit publiable. */
  isFeatured?: boolean
  imageUrl?: string | null
}

/** Sous-catégorie globale (categories.parent_id non nul, migration 023). */
export interface Subcategory {
  id: string
  parentId: CategoryId
  label: string
  shortLabel?: string
  sortOrder: number
  isActive: boolean
  imageUrl: string | null
}

/** Attribut filtrable d'une famille ou d'une sous-catégorie (table category_attributes). */
export interface CategoryAttribute {
  id: string
  categoryId: string
  key: string
  label: string
  valueType: 'texte' | 'nombre' | 'oui_non'
  unit: string | null
  isFilterable: boolean
  sortOrder: number
  isActive: boolean
}

/** Catégorie mise en avant par une enseigne (marketId) ou une boutique (merchantId). */
export interface StorefrontCategory {
  id: string
  marketId: string | null
  merchantId: string | null
  categoryId: string
  sortOrder: number
}

/** Rubrique propre à un commerçant (« Promotions »...), table merchant_sections. */
export interface MerchantSection {
  id: string
  merchantId: string
  name: string
  sortOrder: number
  isVisible: boolean
  isActive: boolean
  imageUrl: string | null
  /** Produits liés (merchant_section_products), dans l'ordre de la rubrique. */
  productIds: string[]
}

/** Valeur d'attribut d'un produit (products.attributes). */
export type AttributeValue = string | number | boolean

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
  /** Photo réelle d'un marché ajouté depuis l'application. */
  photoUrl?: string
  /** Type de marché (vivrier, poisson, nuit...) et adresse ou repère, pour les marchés ajoutés. */
  marketType?: string
  address?: string
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
  /** Sous-catégorie globale (023) ; null = classé au niveau famille. */
  subcategoryId?: string | null
  /** Valeurs des attributs filtrables (023) ; un attribut absent ne bloque rien. */
  attributes?: Record<string, AttributeValue>
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

/** Statuts de commande (machine à états de la base, migration 022). */
export type OrderStatus =
  | 'en_preparation'
  | 'prete_a_livrer'
  | 'en_livraison'
  | 'livree'
  | 'prete_a_retirer'
  | 'retiree'
  | 'annulee'

export type FulfillmentMode = 'livraison' | 'retrait'

export type PaymentMethodCode = 'airtel_money' | 'moov_money' | 'especes'

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
  /** Annulation (client, commerçant ou administrateur), motif obligatoire. */
  cancelledAt?: string | null
  cancelReason?: string | null
  /** Livraison ou retrait sur stand. */
  fulfillmentMode: FulfillmentMode
  discountAmount: number
  /** Acompte dû au commerçant quand le total dépasse le seuil (0 sinon). */
  depositAmount: number
  depositStatus: 'non_requis' | 'du' | 'encaisse' | 'inclus_solde'
  paymentMethod: PaymentMethodCode | null
  /** Null pour les commandes antérieures au moteur de commande. */
  paymentStatus: 'du' | 'encaisse' | null
  /** Sous-total calculé à la création, avant ajustement éventuel. */
  initialSubtotal: number
  adjustmentStatus: 'aucun' | 'applique' | 'en_attente' | 'accepte' | 'refuse' | 'caduc'
  /** Nouveau sous-total proposé par le commerçant, en attente d'accord du client. */
  proposedSubtotal: number | null
  acceptedAt: string | null
}

/** Adresse complète d'une livraison (table order_delivery_details). */
export interface OrderDeliveryDetails {
  orderId: string
  fullAddress: string
  landmark: string | null
  lat: number | null
  lng: number | null
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
