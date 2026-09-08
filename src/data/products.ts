import type { Product } from '../types'

export const products: Product[] = [
  // Légumes
  { id: 'prd-tomate', name: 'Tomates fraîches', category: 'legumes', price: 1500, unit: 'kg', imageEmoji: '🍅' },
  { id: 'prd-oignon', name: 'Oignons', category: 'legumes', price: 1200, unit: 'kg', imageEmoji: '🧅' },
  { id: 'prd-gombo', name: 'Gombo', category: 'legumes', price: 1000, unit: 'tas', imageEmoji: '🥒' },
  { id: 'prd-piment', name: 'Piment frais', category: 'legumes', price: 500, unit: 'tas', imageEmoji: '🌶️' },
  { id: 'prd-feuille-manioc', name: 'Feuilles de manioc', category: 'legumes', price: 1000, unit: 'botte', imageEmoji: '🌿' },
  { id: 'prd-aubergine', name: 'Aubergines africaines', category: 'legumes', price: 1300, unit: 'kg', imageEmoji: '🍆' },

  // Fruits
  { id: 'prd-banane-plantain', name: 'Bananes plantain', category: 'fruits', price: 2000, unit: 'régime', imageEmoji: '🍌' },
  { id: 'prd-ananas', name: 'Ananas de Libreville', category: 'fruits', price: 1500, unit: 'pièce', imageEmoji: '🍍' },
  { id: 'prd-mangue', name: 'Mangues', category: 'fruits', price: 1000, unit: 'kg', imageEmoji: '🥭' },
  { id: 'prd-papaye', name: 'Papayes', category: 'fruits', price: 1200, unit: 'pièce', imageEmoji: '🫐' },
  { id: 'prd-safou', name: 'Safous (prunes locales)', category: 'fruits', price: 1500, unit: 'tas', imageEmoji: '🫒' },
  { id: 'prd-orange', name: 'Oranges', category: 'fruits', price: 1800, unit: 'kg', imageEmoji: '🍊' },

  // Poisson & Viande
  { id: 'prd-machoiron', name: 'Machoiron fumé', category: 'poisson', price: 3500, unit: 'kg', imageEmoji: '🐟' },
  { id: 'prd-carpe', name: 'Carpe fraîche', category: 'poisson', price: 3000, unit: 'kg', imageEmoji: '🐠' },
  { id: 'prd-poulet', name: 'Poulet fermier', category: 'poisson', price: 6000, unit: 'pièce', imageEmoji: '🍗' },
  { id: 'prd-boeuf', name: 'Viande de bœuf', category: 'poisson', price: 5500, unit: 'kg', imageEmoji: '🥩' },
  { id: 'prd-crevette', name: 'Crevettes fraîches', category: 'poisson', price: 4500, unit: 'kg', imageEmoji: '🦐' },

  // Céréales & Épices
  { id: 'prd-riz', name: 'Riz local', category: 'cereales', price: 800, unit: 'kg', imageEmoji: '🍚' },
  { id: 'prd-manioc', name: 'Bâtons de manioc', category: 'cereales', price: 500, unit: 'pièce', imageEmoji: '🥖' },
  { id: 'prd-arachide', name: 'Pâte d’arachide', category: 'cereales', price: 2500, unit: 'pot', imageEmoji: '🥜' },
  { id: 'prd-poivre', name: 'Poivre de Penja', category: 'cereales', price: 3000, unit: '100g', imageEmoji: '🧂' },
  { id: 'prd-gingembre', name: 'Gingembre frais', category: 'cereales', price: 1000, unit: 'kg', imageEmoji: '🫚' },
]
