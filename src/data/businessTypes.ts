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

  // Épicerie et alimentation
  { id: 'alimentation-generale', label: 'Alimentation générale / boutique de quartier', group: 'Épicerie et alimentation', categories: ['epicerie'], itemWord: 'produit', productTypes: ['Épicerie', 'Boisson', 'Produit laitier', 'Conserve', 'Hygiène'], defaultUnit: 'pièce' },
  { id: 'superette', label: 'Supérette / supermarché', group: 'Épicerie et alimentation', categories: ['epicerie'], itemWord: 'produit', productTypes: ['Épicerie', 'Frais', 'Boisson', 'Hygiène', 'Entretien'], defaultUnit: 'pièce' },
  { id: 'boissons', label: 'Dépôt de boissons', group: 'Épicerie et alimentation', categories: ['epicerie'], itemWord: 'produit', productTypes: ['Eau', 'Jus', 'Soda', 'Bière', 'Vin'], defaultUnit: 'casier' },
  { id: 'epicerie-fine', label: 'Épicerie fine / produits importés', group: 'Épicerie et alimentation', categories: ['epicerie'], itemWord: 'produit', productTypes: ['Épicerie fine', 'Conserves', 'Produits secs', 'Chocolat', 'Snacks'], defaultUnit: 'pièce' },

  // Bricolage et construction
  { id: 'quincaillerie', label: 'Quincaillerie / matériaux de construction', group: 'Bricolage et construction', categories: ['bricolage'], itemWord: 'produit', productTypes: ['Ciment', 'Fer', 'Outillage', 'Plomberie', 'Électricité', 'Peinture'], defaultUnit: 'pièce' },
  { id: 'menuiserie', label: 'Menuiserie (bois, meubles sur mesure)', group: 'Bricolage et construction', categories: ['bricolage'], itemWord: 'article', productTypes: ['Planche', 'Chevron', 'Contreplaqué', 'Porte', 'Fenêtre', 'Meuble sur mesure'], defaultUnit: 'pièce' },
  { id: 'epi-securite', label: 'Équipements de sécurité (EPI)', group: 'Bricolage et construction', categories: ['bricolage'], itemWord: 'article', productTypes: ['Casque de chantier', 'Gants', 'Chaussures de sécurité', 'Gilet', 'Masque'], defaultUnit: 'pièce' },
  { id: 'outillage-pro', label: 'Outillage manuel professionnel', group: 'Bricolage et construction', categories: ['bricolage'], itemWord: 'article', productTypes: ['Outil manuel', 'Outil de mesure', 'Coffret à outils'], defaultUnit: 'pièce' },

  // High-tech, informatique et électronique
  { id: 'telephonie', label: 'Boutique de téléphonie', group: 'High-tech, informatique et électronique', categories: ['high-tech'], itemWord: 'article', productTypes: ['Smartphone', 'Tablette', 'Accessoire téléphone', 'Écouteurs / casque'], defaultUnit: 'pièce' },
  { id: 'informatique', label: 'Boutique informatique', group: 'High-tech, informatique et électronique', categories: ['high-tech'], itemWord: 'article', productTypes: ['Ordinateur portable', 'Ordinateur de bureau', 'Tablette', 'Accessoire informatique'], defaultUnit: 'pièce' },
  { id: 'electromenager-tv', label: 'Électroménager et TV', group: 'High-tech, informatique et électronique', categories: ['high-tech', 'maison'], itemWord: 'article', productTypes: ['Télévision', 'Accessoire audio / vidéo', 'Appareil photo', 'Petit électroménager'], defaultUnit: 'pièce' },
  { id: 'reparation-telephone', label: 'Réparation de téléphones', group: 'High-tech, informatique et électronique', categories: ['high-tech'], itemWord: 'service', productTypes: ['Réparation smartphone', 'Réparation tablette', 'Accessoire téléphone'], defaultUnit: 'pièce' },

  // Maison et jardin
  { id: 'ameublement', label: 'Ameublement et décoration (chaises, tapis, meubles)', group: 'Maison et jardin', categories: ['maison'], itemWord: 'article', productTypes: ['Chaise', 'Table', 'Tapis', 'Canapé', 'Lit et matelas', 'Rangement', 'Décoration', 'Luminaire'], defaultUnit: 'pièce' },
  { id: 'literie', label: 'Literie et linge de maison', group: 'Maison et jardin', categories: ['maison'], itemWord: 'article', productTypes: ['Matelas', 'Lit', 'Drap et couette', 'Oreiller'], defaultUnit: 'pièce' },
  { id: 'arts-de-la-table', label: 'Cuisine et arts de la table', group: 'Maison et jardin', categories: ['maison'], itemWord: 'article', productTypes: ['Ustensiles de cuisine', 'Vaisselle', 'Casseroles', 'Petit électroménager', 'Aspirateur'], defaultUnit: 'pièce' },
  { id: 'jardinage', label: 'Jardinage et outillage', group: 'Maison et jardin', categories: ['maison'], itemWord: 'article', productTypes: ['Outil de jardinage', 'Outil de bricolage', 'Plantes et semences', 'Arrosage'], defaultUnit: 'pièce' },

  // Mode et accessoires
  { id: 'pret-a-porter', label: 'Prêt-à-porter / boutique de vêtements', group: 'Mode et accessoires', categories: ['mode'], itemWord: 'article', productTypes: ['Vêtement femme', 'Vêtement homme', 'Vêtement enfant', 'Sac'], defaultUnit: 'pièce' },
  { id: 'chaussures', label: 'Chaussures et maroquinerie', group: 'Mode et accessoires', categories: ['mode'], itemWord: 'article', productTypes: ['Chaussures femme', 'Chaussures homme', 'Chaussures enfant', 'Sac'], defaultUnit: 'paire' },
  { id: 'bijouterie', label: 'Bijouterie, montres et lunettes', group: 'Mode et accessoires', categories: ['mode'], itemWord: 'article', productTypes: ['Bijou', 'Montre', 'Lunettes de soleil'], defaultUnit: 'pièce' },

  // Beauté et santé
  { id: 'hygiene-beaute', label: 'Hygiène, beauté et cosmétiques', group: 'Beauté et santé', categories: ['beaute'], itemWord: 'produit', productTypes: ['Soin du corps', 'Cheveux', 'Maquillage', 'Hygiène'], defaultUnit: 'pièce' },
  { id: 'parfumerie', label: 'Parfumerie', group: 'Beauté et santé', categories: ['beaute'], itemWord: 'produit', productTypes: ['Parfum', 'Eau de toilette', 'Coffret'], defaultUnit: 'flacon' },
  { id: 'materiel-medical', label: 'Matériel médical et premiers soins', group: 'Beauté et santé', categories: ['beaute'], itemWord: 'produit', productTypes: ['Premiers soins', 'Équipement médical', 'Hygiène'], defaultUnit: 'pièce' },

  // Auto et moto
  { id: 'pieces-auto', label: 'Pièces détachées auto', group: 'Auto et moto', categories: ['auto-moto'], itemWord: 'article', productTypes: ['Pièce détachée', 'Accessoire voiture', 'Outil'], defaultUnit: 'pièce' },
  { id: 'pneus', label: 'Vente de pneus', group: 'Auto et moto', categories: ['auto-moto'], itemWord: 'article', productTypes: ['Pneu voiture', 'Pneu moto', 'Chambre à air'], defaultUnit: 'pièce' },
  { id: 'moto', label: 'Pièces et accessoires moto', group: 'Auto et moto', categories: ['auto-moto'], itemWord: 'article', productTypes: ['Pièce détachée moto', 'Accessoire moto', 'Casque'], defaultUnit: 'pièce' },

  // Bébé et puériculture
  { id: 'puericulture', label: 'Boutique bébé / puériculture', group: 'Bébé et puériculture', categories: ['bebe'], itemWord: 'article', productTypes: ['Alimentation bébé', 'Accessoire bébé', 'Couches', 'Chambre de bébé'], defaultUnit: 'pièce' },
  { id: 'chambre-bebe', label: 'Mobilier et chambre de bébé', group: 'Bébé et puériculture', categories: ['bebe'], itemWord: 'article', productTypes: ['Lit bébé', 'Commode', 'Poussette', 'Siège auto'], defaultUnit: 'pièce' },

  // Livres, musique et vidéo
  { id: 'librairie', label: 'Librairie et papeterie (livres, cahiers, fournitures)', group: 'Livres, musique et vidéo', categories: ['livres'], itemWord: 'article', productTypes: ['Livre', 'Manuel scolaire', 'Cahier', 'Fournitures scolaires', 'Fournitures de bureau', 'Cartable'], defaultUnit: 'pièce' },
  { id: 'livres-occasion', label: 'Livres d\'occasion (bouquiniste)', group: 'Livres, musique et vidéo', categories: ['livres'], itemWord: 'article', productTypes: ['Livre d\'occasion', 'Manuel scolaire', 'Roman'], defaultUnit: 'pièce' },
  { id: 'musique-video', label: 'Disques, DVD et partitions', group: 'Livres, musique et vidéo', categories: ['livres'], itemWord: 'article', productTypes: ['CD / vinyle', 'DVD', 'Blu-ray', 'Partition'], defaultUnit: 'pièce' },

  // Jeux et jouets
  { id: 'jouets', label: 'Magasin de jouets', group: 'Jeux et jouets', categories: ['jeux'], itemWord: 'article', productTypes: ['Jouet', 'Jeu de société', 'Peluche', 'Jeu de construction'], defaultUnit: 'pièce' },
  { id: 'jeux-societe', label: 'Jeux de société', group: 'Jeux et jouets', categories: ['jeux'], itemWord: 'article', productTypes: ['Jeu de société', 'Jeu de cartes', 'Puzzle'], defaultUnit: 'pièce' },

  // Sport et loisirs
  { id: 'articles-sport', label: 'Articles de sport', group: 'Sport et loisirs', categories: ['sport'], itemWord: 'article', productTypes: ['Équipement sportif', 'Ballon', 'Vêtement de sport', 'Chaussures de sport'], defaultUnit: 'pièce' },
  { id: 'camping', label: 'Camping et plein air', group: 'Sport et loisirs', categories: ['sport'], itemWord: 'article', productTypes: ['Tente', 'Équipement de camping', 'Pêche', 'Glacière'], defaultUnit: 'pièce' },

  // Industrie et science
  { id: 'nettoyage-pro', label: 'Nettoyage professionnel', group: 'Industrie et science', categories: ['industrie'], itemWord: 'produit', productTypes: ['Détergent', 'Matériel de nettoyage', 'Consommable'], defaultUnit: 'pièce' },
  { id: 'laboratoire', label: 'Matériel de laboratoire', group: 'Industrie et science', categories: ['industrie'], itemWord: 'article', productTypes: ['Verrerie', 'Réactif', 'Appareil de mesure', 'Consommable'], defaultUnit: 'pièce' },

  // Équipement professionnel (CHR)
  { id: 'materiel-restauration', label: 'Matériel de cuisine pour restaurants', group: 'Équipement professionnel (CHR)', categories: ['chr'], itemWord: 'article', productTypes: ['Matériel de cuisine', 'Ustensile professionnel', 'Four / friteuse', 'Vaisselle professionnelle'], defaultUnit: 'pièce' },
  { id: 'equipement-hotelier', label: 'Équipement hôtelier et linge de table', group: 'Équipement professionnel (CHR)', categories: ['chr'], itemWord: 'article', productTypes: ['Linge de lit', 'Linge de table', 'Mobilier hôtelier', 'Accessoire de chambre'], defaultUnit: 'pièce' },
  { id: 'vetements-travail', label: 'Vêtements de travail', group: 'Équipement professionnel (CHR)', categories: ['chr'], itemWord: 'article', productTypes: ['Tenue de cuisine', 'Tablier', 'Uniforme', 'Chaussures de travail'], defaultUnit: 'pièce' },

  // Produits numériques
  { id: 'logiciels', label: 'Logiciels et licences', group: 'Produits numériques', categories: ['numerique'], itemWord: 'produit', productTypes: ['Logiciel', 'Licence', 'Application'], defaultUnit: 'licence' },
  { id: 'formation-en-ligne', label: 'Cours en ligne et e-books', group: 'Produits numériques', categories: ['numerique'], itemWord: 'produit', productTypes: ['Cours en ligne', 'E-book', 'Formation'], defaultUnit: 'accès' },
  { id: 'creations-numeriques', label: 'Créations numériques (templates, musique, polices)', group: 'Produits numériques', categories: ['numerique'], itemWord: 'produit', productTypes: ['Template', 'Musique', 'Police', 'E-book'], defaultUnit: 'fichier' },

  { id: 'autre', label: 'Autre commerce', group: 'Autre', categories: ['epicerie'], itemWord: 'produit', productTypes: [], defaultUnit: 'pièce' },
]

/** market_id d'un commerçant qui n'est rattaché à aucun marché ni magasin. */
export const INDEPENDENT_MARKET_ID = 'independant'
