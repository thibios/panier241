import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { ApprovalStatus, AttributeValue, CategoryId, Merchant, Product } from '../types'
import { supabase } from '../lib/supabaseClient'

interface CatalogContextValue {
  merchants: Merchant[]
  products: Product[]
  loading: boolean
  /** Vrai si le dernier chargement du catalogue a échoué (réseau, serveur). */
  error: boolean
  refresh: () => Promise<void>
  getProductsForMerchant: (merchantId: string) => Product[]
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

interface MerchantRow {
  id: string
  owner_id: string | null
  name: string
  market_id: string
  categories: CategoryId[]
  rating: number
  review_count: number
  address: string
  banner_color: string
  kiosk_photo_url: string | null
  business_type: string | null
  neighborhood: string | null
  status: ApprovalStatus
  phone: string | null
}

interface ProductRow {
  id: string
  merchant_id: string
  name: string
  category: CategoryId
  price: number
  unit: string
  image_url: string | null
  variant_label: string | null
  product_type: string | null
  /** Colonnes de 023 : absentes tant que la migration n'est pas appliquée. */
  subcategory_id?: string | null
  attributes?: Record<string, AttributeValue> | null
}

const PRODUCT_COLUMNS_LEGACY = 'id, merchant_id, name, category, price, unit, image_url, variant_label, product_type'
const PRODUCT_COLUMNS = `${PRODUCT_COLUMNS_LEGACY}, subcategory_id, attributes`

/** Lit les produits avec les colonnes de 023 ; si elles n'existent pas encore (code 42703), relit sans elles. */
async function fetchProducts() {
  const res = await supabase.from('products').select(PRODUCT_COLUMNS)
  if (res.error?.code === '42703') return supabase.from('products').select(PRODUCT_COLUMNS_LEGACY)
  return res
}

function merchantFromRow(row: MerchantRow): Merchant {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    marketId: row.market_id,
    categories: row.categories,
    rating: row.rating,
    reviewCount: row.review_count,
    address: row.address,
    bannerColor: row.banner_color,
    kioskPhotoUrl: row.kiosk_photo_url,
    businessType: row.business_type,
    neighborhood: row.neighborhood,
    status: row.status,
    phone: row.phone,
  }
}

function productFromRow(row: ProductRow): Product {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    name: row.name,
    category: row.category,
    price: row.price,
    unit: row.unit,
    imageUrl: row.image_url,
    variantLabel: row.variant_label,
    productType: row.product_type,
    subcategoryId: row.subcategory_id ?? null,
    attributes: row.attributes ?? {},
  }
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [merchantsRes, productsRes] = await Promise.all([
      supabase
        .from('merchants')
        .select('id, owner_id, name, market_id, categories, rating, review_count, address, banner_color, kiosk_photo_url, status, phone, business_type, neighborhood')
        .eq('status', 'approved'),
      fetchProducts(),
    ])
    setError(Boolean(merchantsRes.error || productsRes.error))
    if (merchantsRes.data) {
      const approvedMerchants = merchantsRes.data.map(merchantFromRow)
      setMerchants(approvedMerchants)
      const approvedIds = new Set(approvedMerchants.map((m) => m.id))
      if (productsRes.data) setProducts((productsRes.data as ProductRow[]).filter((p) => approvedIds.has(p.merchant_id)).map(productFromRow))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  function getProductsForMerchant(merchantId: string) {
    return products.filter((p) => p.merchantId === merchantId)
  }

  return (
    <CatalogContext.Provider value={{ merchants, products, loading, error, refresh, getProductsForMerchant }}>
      {children}
    </CatalogContext.Provider>
  )
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog doit être utilisé à l’intérieur de CatalogProvider')
  return ctx
}
