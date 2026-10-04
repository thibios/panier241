import {
  Carrot,
  Apple,
  Fish,
  Wheat,
  Hammer,
  ShoppingCart,
  ShoppingBasket,
  Store,
  type LucideIcon,
} from 'lucide-react'
import type { CategoryId, Market } from '../../types'

const categoryIcons: Record<CategoryId, LucideIcon> = {
  legumes: Carrot,
  fruits: Apple,
  poisson: Fish,
  cereales: Wheat,
  bricolage: Hammer,
  epicerie: ShoppingCart,
}

/** Icône d'une catégorie de produits (repli quand il n'y a pas de photo). */
export function CategoryIcon({ category, className }: { category: CategoryId | undefined; className?: string }) {
  const Icon = (category && categoryIcons[category]) || ShoppingCart
  return <Icon className={className} aria-hidden="true" />
}

/** Icône d'un lieu de vente : panier pour un marché traditionnel, boutique pour un supermarché. */
export function MarketIcon({ kind, className }: { kind: Market['kind']; className?: string }) {
  const Icon = kind === 'supermarche' ? Store : ShoppingBasket
  return <Icon className={className} aria-hidden="true" />
}
