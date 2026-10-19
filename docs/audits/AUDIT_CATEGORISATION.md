# Audit et refonte de la catégorisation du catalogue — Le Panier 241

Date : 18/10/2026. Migration : `supabase/023_catalog_taxonomy.sql` (NON appliquée en production). Tests : `supabase/tests/023_catalog_taxonomy_tests.sql`.

## 1. Audit de l'existant

### 1.1 Où vivent les catégories aujourd'hui

| Élément | Emplacement | Constat |
|---|---|---|
| Familles | `src/types/index.ts` (`CategoryId`, union de 20 littéraux) et `src/data/categories.ts` | Codées en dur, dupliquées dans le code. Aucune table en base. |
| Couleurs, icônes, mots-clés photo | `src/theme/tokens.ts` (`categoryColors`), `tailwind.config.js`, `components/ui/icons.tsx`, `lib/pexels.ts`, `MerchantDetail.tsx` (`categoryDotClass`) | Cinq tables `Record<CategoryId, …>` à maintenir en parallèle pour toute nouvelle famille. |
| Écrans qui listent les familles en dur | `Home.tsx`, `CategoryTabs.tsx`, `CategoryDetail.tsx`, `Search.tsx`, `BecomeMerchant.tsx`, `MerchantSpace.tsx`, `ProductPhoto.tsx`, `PexelsContext.tsx` | Les 20 familles s'affichaient partout, même vides (18 sur 20 sans produit public). |
| Types de commerce | `src/data/businessTypes.ts` | Associe un type à des familles et propose des « types de produits » (texte libre stocké dans `products.product_type`). |
| Catégories d'un commerçant | `merchants.categories text[]` | Aucun contrôle en base : n'importe quelle chaîne était acceptée. |
| Catégorie d'un produit | `products.category text` | Aucune clé étrangère : aucune garantie que la valeur existe. Un seul niveau. |
| Type de produit | `products.product_type` | Texte libre, jamais renseigné pour les produits réels (54/54 à null). |
| Variantes | `products.variant_label` + regroupement par `name` (`lib/productGroups.ts`) | Lien fragile par nom : deux produits de même nom sont fusionnés en un groupe. |
| Magasins et enseignes | `src/data/markets.ts` (ids `mkt-*`, en dur) + `custom_markets` (ids `cm-<uuid>`) | Les enseignes fixes n'existent pas en base ; `merchants.market_id` est un texte sans clé étrangère. |

### 1.2 Données réelles (base `ukaauidavtmtjithahmn`, lecture seule)

- 2 commerçants réels publics : Bâti Plus Gabon (30 produits, tous `bricolage`) et CECADO (24 produits, tous `epicerie`).
- 7 commerçants de démonstration (020) : 34 produits (`legumes`, `fruits`, `poisson`, `cereales`), invisibles du public.
- Aucune catégorie inconnue en base : toutes les valeurs de `products.category` et `merchants.categories` font partie des 20 familles.

### 1.3 Problèmes détectés

1. Taxonomie codée en dur et dupliquée (types, données, couleurs, icônes, photos, écrans).
2. Pas d'intégrité : `products.category` et `merchants.categories` acceptaient toute chaîne.
3. Un seul niveau : « Bricolage & Construction » mélange fer à béton, robinetterie, câbles, peinture, coffre-fort.
4. Produits mal classés au niveau famille chez CECADO : lessive, papier toilette, savon (droguerie) ; pain de boulangerie (la famille `boulangerie` existe) ; tomates (la famille `legumes` existe) ; jambon (frais). Tout est en `epicerie`.
5. Accueil, onglets et filtres de recherche affichaient 20 familles dont 18 vides.
6. Doublons potentiels entre familles : EPI et outillage (Industrie vs Bricolage), électroménager (High-Tech vs Maison), hygiène (Épicerie vs Beauté).
7. `businessTypes.ts` : « Équipements de sécurité (EPI) » et « Outillage manuel professionnel » rattachés à `industrie`, alors que le propriétaire veut les EPI sous Construction.
8. Liens fragiles par nom : migrations 011/012 ciblent les commerçants par `name` ; variantes regroupées par nom ; `MerchantDetail.tsx` lit la liste statique `data/markets` au lieu de `useMarkets()` (un commerçant d'un marché ajouté depuis l'app perd son enseigne dans l'en-tête si le contexte n'est pas encore chargé).
9. Aucune notion de rubrique commerçant (« Promotions ») ni de filtres par attribut.
10. `MerchantSpace.tsx` ignorait l'erreur d'insertion d'un produit (publication échouée silencieusement).

## 2. Conception

### 2.1 Vocabulaire, à partir du modèle réel

| Notion | Réalisation | Table |
|---|---|---|
| Catégorie globale (famille) | Les 20 ids actuels, conservés et immuables | `categories` (parent_id null) |
| Sous-catégorie globale | Rattachée à une famille, deux niveaux au plus | `categories` (parent_id = famille) |
| Marchand | Inchangé | `merchants` |
| Enseigne / marché | Inchangé : `mkt-*` (code) ou `cm-<uuid>` (`custom_markets`) | — |
| Boutique | La vitrine d'un marchand (`/marchand/:id`) ; pas de table en plus, pas d'un-à-un forcé marchand-enseigne | — |
| Catégories mises en avant | Sélection ordonnée de catégories globales, par enseigne OU par boutique | `storefront_categories` |
| Rubrique de boutique (collection) | Propre au marchand (« Promotions ») ; ne change jamais la catégorie globale | `merchant_sections` |
| Produit dans une rubrique | Liaison sans duplication, plusieurs rubriques possibles | `merchant_section_products` |
| Attributs filtrables | Définitions par catégorie ; valeurs en `jsonb` sur le produit (plus simple ici qu'une table de valeurs) | `category_attributes` + `products.attributes` |

### 2.2 Règles produit (garanties par la base)

- `products.category` : clé étrangère vers `categories`, doit être une famille ; `on delete restrict` (pas de cascade destructrice).
- `products.subcategory_id` : facultatif, son parent doit être `products.category` (trigger) ; `on delete set null` : retirer une sous-catégorie ramène les produits au niveau famille sans les perdre.
- Une catégorie désactivée n'est plus attribuable, mais les produits déjà classés la gardent (historique).
- Le contrôle ne se déclenche que si la catégorie ou la sous-catégorie change : prix, unité, propriétaire ne sont jamais touchés.
- `merchants.categories` : chaque valeur doit être une famille existante (trigger).
- Identifiant de catégorie immuable ; une catégorie utilisée ne change ni de niveau ni de famille.

### 2.3 Affichage

- Catégorie sans produit publiable (commerçant approuvé, non démo) masquée, sauf indicateur éditorial `is_featured`. Règle en base : `public.visible_categories(p_parent)` ; même règle côté client (`lib/catalogTaxonomy.ts`).
- Filtres d'attributs : ne proposent que les valeurs réellement présentes ; un produit sans valeur reste listé tant que le filtre n'est pas actif.

## 3. Implémentation

### 3.1 Base (migration 023)

Tables créées : `categories`, `category_attributes`, `storefront_categories`, `merchant_sections`, `merchant_section_products`.
Colonnes ajoutées : `products.subcategory_id`, `products.attributes`. Contraintes : `products_category_fkey`, `products_attributes_object`, `products_id_merchant_key` (support des clés composites).
Triggers : `guard_category_tree`, `validate_product_category`, `validate_merchant_categories` (security definer, `execute` retiré à l'API).
Fonction : `visible_categories(text)` (security definer, lecture des comptes seulement).
Données : 20 familles + 65 sous-catégories ; 12 définitions d'attributs ; mises en avant des enseignes Bâti Plus et Ceca-Gadis ; sous-catégorie de 47 produits réels ; attributs de 33 produits déduits de leurs noms et variantes. Aucun prix saisi ni modifié (ni prix du magasin, ni prix officiel DGCCRF). Garde-fous de fin : aucun produit disparu, aucun prix, nom, unité, variante, commerçant ou famille modifié.

### 3.2 Permissions (RLS)

| Table | Lecture | Écriture |
|---|---|---|
| `categories`, `category_attributes` | Actives : tous ; toutes : admin | Admin seulement |
| `storefront_categories` | Enseignes : tous ; boutiques : si commerçant approuvé non démo, propriétaire, admin | Admin (enseignes et boutiques) ; propriétaire pour SA boutique uniquement |
| `merchant_sections` | Public : rubriques visibles et actives d'un commerçant approuvé non démo ; propriétaire et admin : toutes | Propriétaire (non démo) ou admin |
| `merchant_section_products` | Si la rubrique est lisible | Propriétaire ou admin ; même commerçant pour la rubrique et le produit garanti par clés étrangères composites |

### 3.3 Front

Fichiers créés :
- `src/context/TaxonomyContext.tsx` : chargement des familles, sous-catégories, attributs, mises en avant ; repli sur `src/data/categories.ts` si la lecture échoue ou si 023 n'est pas appliquée.
- `src/lib/catalogTaxonomy.ts` : règles d'affichage (familles non vides, catégories pertinentes d'une boutique, filtres tolérants).
- `src/lib/merchantSections.ts` : lecture des rubriques (`useMerchantSections`).
- `src/components/merchant/ProductCategoryFields.tsx` : choix famille + sous-catégorie, messages d'erreur de classement.
- `src/components/merchant/FeaturedCategoriesEditor.tsx` : catégories mises en avant (enseigne ou boutique).
- `src/components/merchant/ShopSectionsManager.tsx` : rubriques, association des produits, classement des produits existants, mises en avant de la boutique.
- `src/components/admin/CategoryAdmin.tsx` : CRUD, ordre, activation, mise en avant, image des familles et sous-catégories ; attributs ; enseigne ↔ catégories ; produits sans sous-catégorie ; catégories sans produit.

Fichiers modifiés :
- `src/types/index.ts` : `Subcategory`, `CategoryAttribute`, `StorefrontCategory`, `MerchantSection`, `AttributeValue` ; `Product.subcategoryId`, `Product.attributes` ; champs facultatifs de `Category`.
- `src/context/CatalogContext.tsx` : lecture de `subcategory_id`, `attributes`, avec relecture sans ces colonnes si la migration est absente (code 42703).
- `src/App.tsx` : `TaxonomyProvider`.
- `src/pages/Home.tsx` : familles non vides seulement ; le bouton « Voir toutes les catégories » est conservé et apparaît dès que plus de 8 familles sont visibles (2 aujourd'hui, donc masqué).
- `src/components/ui/CategoryTabs.tsx` : familles non vides (la famille ouverte reste affichée).
- `src/pages/CategoryDetail.tsx` : sous-catégories non vides, filtres commerçant, prix du magasin, attributs ; adresse d'une sous-catégorie acceptée ; état vide distinct « aucun produit avec ces filtres ».
- `src/pages/Search.tsx` : filtres sur familles non vides ; recherche aussi sur les libellés de famille et sous-catégorie ; une ligne par produit (les rubriques n'entrent pas dans la recherche, aucun doublon) ; vendeur affiché sur chaque carte (inchangé).
- `src/pages/MerchantDetail.tsx` : onglets « Tout », rubriques non vides, catégories pertinentes (sélection boutique, sinon enseigne, sinon catégories des produits ; jamais une catégorie sans produit) ; état vide propre.
- `src/pages/BecomeMerchant.tsx` : familles depuis la base ; catégorie et sous-catégorie par produit ; erreur de classement expliquée.
- `src/pages/MerchantSpace.tsx` (accroche minimale) : `ProductCategoryFields` à la place du `<select>`, `subcategory_id` envoyé si choisi, erreur d'insertion affichée (saisie conservée), rendu de `ShopSectionsManager`.
- `src/pages/AdminSpace.tsx` (accroche minimale) : import et rendu de `CategoryAdmin`.

Non modifiés (conformément à la consigne) : tables de commande, `pricing.ts`, `Cart.tsx`, `Orders.tsx`, `CourierSpace.tsx`, `OrdersContext.tsx`, 022.

## 4. Vérification

### 4.1 Tests SQL (résultats réels)

Exécutés contre la base de production dans UNE transaction annulée (`begin; <023 sans begin/commit> <tests> rollback;`), rôles simulés par `set local role` + `request.jwt.claims` (anonyme, 3 commerçants de test, client, administrateur).

Résultat : 76 assertions réussies — 45 positives, 31 négatives — 0 échec. Contrôle après coup : `categories` et `merchant_sections` n'existent pas, `products.subcategory_id` absent, 0 utilisateur ni commerçant `test023` : rien n'est resté.

| Scénario | Exemples d'assertions |
|---|---|
| S1 Plusieurs marchands dans Plomberie | 3 commerçants (Bâti Plus, A, B) ; Plomberie visible avec 6 produits |
| S2 Enseigne électricité sans mode ni cosmétique | Propriétaire met en avant Électricité ; refus pour la boutique d'un autre, pour une enseigne, ligne double, identifiant mal formé ; aucune catégorie mode/beauté |
| S3 Rubrique « Promotions » | Catégorie, sous-catégorie et prix inchangés ; un produit dans deux rubriques sans duplication ; nom en double ou vide refusé ; rubrique masquée invisible du public |
| S4 Isolation des vendeurs | B ne crée ni ne renomme une rubrique de A, ne lie rien chez A, ne reclasse pas un produit de A ; A ne lie pas un produit de B (clé étrangère) ; client refusé ; admin lit tout |
| S5 Recherche multi-marchands | « robinet » : 2 résultats, 2 vendeurs identifiés ; pas de doublon dû aux rubriques |
| S6 Catégories vides masquées | Bricolage/Épicerie visibles ; Mode, Produits numériques, Légumes (démo seule), Menuiserie masquées ; indicateur éditorial ; famille désactivée masquée |
| S7 Aucune perte | Changement de catégorie sans toucher prix/unité/propriétaire ; suppression de famille utilisée refusée ; suppression de sous-catégorie : produits gardés au niveau famille ; désactivation : historique gardé, prix modifiable ; nombre et somme des prix des produits réels identiques ; produits démo et commandes intacts |
| S8 Filtres tolérants | Filtre section 2,5 ; produits sans attribut toujours lus ; 6 fers renseignés + 1 sans valeur listé ; attributs non-objet refusés |
| S9 Non-régression | 20 ids de famille ; ajout « à l'ancienne » accepté ; famille inconnue, sous-catégorie comme famille, sous-catégorie d'une autre famille, commerçant à catégorie inconnue refusés ; écriture de la taxonomie refusée aux commerçants ; produits démo toujours invisibles ; 3e niveau, id modifié, famille utilisée déplacée refusés |

Note : le premier passage a révélé que la RLS masquait les catégories désactivées au trigger (« Sous-catégorie inconnue ») ; les trois fonctions de trigger sont passées en `security definer`, puis tout est passé.

### 4.2 Build

`npm run build` (tsc + vite) : réussi. Seul avertissement : taille du paquet JS (692 ko), déjà présent avant.

### 4.3 Navigateur

Aperçu `panier241-dev` démarré en 375 x 812 : l'application s'arrête sur l'écran de connexion (garde d'authentification) et pointe vers la base de production. Je n'ai pas saisi d'identifiants (règle : pas de mot de passe réel, pas de compte créé sur la base de production). Accueil, page catégorie, boutiques Bâti Plus/CECADO et recherche n'ont donc PAS été vérifiés visuellement. Aucune erreur console sur l'écran de connexion. À faire par le propriétaire connecté, avant et après application de 023.

Comportement attendu avant application de 023 : repli statique (20 familles, filtrées aux 2 non vides), pas de sous-catégories ni de rubriques, l'espace marchand affiche « Rubriques indisponibles », l'admin affiche « Taxonomie indisponible ».

## 5. Points restants et décisions métier

Produits laissés au niveau famille (classement incertain, à trancher par le propriétaire) :
- Bâti Plus : Coffre-fort de sécurité ; Groupe électrogène 2kVA, 3.5kVA, 5kVA (Électricité ? sous-catégorie « Énergie » à créer ?) ; Surpresseur pour piscine (Plomberie ? Piscine ?).
- CECADO : Pain de boulangerie (famille `boulangerie` plus juste ?) ; Tomates locales (famille `legumes` plus juste ?). Changer de famille n'a pas été fait sans accord.
- 34 produits des 7 commerçants de démonstration : non classés (non publics).

Décisions à prendre :
1. EPI et outillage : **validé par le propriétaire le 19/10/2026**. Ils restent sous Bricolage & Construction, et `businessTypes.ts` les rattache désormais à `bricolage` (groupe « Bricolage et construction »).
2. Mises en avant des enseignes Bâti Plus et Ceca-Gadis : **validées par le propriétaire le 19/10/2026**, telles qu'appliquées par 023 (Bâti Plus : matériaux, ciment, carrelage, plomberie, électricité, peinture, outillage ; Ceca-Gadis : épicerie salée, boissons, produits frais, droguerie).
3. Liste des 65 sous-catégories : à relire (issue de la liste du propriétaire et des types de produits de `businessTypes.ts`).
4. Une famille créée par l'admin s'affiche avec l'icône générique et la couleur de marque : ajouter icône/couleur dans `tokens.ts`, `tailwind.config.js`, `icons.tsx`, `pexels.ts` si elle doit durer.
5. `PexelsContext` et `ProductPhoto` gardent la liste statique pour les photos et couleurs (jetons de design) : volontaire.
6. Écarts relevés hors périmètre : `MerchantDetail.tsx` lit `data/markets` au lieu de `useMarkets()` ; l'URL du projet Supabase est codée en dur dans les contraintes d'image (même pratique que 019).

## 6. Application

1. Relire `supabase/023_catalog_taxonomy.sql`. Prérequis : 020 appliquée. Indépendante de 022.
2. Éditeur SQL Supabase : exécuter le fichier entier (il contient `begin; … commit;`). En cas d'erreur, rien n'est appliqué.
3. Optionnel : rejouer les tests `begin; <tests/023_catalog_taxonomy_tests.sql> rollback;` (attendu : 45 positif, 31 négatif).
4. Déployer le front (fonctionne avant comme après la migration grâce aux replis).
5. Vérifier connecté en 375 x 812 : accueil (2 familles), page Bricolage (sous-catégories, filtres), boutiques Bâti Plus et CECADO (onglets catégories), recherche « plomberie », espace marchand (rubriques), admin (catégories).
6. Retour arrière : supprimer les 5 tables, les 3 triggers et fonctions, `visible_categories`, les contraintes `products_category_fkey`, `products_attributes_object`, `products_id_merchant_key` et les colonnes `products.subcategory_id`, `products.attributes` (aucune autre donnée n'est modifiée par 023).
