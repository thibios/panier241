import type { AttributeValue, Category, CategoryAttribute, Product, StorefrontCategory, Subcategory } from '../types'

/**
 * Règles d'affichage de la taxonomie, identiques à public.visible_categories() (migration 023) :
 * une catégorie sans produit publiable est masquée, sauf indicateur éditorial `isFeatured`.
 * `products` est le catalogue public déjà filtré (commerçants approuvés, non démo) par CatalogContext.
 */

/** Familles à afficher : au moins un produit publiable, ou mise en avant par l'éditorial. */
export function visibleFamilies(families: Category[], products: Product[]): Category[] {
  const used = new Set(products.map((p) => p.category as string))
  return families.filter((f) => f.isActive !== false && (used.has(f.id) || f.isFeatured === true))
}

/** Sous-catégories non vides d'une liste de produits (déjà limitée à une famille ou à une boutique). */
export function usedSubcategories(subcategories: Subcategory[], products: Product[]): Subcategory[] {
  const used = new Set(products.map((p) => p.subcategoryId).filter(Boolean))
  return subcategories.filter((s) => used.has(s.id))
}

/** Une catégorie (famille ou sous-catégorie) correspond-elle à ce produit ? */
export function productMatchesCategory(product: Product, categoryId: string): boolean {
  return product.category === categoryId || product.subcategoryId === categoryId
}

/**
 * Catégories pertinentes d'une boutique : sa sélection propre, sinon celle de son enseigne,
 * sinon les catégories de ses produits. Dans tous les cas, seules les catégories qui ont au moins
 * un produit de cette boutique sont gardées (une enseigne électricité n'affiche jamais « Mode »).
 */
export function relevantStorefrontCategories(params: {
  merchantId: string
  marketId: string
  storefronts: StorefrontCategory[]
  products: Product[]
  labelOf: (id: string) => string | undefined
}): { id: string; label: string }[] {
  const { merchantId, marketId, storefronts, products, labelOf } = params
  const own = storefronts.filter((s) => s.merchantId === merchantId)
  const selection = own.length > 0 ? own : storefronts.filter((s) => s.marketId === marketId)
  const ids =
    selection.length > 0
      ? [...selection].sort((a, b) => a.sortOrder - b.sortOrder).map((s) => s.categoryId)
      : [...new Set(products.flatMap((p) => (p.subcategoryId ? [p.subcategoryId] : [p.category as string])))]
  const result: { id: string; label: string }[] = []
  for (const id of ids) {
    const label = labelOf(id)
    if (!label) continue // catégorie désactivée ou inconnue
    if (!products.some((p) => productMatchesCategory(p, id))) continue
    result.push({ id, label })
  }
  // Une famille seule qui couvre tous les produits n'aide pas à filtrer : on la retire s'il reste des sous-catégories.
  const subs = result.filter((c) => products.some((p) => p.subcategoryId === c.id))
  return subs.length > 0 ? result.filter((c) => subs.includes(c) || !products.every((p) => p.category === c.id)) : result
}

/** Attributs filtrables applicables : ceux de la famille et, si une sous-catégorie est choisie, les siens. */
export function applicableAttributes(attributes: CategoryAttribute[], familyId: string, subcategoryId: string | null, subcategories: Subcategory[]) {
  const scope = new Set<string>([familyId])
  if (subcategoryId) scope.add(subcategoryId)
  else for (const s of subcategories) if (s.parentId === familyId) scope.add(s.id)
  const seen = new Set<string>()
  return attributes
    .filter((a) => a.isFilterable && a.isActive && scope.has(a.categoryId))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((a) => (seen.has(a.key) ? false : (seen.add(a.key), true)))
}

/** Valeurs réellement présentes d'un attribut (aucune valeur inventée), triées. */
export function attributeValues(products: Product[], key: string): AttributeValue[] {
  const values = new Map<string, AttributeValue>()
  for (const p of products) {
    const v = p.attributes?.[key]
    if (v !== undefined && v !== null && v !== '') values.set(String(v), v)
  }
  return [...values.values()].sort((a, b) =>
    typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'fr'),
  )
}

/** Libellé d'une valeur d'attribut (« 2,5 mm² », « Oui »). */
export function formatAttributeValue(value: AttributeValue, attribute: Pick<CategoryAttribute, 'unit' | 'valueType'>) {
  if (attribute.valueType === 'oui_non' || typeof value === 'boolean') return value ? 'Oui' : 'Non'
  const text = typeof value === 'number' ? value.toLocaleString('fr-FR') : String(value)
  return attribute.unit ? `${text} ${attribute.unit}` : text
}

/**
 * Filtre tolérant : sans filtre actif, tous les produits passent ; un filtre actif ne garde que les
 * produits dont la valeur est sélectionnée (un produit sans cette information n'est pas retenu, sans erreur).
 */
export function matchesAttributeFilters(product: Product, filters: Record<string, string[]>): boolean {
  for (const [key, selected] of Object.entries(filters)) {
    if (selected.length === 0) continue
    const v = product.attributes?.[key]
    if (v === undefined || !selected.includes(String(v))) return false
  }
  return true
}
