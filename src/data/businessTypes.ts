import type { CategoryId } from '../types'

/** Type de commerce choisi à l'inscription : catégories proposées par défaut et types de produits suggérés. */
export interface BusinessType {
  id: string
  label: string
  group: string
  categories: CategoryId[]
  /** Comment appeler un article de ce commerce dans le formulaire (« plat », « produit »...). */
  itemWord: string
  productTypes: string[]
  defaultUnit: string
}

const MEAL_TYPES = ['Plat', 'Entrée', 'Accompagnement', 'Dessert', 'Boisson']

export const businessTypes: BusinessType[] = [
  // Restauration
  { id: 'restaurant', label: 'Restaurant', group: 'Restauration', categories: ['restauration'], itemWord: 'plat', productTypes: MEAL_TYPES, defaultUnit: 'portion' },
  { id: 'maquis', label: 'Maquis / gargote', group: 'Restauration', categories: ['restauration'], itemWord: 'plat', productTypes: MEAL_TYPES, defaultUnit: 'portion' },
  { id: 'fast-food', label: 'Fast-food / snack', group: 'Restauration', categories: ['restauration'], itemWord: 'plat', productTypes: ['Sandwich', 'Burger', 'Frites', 'Snack', 'Boisson', 'Dessert'], defaultUnit: 'pièce' },
  { id: 'grillades', label: 'Grillades / braise (poisson, poulet)', group: 'Restauration', categories: ['restauration'], itemWord: 'plat', productTypes: ['Poisson braisé', 'Poulet braisé', 'Viande grillée', 'Brochettes', 'Accompagnement', 'Boisson'], defaultUnit: 'portion' },
  { id: 'traiteur', label: 'Traiteur', group: 'Restauration', categories: ['restauration'], itemWord: 'plat', productTypes: [...MEAL_TYPES, 'Plateau'], defaultUnit: 'portion' },
  { id: 'bar', label: 'Bar / buvette', group: 'Restauration', categories: ['restauration'], itemWord: 'article', productTypes: ['Boisson fraîche', 'Bière', 'Jus', 'Eau', 'Snack'], defaultUnit: 'bouteille' },
  { id: 'beignets', label: 'Beignets / petit-déjeuner', group: 'Restauration', categories: ['boulangerie'], itemWord: 'article', productTypes: ['Beignets', 'Bouillie', 'Café / thé', 'Sandwich'], defaultUnit: 'pièce' },

  // Boulangerie, pâtisserie, glaces
  { id: 'boulangerie', label: 'Boulangerie', group: 'Boulangerie et pâtisserie', categories: ['boulangerie'], itemWord: 'produit', productTypes: ['Pain', 'Baguette', 'Viennoiserie', 'Pain de mie'], defaultUnit: 'pièce' },
  { id: 'patisserie', label: 'Pâtisserie', group: 'Boulangerie et pâtisserie', categories: ['boulangerie'], itemWord: 'produit', productTypes: ['Gâteau entier', 'Part de gâteau', 'Pâtisserie individuelle', 'Viennoiserie', 'Gâteau sur commande'], defaultUnit: 'pièce' },
  { id: 'glacier', label: 'Glacier', group: 'Boulangerie et pâtisserie', categories: ['boulangerie'], itemWord: 'produit', productTypes: ['Glace', 'Sorbet', 'Milk-shake', 'Boisson'], defaultUnit: 'pot' },
  { id: 'confiserie', label: 'Confiserie / chocolaterie', group: 'Boulangerie et pâtisserie', categories: ['boulangerie'], itemWord: 'produit', productTypes: ['Bonbons', 'Chocolat', 'Biscuits'], defaultUnit: 'paquet' },

  // Alimentation fraîche
  { id: 'fruits-legumes', label: 'Fruits et légumes', group: 'Alimentation fraîche', categories: ['legumes', 'fruits'], itemWord: 'produit', productTypes: ['Légume', 'Fruit', 'Tubercule', 'Feuilles', 'Banane plantain'], defaultUnit: 'kg' },
  { id: 'poissonnerie', label: 'Poissonnerie', group: 'Alimentation fraîche', categories: ['poisson'], itemWord: 'produit', productTypes: ['Poisson frais', 'Poisson fumé', 'Poisson salé', 'Fruits de mer'], defaultUnit: 'kg' },
  { id: 'boucherie', label: 'Boucherie / charcuterie', group: 'Alimentation fraîche', categories: ['poisson'], itemWord: 'produit', productTypes: ['Viande de bœuf', 'Porc', 'Mouton / chèvre', 'Charcuterie'], defaultUnit: 'kg' },
  { id: 'volaille', label: 'Volaille', group: 'Alimentation fraîche', categories: ['poisson'], itemWord: 'produit', productTypes: ['Poulet entier', 'Morceaux de poulet', 'Œufs'], defaultUnit: 'pièce' },
  { id: 'cereales-epices', label: 'Céréales, épices et condiments', group: 'Alimentation fraîche', categories: ['cereales'], itemWord: 'produit', productTypes: ['Riz', 'Farine', 'Épices', 'Condiments', 'Graines'], defaultUnit: 'kg' },

  // Épicerie et maison
  { id: 'alimentation-generale', label: 'Alimentation générale / boutique de quartier', group: 'Épicerie et maison', categories: ['epicerie'], itemWord: 'produit', productTypes: ['Épicerie', 'Boisson', 'Produit laitier', 'Conserve', 'Hygiène'], defaultUnit: 'pièce' },
  { id: 'superette', label: 'Supérette / supermarché', group: 'Épicerie et maison', categories: ['epicerie'], itemWord: 'produit', productTypes: ['Épicerie', 'Frais', 'Boisson', 'Hygiène', 'Entretien'], defaultUnit: 'pièce' },
  { id: 'boissons', label: 'Dépôt de boissons', group: 'Épicerie et maison', categories: ['epicerie'], itemWord: 'produit', productTypes: ['Eau', 'Jus', 'Soda', 'Bière', 'Vin'], defaultUnit: 'casier' },
  { id: 'ameublement', label: 'Ameublement et décoration (chaises, tapis, meubles)', group: 'Épicerie et maison', categories: ['epicerie'], itemWord: 'article', productTypes: ['Chaise', 'Table', 'Tapis', 'Canapé', 'Lit et matelas', 'Rangement', 'Décoration', 'Luminaire'], defaultUnit: 'pièce' },
  { id: 'librairie', label: 'Librairie et papeterie (livres, cahiers, fournitures)', group: 'Épicerie et maison', categories: ['epicerie'], itemWord: 'article', productTypes: ['Livre', 'Manuel scolaire', 'Cahier', 'Fournitures scolaires', 'Fournitures de bureau', 'Cartable'], defaultUnit: 'pièce' },
  { id: 'hygiene-beaute', label: 'Hygiène, beauté et cosmétiques', group: 'Épicerie et maison', categories: ['epicerie'], itemWord: 'produit', productTypes: ['Soin du corps', 'Cheveux', 'Maquillage', 'Hygiène'], defaultUnit: 'pièce' },

  // Bricolage et construction
  { id: 'quincaillerie', label: 'Quincaillerie / matériaux de construction', group: 'Bricolage et construction', categories: ['bricolage'], itemWord: 'produit', productTypes: ['Ciment', 'Fer', 'Outillage', 'Plomberie', 'Électricité', 'Peinture'], defaultUnit: 'pièce' },

  { id: 'menuiserie', label: 'Menuiserie (bois, meubles sur mesure)', group: 'Bricolage et construction', categories: ['bricolage'], itemWord: 'article', productTypes: ['Planche', 'Chevron', 'Contreplaqué', 'Porte', 'Fenêtre', 'Meuble sur mesure'], defaultUnit: 'pièce' },

  { id: 'autre', label: 'Autre commerce', group: 'Autre', categories: ['epicerie'], itemWord: 'produit', productTypes: [], defaultUnit: 'pièce' },
]

/** market_id d'un commerçant qui n'est rattaché à aucun marché ni magasin. */
export const INDEPENDENT_MARKET_ID = 'independant'
