import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Category, CategoryAttribute, CategoryId, StorefrontCategory, Subcategory } from '../types'
import { categories as staticCategories } from '../data/categories'
import { supabase } from '../lib/supabaseClient'

/**
 * Taxonomie du catalogue (migration 023) : familles, sous-catégories, attributs filtrables et
 * catégories mises en avant par enseigne ou boutique. Repli sur src/data/categories.ts si la
 * lecture échoue (hors ligne, migration non appliquée) : l'application garde ses 20 familles.
 */

interface CategoryRow {
  id: string
  parent_id: string | null
  label: string
  short_label: string | null
  sort_order: number
  is_active: boolean
  is_featured: boolean
  image_url: string | null
}

interface AttributeRow {
  id: string
  category_id: string
  key: string
  label: string
  value_type: CategoryAttribute['valueType']
  unit: string | null
  is_filterable: boolean
  sort_order: number
  is_active: boolean
}

interface StorefrontRow {
  id: string
  market_id: string | null
  merchant_id: string | null
  category_id: string
  sort_order: number
}

export const CATEGORY_COLUMNS = 'id, parent_id, label, short_label, sort_order, is_active, is_featured, image_url'
export const ATTRIBUTE_COLUMNS = 'id, category_id, key, label, value_type, unit, is_filterable, sort_order, is_active'
export const STOREFRONT_COLUMNS = 'id, market_id, merchant_id, category_id, sort_order'

const staticById = new Map(staticCategories.map((c) => [c.id as string, c]))

/** Classe de couleur d'une famille : celle du jeton existant, sinon la couleur de marque (famille ajoutée par l'admin). */
function colorClassFor(id: string) {
  return staticById.get(id)?.colorClass ?? 'bg-brand'
}

/** Ligne SQL vers famille (le type CategoryId reste celui des 20 familles connues ; une famille ajoutée garde son id texte). */
export function familyFromRow(row: CategoryRow): Category {
  return {
    id: row.id as CategoryId,
    label: row.label,
    shortLabel: row.short_label ?? undefined,
    colorClass: colorClassFor(row.id),
    sortOrder: row.sort_order,
    isActive: row.is_active,
    isFeatured: row.is_featured,
    imageUrl: row.image_url,
  }
}

export function subcategoryFromRow(row: CategoryRow): Subcategory {
  return {
    id: row.id,
    parentId: row.parent_id as CategoryId,
    label: row.label,
    shortLabel: row.short_label ?? undefined,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    imageUrl: row.image_url,
  }
}

export function attributeFromRow(row: AttributeRow): CategoryAttribute {
  return {
    id: row.id,
    categoryId: row.category_id,
    key: row.key,
    label: row.label,
    valueType: row.value_type,
    unit: row.unit,
    isFilterable: row.is_filterable,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }
}

export function storefrontFromRow(row: StorefrontRow): StorefrontCategory {
  return {
    id: row.id,
    marketId: row.market_id,
    merchantId: row.merchant_id,
    categoryId: row.category_id,
    sortOrder: row.sort_order,
  }
}

const bySortOrder = <T extends { sortOrder?: number; label: string }>(a: T, b: T) =>
  (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label, 'fr')

interface TaxonomyContextValue {
  /** Familles actives (base) ou les 20 familles statiques en repli. */
  families: Category[]
  subcategories: Subcategory[]
  attributes: CategoryAttribute[]
  storefronts: StorefrontCategory[]
  /** Vrai si les données viennent du repli statique (base injoignable ou migration 023 absente). */
  isFallback: boolean
  loading: boolean
  refresh: () => Promise<void>
  getFamily: (id: string | null | undefined) => Category | undefined
  getSubcategory: (id: string | null | undefined) => Subcategory | undefined
  subcategoriesOf: (familyId: string) => Subcategory[]
  /** Libellé d'une famille ou d'une sous-catégorie. */
  labelOf: (id: string | null | undefined) => string | undefined
}

const TaxonomyContext = createContext<TaxonomyContextValue | null>(null)

export function TaxonomyProvider({ children }: { children: ReactNode }) {
  const [families, setFamilies] = useState<Category[]>(staticCategories)
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [attributes, setAttributes] = useState<CategoryAttribute[]>([])
  const [storefronts, setStorefronts] = useState<StorefrontCategory[]>([])
  const [isFallback, setIsFallback] = useState(true)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [catRes, attrRes, storeRes] = await Promise.all([
      supabase.from('categories').select(CATEGORY_COLUMNS).eq('is_active', true),
      supabase.from('category_attributes').select(ATTRIBUTE_COLUMNS).eq('is_active', true),
      supabase.from('storefront_categories').select(STOREFRONT_COLUMNS),
    ])
    if (catRes.error || !catRes.data || catRes.data.length === 0) {
      // Repli : la liste statique reste affichée, sans sous-catégories ni attributs.
      setFamilies(staticCategories)
      setSubcategories([])
      setAttributes([])
      setStorefronts([])
      setIsFallback(true)
    } else {
      const rows = catRes.data as CategoryRow[]
      const familyRows = rows.filter((r) => r.parent_id === null)
      const familyIds = new Set(familyRows.map((r) => r.id))
      setFamilies(familyRows.map(familyFromRow).sort(bySortOrder))
      setSubcategories(
        rows
          .filter((r) => r.parent_id !== null && familyIds.has(r.parent_id))
          .map(subcategoryFromRow)
          .sort(bySortOrder),
      )
      setAttributes(attrRes.error || !attrRes.data ? [] : (attrRes.data as AttributeRow[]).map(attributeFromRow))
      setStorefronts(storeRes.error || !storeRes.data ? [] : (storeRes.data as StorefrontRow[]).map(storefrontFromRow))
      setIsFallback(false)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const value = useMemo<TaxonomyContextValue>(() => {
    const familyMap = new Map(families.map((f) => [f.id as string, f]))
    const subMap = new Map(subcategories.map((s) => [s.id, s]))
    return {
      families,
      subcategories,
      attributes,
      storefronts,
      isFallback,
      loading,
      refresh,
      getFamily: (id) => (id ? familyMap.get(id) ?? staticById.get(id) : undefined),
      getSubcategory: (id) => (id ? subMap.get(id) : undefined),
      subcategoriesOf: (familyId) => subcategories.filter((s) => s.parentId === familyId),
      labelOf: (id) => (id ? familyMap.get(id)?.label ?? subMap.get(id)?.label ?? staticById.get(id)?.label : undefined),
    }
  }, [families, subcategories, attributes, storefronts, isFallback, loading, refresh])

  return <TaxonomyContext.Provider value={value}>{children}</TaxonomyContext.Provider>
}

export function useTaxonomy() {
  const ctx = useContext(TaxonomyContext)
  if (!ctx) throw new Error('useTaxonomy doit être utilisé à l’intérieur de TaxonomyProvider')
  return ctx
}
