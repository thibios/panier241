import type { Category } from '../types'

export const categories: Category[] = [
  { id: 'legumes', label: 'Légumes', icon: '🥬', colorClass: 'bg-category-legumes' },
  { id: 'fruits', label: 'Fruits', icon: '🍍', colorClass: 'bg-category-fruits' },
  { id: 'poisson', label: 'Poisson & Viande', icon: '🐟', colorClass: 'bg-category-poisson' },
  { id: 'cereales', label: 'Céréales & Épices', icon: '🌾', colorClass: 'bg-category-cereales' },
  { id: 'bricolage', label: 'Bricolage & Construction', icon: '🔨', colorClass: 'bg-category-bricolage' },
  { id: 'epicerie', label: 'Épicerie & Maison', icon: '🛒', colorClass: 'bg-category-epicerie' },
]
