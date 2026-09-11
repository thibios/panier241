import type { Product } from '../types'

/**
 * Nom complet et non-ambigu d'un produit précis (base + variante si présente).
 * À utiliser partout où un produit doit être identifiable sans ambiguïté :
 * panier, commandes, recherche. Ex: "Fer à béton" + "12mm" -> "Fer à béton 12mm".
 */
export function getProductDisplayName(product: Pick<Product, 'name' | 'variantLabel'>): string {
  return product.variantLabel ? `${product.name} ${product.variantLabel}` : product.name
}
