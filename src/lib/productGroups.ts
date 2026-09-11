import type { Product } from '../types'

export interface ProductGroup {
  /** Nom de base partagé par les variantes (= product.name). */
  name: string
  /** 1 seul élément = produit simple (pas de variante) ; 2+ = à regrouper/déplier. */
  variants: Product[]
}

/**
 * Regroupe une liste de produits par nom de base, en conservant l'ordre
 * d'apparition. Les variantes d'un même groupe sont triées par prix croissant.
 */
export function groupProducts(products: Product[]): ProductGroup[] {
  const order: string[] = []
  const byName = new Map<string, Product[]>()

  for (const product of products) {
    if (!byName.has(product.name)) {
      byName.set(product.name, [])
      order.push(product.name)
    }
    byName.get(product.name)!.push(product)
  }

  return order.map((name) => ({
    name,
    variants: [...byName.get(name)!].sort((a, b) => a.price - b.price),
  }))
}
