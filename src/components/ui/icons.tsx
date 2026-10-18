import {
  Carrot,
  Apple,
  Fish,
  Wheat,
  Hammer,
  UtensilsCrossed,
  CakeSlice,
  ShoppingCart,
  ShoppingBasket,
  Store,
  Smartphone,
  Sofa,
  Shirt,
  Sparkles,
  Car,
  Baby,
  BookOpen,
  Puzzle,
  Dumbbell,
  Factory,
  ChefHat,
  MonitorDown,
  type LucideIcon,
} from 'lucide-react'
import type { CategoryId, Market } from '../../types'

const categoryIcons: Record<CategoryId, LucideIcon> = {
  legumes: Carrot,
  fruits: Apple,
  poisson: Fish,
  cereales: Wheat,
  restauration: UtensilsCrossed,
  boulangerie: CakeSlice,
  bricolage: Hammer,
  epicerie: ShoppingCart,
  'high-tech': Smartphone,
  maison: Sofa,
  mode: Shirt,
  beaute: Sparkles,
  'auto-moto': Car,
  bebe: Baby,
  livres: BookOpen,
  jeux: Puzzle,
  sport: Dumbbell,
  industrie: Factory,
  chr: ChefHat,
  numerique: MonitorDown,
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
