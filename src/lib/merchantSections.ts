import { useCallback, useEffect, useState } from 'react'
import type { MerchantSection } from '../types'
import { supabase } from './supabaseClient'

/** Ligne SQL d'une rubrique (merchant_sections, migration 023) avec ses liaisons produit. */
interface MerchantSectionRow {
  id: string
  merchant_id: string
  name: string
  sort_order: number
  is_visible: boolean
  is_active: boolean
  image_url: string | null
  merchant_section_products: { product_id: string; sort_order: number }[] | null
}

export const SECTION_COLUMNS =
  'id, merchant_id, name, sort_order, is_visible, is_active, image_url, merchant_section_products(product_id, sort_order)'

/** Convertit une ligne SQL en rubrique, produits triés par ordre de la rubrique. */
export function sectionFromRow(row: MerchantSectionRow): MerchantSection {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    name: row.name,
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
    isActive: row.is_active,
    imageUrl: row.image_url,
    productIds: [...(row.merchant_section_products ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((l) => l.product_id),
  }
}

/**
 * Rubriques d'un commerçant. La RLS ne renvoie au public que les rubriques visibles et actives ;
 * le propriétaire et l'administrateur les reçoivent toutes. `error` est vrai si la lecture échoue
 * (hors ligne, migration 023 non appliquée) : l'appelant affiche alors la boutique sans rubriques.
 */
export function useMerchantSections(merchantId: string | null | undefined) {
  const [sections, setSections] = useState<MerchantSection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    if (!merchantId) {
      setSections([])
      return
    }
    setLoading(true)
    const { data, error: readError } = await supabase
      .from('merchant_sections')
      .select(SECTION_COLUMNS)
      .eq('merchant_id', merchantId)
      .order('sort_order')
      .order('name')
    setError(Boolean(readError))
    setSections(readError || !data ? [] : (data as unknown as MerchantSectionRow[]).map(sectionFromRow))
    setLoading(false)
  }, [merchantId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { sections, loading, error, refresh }
}
