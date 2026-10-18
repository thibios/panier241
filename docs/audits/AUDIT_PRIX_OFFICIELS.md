# Audit des prix officiels DGCCRF (table `official_prices`)

Date de l'audit : 18 octobre 2026. Audit en lecture seule : aucune écriture en base.

## 1. Sources consultées

| Source | URL | Résultat |
|---|---|---|
| Page officielle DGCCRF | https://dgccrf.ga/echo-liste-produit | Injoignable le 18/10/2026 (connexion refusée, ports 80 et 443, aussi sur www.dgccrf.ga) |
| Archive web du 15/01/2026 | http://web.archive.org/web/20260115121039/https://dgccrf.ga/echo-liste-produit | Copie complète récupérée, utilisée comme référence |
| Archive web du 23/06/2025 | http://web.archive.org/web/20250623033944/https://dgccrf.ga/echo-liste-produit | Contenu identique à celle de 2026 (seule l'année du pied de page change) |
| Archive web du 24/07/2024 | http://web.archive.org/web/20240724191249/https://dgccrf.ga/echo-liste-produit | Ancienne version de la liste (autres produits, autres prix, ciment et fer à béton) : périmée, non utilisée |
| Contexte réglementaire | https://www.gabonreview.com/gabon-une-nouvelle-mercuriale-pour-baisser-les-prix-de-67-produits-importes/ | Mercuriale de 67 produits importés, arrêté n° 632/PM du 18 juillet 2023 ; ne donne pas la liste détaillée |

Fonctionnement de la page : la liste n'est ni paginée ni chargée en JavaScript. Les 7 onglets (Viande, volaille, poisson / Conserves de poisson / Conserves de légumes / Pâtes alimentaires / Produits laitiers / Riz / Produits alimentaires locaux) sont tous dans le HTML. Aucun endpoint API, fichier JSON ou PDF n'est lié. Les seuls autres liens de la rubrique sont `echo-produit-petrolier` (carburants, hors sujet) et la page elle-même.

Colonnes publiées par la source : N°, Désignation, Prix gros, Prix demi-gros, Prix détail. La source ne publie **ni l'unité de vente au détail, ni le montant des taxes, ni de date par produit**. Le titre de la page indique seulement « produits défiscalisés à prix bloqués ».

Rappel : tous ces montants sont des **prix plafonds officiels DGCCRF**, pas des prix relevés en magasin.

## 2. Constat principal : 60 produits publiés sur 67 annoncés

La page s'intitule « Liste des 67 produits défiscalisés à prix bloqués », mais elle ne contient que les numéros 1 à 60, sans trou de numérotation. Le dernier tableau, « Poisson de pêche locale (pêche artisanale) », a un en-tête de colonnes mais **aucune ligne**.

Les 7 produits manquants ne sont donc pas publiés par la source : aucun nom, aucun prix n'est disponible. Hypothèse plausible, non prouvée : ils correspondent à ce tableau vide de poisson de pêche locale. Aucun produit n'a été inventé ni repris de l'ancienne liste de 2024 (prix périmés, numérotation différente).

Pour obtenir les 7 produits, il faut le texte officiel (arrêté n° 632/PM du 18 juillet 2023 et ses mises à jour) ou une nouvelle publication de la DGCCRF quand le site sera de nouveau accessible.

## 3. Comparaison source / migration 016 / base

| Élément | Source (archive 15/01/2026) | Migration `supabase/016_cancel_and_official_prices.sql` | Base `ukaauidavtmtjithahmn` |
|---|---|---|---|
| Nombre de produits | 60 publiés (67 annoncés) | 60 | 60 |
| Numéros | 1 à 60 | 1 à 60 | 1 à 60 |
| Prix gros, demi-gros, détail | référence | identiques aux 60 lignes | identiques à la migration |
| Demi-gros du sucre (53 à 60) | case vide | `null` | `null` |
| Date de relevé | non publiée | `2026-10-18` | `2026-10-18` |

Aucune autre migration ni aucun seed ne touche `official_prices` (recherche dans `supabase/`, `src/` et `docs/`). Une seule migration en base : `20261018033319 cancel_and_official_prices`.

### Écarts trouvés

| N° | Champ | Source | Migration / base | Statut | Action en 021 |
|---|---|---|---|---|---|
| 3 | Catégorie | VIANDE DE BOEUF (tableau à part) | Viande de porc | Erreur prouvée | Corrigé en « Viande de bœuf » |
| 10, 11, 12 | Catégorie | POISSON | Poisson surgelé | Mot « surgelé » absent de la source | Corrigé en « Poisson » |
| 30 à 44 | Catégorie | Laits matières grasses animales (30-36), Laits matières grasses végétales (37-42), Laits infantiles (43-44) | Produits laitiers | Regroupement sous le nom de l'onglet de la source, acceptable | Aucune |
| 45 à 50 | Catégorie | Riz parfumé au jasmin entier | Riz parfumé au jasmin | Mot « entier » retiré, sans effet | Aucune |
| 1 à 60 | Unité de détail | Non publiée | « le kg », « la boîte », « le paquet », etc. | Déduite, non sourcée | Aucune (pas de valeur officielle pour corriger), à signaler dans l'interface |
| tous | Source (texte) | 67 produits annoncés | « liste des 67 produits » | Exact au mot près, mais 60 seulement sont affichés | Aucune |
| 11 | Désignation | « Yellow Croacker » | « Yellow Croaker » | Faute de frappe de la source corrigée | Aucune |
| divers | Désignation | « Sardines à huile en boîte », « 125g », « 1Kg », « sans oeufs » | « Sardines à l'huile », « 125 g », « 1 kg », « sans œufs » | Mise en forme typographique, même produit | Aucune |

Aucun écart de prix sur les 60 produits.

## 4. Relations avec le reste de la base

- Aucune clé étrangère ne pointe vers `official_prices` ; seule contrainte : la clé primaire `id`.
- Aucune colonne d'autre table ne fait référence à un prix officiel (recherche sur `official`, `dgccrf`, `plafond`, `numero`).
- Aucun déclencheur ni vue sur la table.
- Seul consommateur : `src/pages/OfficialPrices.tsx` (lecture `select`, catégories calculées à partir de `categorie`). La correction des catégories change donc seulement les filtres affichés sur cette page.
- Point d'attention : `numero` n'a pas de contrainte d'unicité. Le contrôle de la migration 021 vérifie 60 numéros distincts ; une contrainte `unique (numero)` serait à envisager.

## 5. Migration préparée (non appliquée)

Fichier : `supabase/021_official_prices_complete.sql`.

- Aucun `insert` : aucun produit manquant n'est officiellement publié.
- Deux `update` ciblés (n° 3, n° 10 à 12), avec conditions sur l'ancienne valeur pour ne rien écraser si la donnée a déjà changé.
- Contrôle final : la transaction échoue si la table n'a pas exactement 60 lignes et 60 numéros distincts.
- Remarque : le dossier `supabase/` passe de 019 à 021, il n'y a pas de fichier 020.
- La date de relevé reste `2026-10-18`. Le site étant injoignable ce jour-là, la vérification repose sur l'archive du 15/01/2026. Il faudra la confirmer sur le site dès qu'il sera de nouveau accessible.

## 6. Annexe : liste complète publiée par la source (60 produits)

Catégorie = intitulé du tableau de la source. Désignations et prix recopiés tels quels (archive du 15/01/2026).

| N° | Catégorie (source) | Désignation (source) | Prix gros | Prix demi-gros | Prix détail |
|---|---|---|---|---|---|
| 1 | Viande de porc | Cotis de Porc viandé | 16 340 F CFA | 16 990 F CFA | 1 875 F CFA |
| 2 | Viande de porc | Cotis de Porc semi viandé | 13 350 F CFA | 13 900 F CFA | 1 550 F CFA |
| 3 | Viande de boeuf | Rognons emballage bloc | 9 250 F CFA | 9 500 F CFA | 1 000 F CFA |
| 4 | Volaille | Cuisses de Poulet (USA) | 9 300 F CFA | 9 650 F CFA | 1 050 F CFA |
| 5 | Volaille | Cuisses de Poulet (Brésil) | 9 550 F CFA | 9 950 F CFA | 1 100 F CFA |
| 6 | Volaille | Pilons de Poulet (USA) | 10 145 F CFA | 10 460 F CFA | 1 150 F CFA |
| 7 | Volaille | Ailes de Poulet 3 phalanges B | 10 700 F CFA | 11 100 F CFA | 1 200 F CFA |
| 8 | Volaille | Ailes de Poule | 12 465 F CFA | 12 990 F CFA | 1 445 F CFA |
| 9 | Volaille | Ailes de Dinde 3 phalanges | 14 290 F CFA | 15 030 F CFA | 1 650 F CFA |
| 10 | Poisson | Maquereaux 300g - 500g (ASIE) | 15 300 F CFA | 16 065 F CFA | 1 800 F CFA |
| 11 | Poisson | Bar Amérique du Sud (y compris Corvina ou Yellow Croacker) | 15 600 F CFA | 16 250 F CFA | 1 800 F CFA |
| 12 | Poisson | Tilapia 300g - 500g (ASIE) | 11 890 F CFA | 12 490 F CFA | 1 375 F CFA |
| 13 | Conserves de poisson | Sardines à huile Princesse 125g x 50 (Afrique du Nord) | 13 795 F CFA | 14 210 F CFA | 310 F CFA |
| 14 | Conserves de poisson | Sardines à huile en boîte BELMA 125g x 50 | 17 085 F CFA | 17 615 F CFA | 385 F CFA |
| 15 | Conserves de poisson | Sardines à la tomate en boîte BELMA 425g x 24 | 16 450 F CFA | 16 955 F CFA | 775 F CFA |
| 16 | Conserves de poisson | Maquereaux BELMA et Africa Queen Bande Rouge 425g x 24 | 20 120 F CFA | 20 595 F CFA | 880 F CFA |
| 17 | Conserves de poisson | Maquereaux Africa Queen Bande Bleue 425g x 24 | 13 300 F CFA | 13 935 F CFA | 650 F CFA |
| 18 | Conserves de poisson | Maquereaux TOMACK 425g x 24 | 12 060 F CFA | 12 695 F CFA | 600 F CFA |
| 19 | Conserves de legumes | Tomate double concentrée SALSA 70g x 100 | 10 260 F CFA | 10 565 F CFA | 115 F CFA |
| 20 | Conserves de legumes | Tomate double concentrée ALBA 70g x 100 | 10 020 F CFA | 10 320 F CFA | 115 F CFA |
| 21 | Conserves de legumes | Tomate double concentrée ABC 70g x 100 | 10 685 F CFA | 11 015 F CFA | 120 F CFA |
| 22 | Conserves de legumes | Tomate entière pelée SALSA 400g x 24 | 9 445 F CFA | 9 820 F CFA | 450 F CFA |
| 23 | Conserves de legumes | Tomate entière pelée ALBA 400g x 24 | 11 250 F CFA | 11 600 F CFA | 530 F CFA |
| 24 | Conserves de legumes | Tomate entière pelée ABC 400g x 24 | 9 680 F CFA | 9 980 F CFA | 455 F CFA |
| 25 | Conserves de legumes | Tomate entière pelée TOP BUDGET 400g x 12 | 4 625 F CFA | 4 770 F CFA | 435 F CFA |
| 26 | Pates alimentaires | Spaghetti sans oeufs ALIX 250g x 40 | 6 060 F CFA | 6 240 F CFA | 170 F CFA |
| 27 | Pates alimentaires | Spaghetti sans oeufs RINO 250g x 40 | 6 065 F CFA | 6 250 F CFA | 175 F CFA |
| 28 | Pates alimentaires | Spaghetti sans oeufs PASTA ROMA 500g x 20 | 5 335 F CFA | 5 495 F CFA | 300 F CFA |
| 29 | Pates alimentaires | Spaghetti sans oeufs ALIX 500g x 20 | 5 345 F CFA | 5 505 F CFA | 300 F CFA |
| 30 | Laits matieres grasses animales | Lait Concentré non Sucré BOCAGE 160g x 48 | 12 760 F CFA | 13 230 F CFA | 315 F CFA |
| 31 | Laits matieres grasses animales | Lait Concentré Sucré BONNET ROUGE 1Kg x 24 | 36 270 F CFA | 37 355 F CFA | 1 680 F CFA |
| 32 | Laits matieres grasses animales | Lait en Poudre BONNET ROUGE 16g x 120 | 10 200 F CFA | 10 510 F CFA | 95 F CFA |
| 33 | Laits matieres grasses animales | Lait en Poudre BRIDEL 400g x 24 | 44 210 F CFA | 46 555 F CFA | 2 205 F CFA |
| 34 | Laits matieres grasses animales | Lait en Poudre BRIDEL 900g x 12 | 51 900 F CFA | 54 650 F CFA | 5 175 F CFA |
| 35 | Laits matieres grasses animales | Lait en Poudre COWBELL 18g x 120 | 9 225 F CFA | 9 500 F CFA | 85 F CFA |
| 36 | Laits matieres grasses animales | Lait en Poudre COWBELL 400g x 12 | 44 880 F CFA | 47 160 F CFA | 2 125 F CFA |
| 37 | Laits matieres grasses vegetales | Lait Concentré Sucré BOCAGE 397g x 48 | 23 000 F CFA | 24 250 F CFA | 575 F CFA |
| 38 | Laits matieres grasses vegetales | Lait Concentré Sucré BOCAGE 1kg x 24 | 25 400 F CFA | 26 750 F CFA | 1 275 F CFA |
| 39 | Laits matieres grasses vegetales | Lait Concentré Sucré BONNET ROUGE (NOUVEAU) 397g x 24 | 14 530 F CFA | 14 970 F CFA | 680 F CFA |
| 40 | Laits matieres grasses vegetales | Lait Concentré Sucré BONNET ROUGE (NOUVEAU) 1Kg x 24 | 33 670 F CFA | 34 130 F CFA | 1 550 F CFA |
| 41 | Laits matieres grasses vegetales | Lait en Poudre BOCAGE 400g x 24 | 43 100 F CFA | 45 365 F CFA | 2 150 F CFA |
| 42 | Laits matieres grasses vegetales | Lait en Poudre BOCAGE 900g x 12 | 46 000 F CFA | 48 400 F CFA | 4 600 F CFA |
| 43 | Laits infantiles | Guigoz 1er et 2ème âge 400g x 12 | 27 150 F CFA | 28 250 F CFA | 2 600 F CFA |
| 44 | Laits infantiles | NIDO 1+ 400g x 12 | 30 000 F CFA | 30 750 F CFA | 2 750 F CFA |
| 45 | Riz parfume au jasmin entier | Riz parfumé ELEPHANT (10lbs ou 4,54Kg x 10) | 39 650 F CFA | 41 735 F CFA | 4 745 F CFA |
| 46 | Riz parfume au jasmin entier | Riz parfumé ELEPHANT (25lbs ou 11,375Kg x 4) | 37 550 F CFA | 39 115 F CFA | 10 865 F CFA |
| 47 | Riz parfume au jasmin entier | Riz parfumé ELEPHANT (50lbs ou 22,68Kg) | 18 990 F CFA | 19 985 F CFA | 22 715 F CFA |
| 48 | Riz parfume au jasmin entier | Riz parfumé SUPER ELEPHANT (20lbs ou 9,1Kg x 5) | 33 275 F CFA | 35 270 F CFA | 7 560 F CFA |
| 49 | Riz parfume au jasmin entier | Riz parfumé SUPER ELEPHANT (44,1lbs ou 20Kg) | 14 010 F CFA | 14 850 F CFA | 16 100 F CFA |
| 50 | Riz parfume au jasmin entier | Riz parfumé SUPER ELEPHANT (96,7lbs ou 44Kg) | 30 300 F CFA | 32 115 F CFA | 35 000 F CFA |
| 51 | Huile raffinee | Huile de palme Cuisin'or 0,9L | 10 705 F CFA | 11 025 F CFA | 1 000 F CFA |
| 52 | Huile raffinee | Huile de palme Cuisin'or 2L | 10 690 F CFA | 11 000 F CFA | 2 000 F CFA |
| 53 | Sucre | Sucre blanc morceaux 1Kg (carton de 25 paquets) | 22 750 F CFA | - | 925 F CFA |
| 54 | Sucre | Sucre blanc morceaux 1Kg (carton de 20 paquets) | 18 150 F CFA | - | 925 F CFA |
| 55 | Sucre | Sucre roux morceaux 1Kg (carton de 25 paquets) | 21 375 F CFA | - | 875 F CFA |
| 56 | Sucre | Sucre roux morceaux 1Kg (carton de 20 paquets) | 17 175 F CFA | - | 875 F CFA |
| 57 | Sucre | Sucre blanc granulé 1Kg (carton de 25 paquets) | 22 100 F CFA | - | 900 F CFA |
| 58 | Sucre | Sucre blanc granulé 1Kg (carton de 20 paquets) | 17 650 F CFA | - | 900 F CFA |
| 59 | Sucre | Sucre roux granulé 1Kg (carton de 25 paquets) | 20 150 F CFA | - | 825 F CFA |
| 60 | Sucre | Sucre roux granulé 1Kg (carton de 20 paquets) | 16 200 F CFA | - | 825 F CFA |
| 61 à 67 | Poisson de peche locale (peche artisanales) | Tableau vide : non publiés | - | - | - |
