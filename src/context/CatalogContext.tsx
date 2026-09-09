import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { ApprovalStatus, CategoryId, Merchant, Product } from '../types'
import { supabase } from '../lib/supabaseClient'

interface CatalogContextValue {
  merchants: Merchant[]
  products: Product[]
  loading: boolean
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
  image_emoji: string
  banner_color: string
  kiosk_photo_url: string | null
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
  image_emoji: string
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
    imageEmoji: row.image_emoji,
    bannerColor: row.banner_color,
    kioskPhotoUrl: row.kiosk_photo_url,
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
    imageEmoji: row.image_emoji,
  }
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [merchantsRes, productsRes] = await Promise.all([
      supabase
        .from('merchants')
        .select('id, owner_id, name, market_id, categories, rating, review_count, address, image_emoji, banner_color, kiosk_photo_url, status, phone')
        .eq('status', 'approved'),
      supabase.from('products').select('id, merchant_id, name, category, price, unit, image_emoji'),
    ])
    if (merchantsRes.data) {
      const approvedMerchants = merchantsRes.data.map(merchantFromRow)
      setMerchants(approvedMerchants)
      const approvedIds = new Set(approvedMerchants.map((m) => m.id))
      if (productsRes.data) setProducts(productsRes.data.filter((p) => approvedIds.has(p.merchant_id)).map(productFromRow))
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
    <CatalogContext.Provider value={{ merchants, products, loading, refresh, getProductsForMerchant }}>
      {children}
    </CatalogContext.Provider>
  )
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog doit être utilisé à l’intérieur de CatalogProvider')
  return ctx
}
