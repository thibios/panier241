# Le Panier 241 — Product Requirements Document (PRD)

| Élément | Valeur |
|---|---|
| Produit | Le Panier 241, marketplace mobile de commerces de proximité (Libreville, Gabon) |
| Version du document | 1.0 |
| Date | 18 octobre 2026 |
| Base de vérification | Code du dépôt `panier241` (front React, migrations Supabase `schema.sql` et `002` à `019`, `vercel.json`, `api/pexels.ts`) |
| Environnement | Production : https://panier241.vercel.app (migrations 002 à 019 déclarées appliquées) |
| Public | PM, UX, développeurs, QA, propriétaire du produit |

Convention de statut utilisée dans tout le document :

| Statut | Signification |
|---|---|
| Implémentée | Présente dans le code, utilisable de bout en bout, règle protégée côté base quand c'est nécessaire. |
| Partielle | Présente mais incomplète, contournable, ou en contradiction avec une autre partie du produit. |
| Non implémentée | Aucune trace dans le code ni dans le schéma. |

Les preuves sont données sous la forme `fichier:ligne` ou `migration`. Les numéros de ligne sont ceux du dépôt au 18 octobre 2026.

---

## 1. Résumé exécutif

Le Panier 241 permet à un habitant du Grand Libreville de commander auprès d'un commerçant de marché, d'un magasin ou d'un commerce indépendant, puis de se faire livrer par un livreur indépendant ou de retirer sur le stand. Le paiement se fait à la réception, au livreur, en espèces, Airtel Money ou Moov Money. Aucun paiement n'est encaissé dans l'application.

L'application est déjà fonctionnelle de bout en bout pour quatre acteurs : client, commerçant, livreur, administrateur. Le socle technique est sain : React 18 + Vite + TypeScript + Tailwind, Supabase (Postgres avec RLS, Auth email et mot de passe, Storage), hébergement Vercel, en-têtes de sécurité stricts.

L'audit du code fait apparaître cinq écarts qui empêchent un lancement public serein :

1. L'ajustement du montant réel par le commerçant est annoncé (CGU, Aide, panier, espace marchand) mais il est silencieusement annulé par la base (`014_security_hardening.sql`, trigger `protect_order_columns`).
2. Le « retrait sur stand » facture quand même la livraison et envoie la commande aux livreurs.
3. Les montants sont calculés et envoyés par le navigateur ; la base ne les recalcule pas.
4. Le livreur ne reçoit ni l'adresse complète ni la position GPS du client : seulement « libellé · quartier, ville ».
5. Des commerçants de démonstration avec des notes inventées (par exemple 4,8 sur 156 avis) existent dans la migration `002_merchant_space.sql`. Leur présence en production doit être vérifiée ; ils contredisent la règle « pas de faux avis, pas de faux comptes ».

Le MVP proposé (section 24) consiste à corriger ces écarts, à verrouiller la machine à états des commandes côté base, à définir le circuit de l'argent, puis à lancer sur un nom de domaine propre. Les paiements intégrés, les notifications, le suivi et le code de réception relèvent de la Phase 2.

---

## 2. Vision

Faire du Panier 241 le moyen le plus simple, à Libreville, d'acheter chez les commerçants qu'on connaît déjà, sans se déplacer, au juste prix.

Principes directeurs :

- **Proximité réelle.** Des commerçants réels, vérifiés par l'équipe, rattachés à des lieux réels. Aucun faux compte, aucun faux avis, aucune métrique inventée.
- **Transparence du prix.** Le client voit le détail du total avant de commander. Il peut comparer avec les prix officiels de la DGCCRF quand il le souhaite.
- **Adapté au terrain.** Paiement à la réception, mobile money courant, connexion parfois instable, adresses décrites par des repères plus que par des numéros de rue.
- **Identité sobre.** Palette vert profond, olive, jaune ivoire ; logo officiel « Le Panier 241 ». Pas de look générique (dégradés violets, emoji, chiffres décoratifs).

---

## 3. Problématique

| Acteur | Problème constaté ou supposé | Statut de l'information |
|---|---|---|
| Client | Faire les courses au marché prend du temps (trajet, embouteillages, attente). Les commandes par WhatsApp ou appel sont informelles : pas de récapitulatif, pas de prix clair, pas de suivi. | Hypothèse, à valider par entretiens |
| Client | Méfiance sur les prix pratiqués, notamment sur les produits de première nécessité dont le prix est plafonné par l'État. | Hypothèse ; la liste DGCCRF existe (`016`) |
| Commerçant | Peu ou pas de présence en ligne ; ventes limitées aux clients qui passent au stand. | Hypothèse |
| Livreur | Revenus irréguliers ; courses trouvées par bouche-à-oreille. | Hypothèse |
| Tous | Les adresses sont imprécises (quartier, repère) ; le GPS n'est pas systématique. | Constaté dans le produit : GPS facultatif, forfait sans GPS (`src/lib/pricing.ts:1-4`) |

Aucune donnée chiffrée de marché n'a été fournie. Ce PRD n'en invente pas.

---

## 4. Objectifs

### 4.1 Objectifs produit (MVP)

| ID | Objectif | Mesure (voir section 23) |
|---|---|---|
| O1 | Un client peut commander et être livré sans contact préalable avec le commerçant. | Taux de commandes livrées |
| O2 | Le total payé à la livraison est juste, explicable et non falsifiable. | Écart total commandé / total encaissé ; nombre d'ajustements |
| O3 | Chaque commerçant, livreur, marché et magasin visible a été validé par l'administrateur. | 100 % des entités visibles au statut `approved` |
| O4 | Le livreur trouve le client du premier coup. | Taux de livraisons avec GPS ; durée acceptation → livraison |
| O5 | Aucune donnée affichée n'est fictive. | Zéro commerçant ou avis de démonstration en production |

### 4.2 Non-objectifs du MVP

- Encaissement en ligne.
- Suivi du livreur sur carte en temps réel.
- Multi-pays, multi-devises, multilingue.
- Publicité et promotions payantes.

---

## 5. Public cible

| Segment | Description | Priorité |
|---|---|---|
| Clients urbains actifs | Salariés et indépendants du Grand Libreville (Libreville, Akanda, Owendo) disposant d'un smartphone et d'un mobile money. | Primaire |
| Familles | Foyers qui font des courses alimentaires régulières (légumes, poisson, riz, huile). | Primaire |
| Commerçants de marché | Vendeurs installés dans un marché (ex. Mont-Bouët). | Primaire (offre) |
| Magasins et enseignes | Supermarchés, quincailleries (ex. Bâti Plus, Ceca-Gadis, Centr' Affaires, présents dans `src/data/markets.ts`). | Secondaire |
| Commerces indépendants | Restaurants, pâtisseries, boutiques de quartier, non rattachés à un marché (`market_id = 'independant'`, `018`). | Secondaire |
| Livreurs indépendants | À moto, vélo, voiture ou à pied (`src/pages/BecomeCourier.tsx:11`). | Primaire (logistique) |

La zone couverte par le produit est le Grand Libreville et sa périphérie proche : 111 quartiers répartis en 7 zones (`src/data/neighborhoods.ts`), de Libreville centre à Ntoum.

---

## 6. Personas

Les personas suivants sont des hypothèses de travail construites à partir du produit et du contexte local. Ils ne proviennent pas d'une étude utilisateur.

### 6.1 Nadège, cliente

- 34 ans, comptable dans une entreprise du centre-ville, habite Angondjé (Akanda).
- Fait le marché le samedi ; perd une demi-journée dans les embouteillages.
- Paie ses factures par Airtel Money. Utilise WhatsApp en permanence.
- Attentes : commander le vendredi soir pour une livraison le samedi matin ; connaître le prix total avant ; ne pas payer d'avance un commerçant qu'elle ne connaît pas.
- Frustrations : le livreur qui appelle dix fois faute d'adresse claire ; le prix qui change à l'arrivée sans explication.

### 6.2 Maman Odette, commerçante de marché

- 52 ans, vend légumes et feuilles de manioc au marché Mont-Bouët depuis 20 ans.
- Smartphone Android d'entrée de gamme, forfait data limité.
- Prend déjà des commandes par téléphone de clientes fidèles.
- Attentes : recevoir les commandes simplement, ajuster le prix quand le cours du jour a changé, être payée sans délai.
- Frustrations : formulaires longs, photos lourdes à envoyer, impression d'être contrôlée.

### 6.3 Steeve, gérant de quincaillerie

- 41 ans, gère un dépôt de matériaux à Oloumi.
- Vend du ciment, du fer à béton, de l'outillage ; paniers de valeur élevée (plusieurs centaines de milliers de F CFA possibles, cf. `011` et `012`).
- Attentes : catalogue avec variantes (diamètre, poids), clients sérieux, acompte sur les grosses commandes.
- Frustrations : livraisons de charges lourdes non adaptées à une moto.

### 6.4 Junior, livreur

- 24 ans, scooter personnel, habite Nzeng-Ayong.
- Fait déjà des courses pour des voisins et des restaurants.
- Attentes : voir les courses disponibles près de lui, connaître son gain avant d'accepter, joindre le client facilement.
- Frustrations : transporter des sommes en espèces importantes ; clients absents.

### 6.5 L'administrateur

- Le fondateur du produit, seul administrateur à ce jour (reconnu par son email, `006_admin_approval.sql:4-13`).
- Attentes : valider rapidement les inscriptions, suspendre un compte problématique, avoir une vue sur les commandes.
- Frustration actuelle : aucune vue des commandes dans l'application (aucune policy admin sur `orders`).

---

## 7. Proposition de valeur

| Pour | Le Panier 241 apporte | Preuve dans le produit |
|---|---|---|
| Client | Ses commerçants habituels, livrés à domicile, avec un total détaillé avant de commander et un paiement à la réception. | `src/pages/Cart.tsx:321-340` (détail du total), `src/data/addresses.ts:3-7` (moyens de paiement) |
| Client | La possibilité de vérifier un prix face au prix plafond officiel. | `/prix-officiels`, `src/pages/OfficialPrices.tsx` |
| Client | Une vidéo de sa liste de courses pour éviter les erreurs. | `src/pages/Cart.tsx:288-308` |
| Commerçant | Une vitrine en ligne gratuite (à ce jour) et un flux de commandes structuré. | `src/pages/BecomeMerchant.tsx`, `src/pages/MerchantSpace.tsx` |
| Livreur | Une liste de courses disponibles, filtrable par marché. | `src/pages/CourierSpace.tsx:82-83, 289-322` |

Différenciation recherchée : la confiance (validation de chaque acteur, avis réservés aux commandes livrées, prix officiels consultables) plutôt que la vitesse.

---

## 8. Périmètre

### 8.1 Dans le périmètre actuel (code existant)

Catalogue, recherche, favoris, adresses, panier mono-commerçant, créneaux, commande, annulation, avis, espaces commerçant, livreur et administrateur, prix officiels, pages légales, aide, contact.

### 8.2 Hors périmètre actuel

Paiement intégré, notifications push, SMS ou email transactionnels, suivi temps réel, carte, code de réception, commissions vendeurs, publicité, promotions, litiges, documents des livreurs, mode hors ligne, multi-pays.

### 8.3 Sujets transverses traités dans ce PRD

| Sujet | Section |
|---|---|
| Commissions vendeurs | 14.4, 17.5, 32 |
| Publicité | 17.6, 26 |
| Promotions et codes promo | 12.8, 25 |
| Validation de réception | 15.5, Décision D5 |
| Gestion documentaire des livreurs | 18.4 |
| Connectivité limitée | 22.6 |
| Autres marchés (devise, langues, découpage) | 26.2 |

---

## 9. Acteurs

| Acteur | Accès | Création | Validation | Preuve |
|---|---|---|---|---|
| Visiteur non connecté | Pages `/cgu`, `/confidentialite`, `/nouveau-mot-de-passe` et écran de connexion uniquement | — | — | `src/App.tsx:89-94` |
| Client | Toute l'application après connexion | Inscription email + mot de passe, prénom, nom, téléphone | Aucune | `src/context/AuthContext.tsx:48-57`, `schema.sql:24-43` |
| Commerçant | Espace `/marchand-espace` | Formulaire `/devenir-marchand` | Obligatoire (`pending` → `approved`) | `006`, `src/pages/MerchantSpace.tsx:233-252` |
| Livreur | Espace `/livreur-espace` | Formulaire `/devenir-livreur` | Obligatoire | `006`, `014`, `src/pages/CourierSpace.tsx:169-188` |
| Administrateur | Espace `/admin` | Email codé en dur | — | `src/context/AuthContext.tsx:25-29`, `006_admin_approval.sql:4-13` |

Un même compte peut être à la fois client, commerçant et livreur. Un compte ne peut détenir qu'un seul commerce (`maybeSingle()` dans `src/pages/MerchantSpace.tsx:98`) et un seul profil livreur (`owner_id unique`, `004`).

---

## 10. Fonctionnalités par acteur

### 10.1 Client

| Fonctionnalité | Statut | Preuve | Remarque |
|---|---|---|---|
| Inscription, connexion email + mot de passe | Implémentée | `src/context/AuthContext.tsx:48-62`, `src/pages/Auth.tsx` | Confirmation d'email désactivée selon `README.md` (étape 3). |
| Mot de passe oublié | Implémentée | `src/pages/Auth.tsx:62-63`, `src/pages/ResetPassword.tsx:33` | |
| Acceptation CGU et confidentialité à l'inscription | Partielle | `src/pages/Auth.tsx:253-259` | Mention passive, pas de case à cocher ni de version acceptée enregistrée. |
| Accueil : « À la une », catégories, magasins, commerçants, marchés, produits à découvrir | Implémentée | `src/pages/Home.tsx:91-111, 155-240` | |
| 8 catégories | Implémentée | `src/data/categories.ts` | |
| Fiche marché ou magasin | Implémentée | `src/pages/MarketDetail.tsx` | |
| Fiche catégorie (produits groupés, « à partir de ») | Implémentée | `src/pages/CategoryDetail.tsx:35-96` | |
| Fiche commerçant, produits avec variantes | Implémentée | `src/pages/MerchantDetail.tsx:200-270`, `012` | |
| Recherche (produits, commerces, lieux, quartiers), sans accents, tri par prix, suggestions | Implémentée | `src/pages/Search.tsx:15-80` | Recherche locale sur tout le catalogue chargé ; limite de 40 produits affichés. |
| Favoris (commerçants) | Implémentée | `src/context/FavoritesContext.tsx`, `schema.sql:64-77` | Pas d'écran listant les favoris ; compteur seulement dans le profil. |
| Adresses avec GPS facultatif | Partielle | `src/pages/Profile.tsx:99-117, 155-168`, `007` | Ajout seulement : ni modification, ni suppression, ni choix de l'adresse par défaut. Quartier en texte libre (le sélecteur des 111 quartiers n'est utilisé que pour les commerçants). Ville forcée à « Libreville ». |
| Photo de profil | Implémentée | `013`, `src/lib/avatar.ts`, `src/pages/Profile.tsx:119-144` | |
| Modification du téléphone | Implémentée | `src/pages/Profile.tsx:146-153` | Nom et prénom non modifiables. |
| Panier mono-commerçant en `sessionStorage` | Implémentée | `src/context/CartContext.tsx:36-63` | L'ajout d'un produit d'un autre commerçant vide le panier, avec avertissement (`MerchantDetail.tsx:192-195`). Panier perdu à la fermeture de l'onglet. |
| Choix du créneau (5 jours, matin / après-midi / soir / retrait) | Implémentée | `src/data/deliverySlots.ts`, `src/pages/DeliverySlot.tsx` | Aucune capacité par créneau ; un créneau passé resté en session n'est pas revalidé. |
| Retrait sur stand | Partielle | `src/data/deliverySlots.ts:7` | Frais de livraison facturés quand même ; commande proposée aux livreurs (voir 16). |
| Calcul du total (5 % + 2 000 F + 300 F/km, forfait 1 500 F sans GPS) | Partielle | `src/lib/pricing.ts`, `src/context/CartContext.tsx:90-102` | Calcul côté client uniquement ; aucun recalcul serveur. Les lieux ajoutés depuis l'application n'ont pas de coordonnées : forfait systématique. |
| Choix du moyen de paiement | Partielle | `src/pages/Cart.tsx:260-286` | Non enregistré sur la commande ; transmis seulement dans le message WhatsApp. |
| Vidéo de liste de courses | Partielle | `src/pages/Cart.tsx:106-117, 288-308`, `008`, `014` | Échec d'envoi silencieux ; bucket public (vidéo accessible à toute personne disposant de l'URL). |
| Envoi de la commande par WhatsApp au commerçant | Implémentée | `src/pages/Cart.tsx:93-104, 349-359`, `src/lib/whatsapp.ts` | Complément, pas un remplacement de la commande en base. |
| Passer la commande | Partielle | `src/pages/Cart.tsx:106-147`, `src/context/OrdersContext.tsx:94-128` | Possible sans adresse ; erreur d'enregistrement ignorée, le panier est vidé quand même. |
| Suivi des commandes (en cours / passées, frise de statut) | Implémentée | `src/pages/Orders.tsx`, `src/components/ui/OrderProgress.tsx` | Rafraîchi au chargement seulement ; pas de temps réel. |
| Pastille « commandes mises à jour » | Implémentée | `src/context/OrdersContext.tsx:150-160`, `BottomNav.tsx` | Calculée à partir d'un état local (`localStorage`). |
| Annulation tant qu'en préparation, avec motif | Implémentée | `016`, `src/pages/Orders.tsx:86-145`, `OrdersContext.tsx:131-148` | |
| Contacter le livreur par WhatsApp | Implémentée | `src/pages/Orders.tsx:215-225` | |
| Avis 1 à 5 étoiles + commentaire après livraison | Partielle | `005`, `014`, `src/pages/Orders.tsx:37-84` | La note moyenne s'affiche ; les commentaires ne sont affichés nulle part. |
| Prix officiels DGCCRF | Implémentée | `016`, `src/pages/OfficialPrices.tsx` | Accessible depuis le panier et le motif d'annulation, pas depuis l'accueil (conforme à la décision). |
| Proposer un marché ou un magasin | Implémentée | `015`, `017`, `019`, `src/context/MarketsContext.tsx:87-130` | Magasin : logo obligatoire (contrainte base `017`). |
| Aide, contact, CGU, confidentialité | Implémentée | `src/pages/Help.tsx`, `Contact.tsx`, `Terms.tsx`, `Privacy.tsx` | Contenus en contradiction partielle avec le code (voir 32). |
| Suppression de compte en libre-service | Non implémentée | — | Promise par la politique de confidentialité (sur demande par email). |

### 10.2 Commerçant

| Fonctionnalité | Statut | Preuve | Remarque |
|---|---|---|---|
| Inscription : type de commerce (26 types en 6 groupes), nom, téléphone, quartier (111), rattachement à un lieu ou indépendant, adresse, catégories, 1 à 4 photos, au moins un produit | Implémentée | `src/pages/BecomeMerchant.tsx:41-163`, `src/data/businessTypes.ts`, `018` | Photos compressées avant envoi. |
| Attente de validation, refus, suspension | Implémentée | `006`, `src/pages/MerchantSpace.tsx:233-252` | Le message affiché pour un refus est « Compte suspendu » (libellé erroné). |
| Ajouter un produit (nom, catégorie, prix, unité, variante, photo) | Implémentée | `src/pages/MerchantSpace.tsx:169-198` | Photo non compressée ici (contrairement à l'inscription) ; type de produit non proposé. |
| Supprimer un produit | Implémentée | `src/pages/MerchantSpace.tsx:200-203` | Sans confirmation. |
| Modifier un produit (prix, photo), disponibilité, rupture de stock | Non implémentée | — | Changer un prix impose de supprimer puis recréer. |
| Modifier la fiche du commerce | Non implémentée | — | |
| Voir les commandes reçues | Implémentée | `src/pages/MerchantSpace.tsx:121-134, 406-495` | Rafraîchissement manuel. |
| Passer une commande « prête (inviter un livreur) » | Implémentée | `src/pages/MerchantSpace.tsx:465-469` | |
| Marquer une commande « livrée » | Implémentée mais non encadrée | `src/pages/MerchantSpace.tsx:470-474` | Le commerçant peut clore une livraison à la place du livreur. |
| Ajuster le montant réel | Partielle (inopérante) | UI `src/pages/MerchantSpace.tsx:146-162` ; annulation par `014` lignes 66-79 (`protect_order_columns`) | L'écran affiche le nouveau montant ; la base conserve l'ancien. Voir Décision D1. |
| Voir la vidéo de liste de courses | Implémentée | `src/pages/MerchantSpace.tsx:480-489` | |
| Refuser ou annuler une commande | Non encadrée | Policy `014` lignes 46-50 | Techniquement possible par requête (aucune règle de transition), absent de l'interface. |
| Voir ses avis, ses ventes, ses revenus | Non implémentée | — | |

### 10.3 Livreur

| Fonctionnalité | Statut | Preuve | Remarque |
|---|---|---|---|
| Inscription : nom, téléphone, véhicule (moto, vélo, voiture, à pied) | Implémentée | `src/pages/BecomeCourier.tsx` | |
| Validation par l'administrateur | Implémentée | `006`, `014` lignes 16-43 | Seuls les livreurs approuvés voient les courses. |
| Liste des courses disponibles, filtre par marché | Implémentée | `src/pages/CourierSpace.tsx:108-117, 289-322` | Le téléphone du client est visible avant acceptation. |
| Accepter une course (premier arrivé) | Implémentée | `src/pages/CourierSpace.tsx:123-134`, `014` lignes 81-93 | Erreur d'acceptation concurrente non signalée. |
| Marquer livrée | Implémentée | `src/pages/CourierSpace.tsx:136-139` | Sans preuve de remise. |
| Adresse complète et position GPS du client | Non implémentée | `src/pages/Cart.tsx:132-134` ne transmet que « libellé · quartier, ville » | Bloquant opérationnel. |
| Gain de la course affiché | Non implémentée | Seul le total est affiché (`CourierSpace.tsx:253, 314`) | |
| Disponibilité (en service / hors service), zone | Non implémentée | — | |
| Documents (pièce d'identité, permis, carte grise) | Non implémentée | — | Voir 18.4. |
| Historique et gains | Partielle | Onglet « Mes livraisons » (`CourierSpace.tsx:325-348`) | Sans totaux ni gains. |

### 10.4 Administrateur

| Fonctionnalité | Statut | Preuve | Remarque |
|---|---|---|---|
| Reconnaissance de l'administrateur | Partielle | Email codé en dur côté client (`AuthContext.tsx:25`) et côté base (`006:4-13`) | Pas de table de rôles ; un seul administrateur possible. |
| Approuver ou rejeter commerçants, livreurs, marchés et magasins proposés | Implémentée | `src/pages/AdminSpace.tsx:53-66, 100-178` | L'admin ne voit que nom et adresse du commerçant, pas ses photos ni ses produits. |
| Suspendre un commerçant ou un livreur actif | Implémentée | `src/pages/AdminSpace.tsx:180-216` | |
| Réactiver un compte suspendu ou refusé | Non implémentée | — | Les comptes suspendus et refusés ne sont listés nulle part. |
| Ajouter directement un marché ou un magasin approuvé | Implémentée | `src/context/MarketsContext.tsx:89, 119` | |
| Voir, corriger, annuler les commandes | Non implémentée | Aucune policy `is_admin()` sur `orders` | L'admin peut techniquement tout modifier (trigger `protect_order_columns` le laisse passer) mais ne peut rien lire. |
| Modérer les produits et les avis | Non implémentée | — | |
| Mettre à jour les prix officiels | Partielle | Policy admin `016` lignes 99-102 | Pas d'écran ; mise à jour par SQL. |
| Tableau de bord (KPI) | Non implémentée | — | |

### 10.5 Fonctions système

| Fonctionnalité | Statut | Preuve |
|---|---|---|
| RLS sur toutes les tables | Implémentée | `schema.sql`, `002` à `019` |
| Durcissement sécurité (insertion de commande contrainte, champs figés, avis contrôlés, stockage par dossier utilisateur, droits retirés) | Implémentée | `014_security_hardening.sql` |
| En-têtes CSP, HSTS, X-Frame-Options, Permissions-Policy | Implémentée | `vercel.json` |
| Proxy Pexels côté serveur (clé jamais exposée) | Implémentée | `api/pexels.ts` |
| Bandeau hors connexion | Implémentée | `src/components/layout/OfflineBanner.tsx` |
| Thèmes par enseigne (Bâti Plus, Ceca-Gadis) | Implémentée | `src/theme/tokens.ts`, `docs/design-system.md` §2 |
| PWA (manifeste, installation, cache hors ligne) | Non implémentée | Aucun manifeste dans `index.html` |

---

## 11. Parcours utilisateurs

### 11.1 Parcours client nominal (livraison)

1. Connexion ou inscription (`/`).
2. Accueil : choix d'un marché, d'un magasin, d'une catégorie ou recherche.
3. Fiche commerçant : ajout de produits (variantes dépliables).
4. Bouton « Commander » → choix du créneau et de l'adresse (`/creneau`).
5. Panier (`/panier`) : vérification des articles, de l'adresse, du créneau, choix du moyen de paiement, vidéo facultative, lecture du total.
6. « Passer la commande » → redirection vers `/commandes`.
7. Suivi : En préparation → En cours de livraison → Livrée.
8. Réception, paiement au livreur.
9. Avis.

### 11.2 Parcours client : retrait sur stand (cible)

Identique jusqu'à l'étape 4, avec le créneau « Retrait sur stand ». Cible : aucun frais de livraison, statut « Prête à retirer », pas de livreur, le commerçant clôt la commande au retrait. État actuel : voir 16.

### 11.3 Parcours commerçant

1. Profil → « Devenir marchand » → formulaire en 5 sections.
2. Attente de validation.
3. Après approbation : espace marchand, onglets « Mes produits » et « Commandes reçues ».
4. Pour chaque commande : préparer → « Marquer prête (inviter un livreur) ».
5. Suivre l'attribution du livreur.

### 11.4 Parcours livreur

1. Profil → « Devenir livreur » → nom, téléphone, véhicule.
2. Attente de validation.
3. Onglet « Disponibles » → « Voir le détail » → « Accepter cette livraison ».
4. Récupération chez le commerçant, livraison, encaissement.
5. « Marquer livrée ».

### 11.5 Parcours administrateur

1. Profil → « Espace admin ».
2. Traitement des demandes en attente (commerçants, lieux, livreurs).
3. Suspension éventuelle d'un compte actif.

### 11.6 Parcours alternatifs transverses

| Situation | Comportement actuel | Comportement cible |
|---|---|---|
| Panier contenant un autre commerçant | Avertissement puis remplacement du panier à l'ajout | Inchangé (décision validée), ajouter une confirmation explicite |
| Pas d'adresse enregistrée | Bouton « Ajouter » vers le profil, commande possible sans adresse | Commande bloquée sans adresse si le créneau n'est pas un retrait |
| GPS refusé | Forfait 1 500 F | Inchangé ; encourager le GPS ou un repère détaillé |
| Hors connexion | Bandeau informatif | Bandeau + blocage explicite de l'envoi, conservation du panier |
| Commande déjà en livraison et client veut annuler | Bouton absent ; message d'erreur si tentative | Contacter le livreur ou le support |

---

## 12. Règles métier

### 12.1 Catalogue

| ID | Règle | Statut | Preuve |
|---|---|---|---|
| RM-C1 | Seuls les commerçants `approved` et leurs produits sont visibles. | Implémentée | `006` (policy select), `CatalogContext.tsx:85-101` |
| RM-C2 | Un magasin ou une enseigne n'est affiché qu'avec un logo. | Implémentée pour les lieux ajoutés | Contrainte `017` ; `MarketsContext.tsx:91-95`. Liste fixe : convention dans `src/data/markets.ts:3-5`. |
| RM-C3 | Les lieux ajoutés depuis l'application sont validés par l'administrateur. | Implémentée | `015` |
| RM-C4 | Un produit à variantes est regroupé par nom identique. | Implémentée | `src/lib/productGroups.ts`, `MerchantSpace.tsx:348-350` |
| RM-C5 | Les prix sont en F CFA entiers. | Implémentée | `002` (`price integer`) |
| RM-C6 | Pour chaque prix saisi, indiquer s'il s'agit du prix officiel ou du prix du magasin. | Non implémentée | Décision validée pour l'avenir |

### 12.2 Panier et commande

| ID | Règle | Statut | Preuve |
|---|---|---|---|
| RM-P1 | Un panier ne contient que les produits d'un seul commerçant. | Implémentée (client) | `CartContext.tsx:50-63` |
| RM-P2 | Une commande est créée au statut `en_preparation`, sans livreur, au nom du client connecté. | Implémentée (base) | `014` lignes 5-14 |
| RM-P3 | Articles, montants, adresse, créneau, téléphone client et vidéo sont figés après création (sauf administrateur). | Implémentée (base) | `014` lignes 54-102, `016` lignes 16-70 |
| RM-P4 | Le client ne peut annuler que si la commande est `en_preparation`. | Implémentée (base) | `016` lignes 9-12 |
| RM-P5 | Une commande annulée ne peut plus changer. | Implémentée (base) | `016` lignes 28-30 |
| RM-P6 | Les transitions de statut suivent `en_preparation → en_livraison → livree`, `annulee` seulement depuis `en_preparation`. | Partielle | Aucune vérification des transitions pour le commerçant et le livreur (`014` lignes 46-50, 30-43). |
| RM-P7 | Le total est recalculé par la base à partir des prix en vigueur. | Non implémentée | Voir Décision D3 |

### 12.3 Tarification

| ID | Règle | Valeur | Preuve |
|---|---|---|---|
| RM-T1 | Frais de service | 5 % du sous-total, arrondi à l'unité | `src/lib/pricing.ts:4, 44` |
| RM-T2 | Livraison, partie fixe | 2 000 F CFA | `pricing.ts:1` |
| RM-T3 | Livraison, partie distance | 300 F CFA par km, distance à vol d'oiseau (haversine) entre le lieu de vente et l'adresse | `pricing.ts:2, 12-24, 48-51` |
| RM-T4 | Sans coordonnées (lieu ou adresse) | Forfait 1 500 F CFA à la place de la partie distance, soit 3 500 F CFA de livraison | `pricing.ts:3, 47` |
| RM-T5 | Retrait sur stand | Cible : 0 F de livraison ; frais de service maintenus | Non implémentée, Décision D2 |

Exemple : sous-total 10 000 F, distance 4 km → 10 000 + 500 + (2 000 + 1 200) = 13 700 F CFA.

Points à trancher (section 32) : plafond de distance, arrondi de la distance, minimum de commande.

### 12.4 Comptes et validation

| ID | Règle | Statut | Preuve |
|---|---|---|---|
| RM-A1 | Commerçants, livreurs, marchés et magasins proposés passent par une validation administrateur. | Implémentée | `006`, `015` |
| RM-A2 | Un commerçant ou un livreur ne peut pas modifier son propre statut. | Implémentée | `006` (triggers `prevent_*_self_status_change`) |
| RM-A3 | Un propriétaire ne peut pas céder son commerce ou son profil livreur. | Implémentée | `014` lignes 122-139 |

### 12.5 Avis

| ID | Règle | Statut | Preuve |
|---|---|---|---|
| RM-V1 | Un avis par commande, uniquement si la commande est livrée et appartient au client. | Implémentée | `005` (`order_id unique`), `014` lignes 104-120 |
| RM-V2 | Un commerçant ne peut pas noter son propre commerce. | Implémentée | `014` lignes 117-119 |
| RM-V3 | La note et le nombre d'avis sont recalculés par la base. | Implémentée | `005` (trigger `update_merchant_rating`) |
| RM-V4 | « Pas encore d'avis » si aucun avis réel. | Implémentée | `MerchantCard.tsx:48-55` |
| RM-V5 | Aucune note initiale fictive. | Non respectée | `002` lignes 81-87 (notes 4,4 à 4,9, 62 à 203 avis inventés) ; valeur par défaut `rating = 5` (`002` ligne 12) |

### 12.6 Prix officiels

| ID | Règle | Statut |
|---|---|---|
| RM-O1 | Les prix officiels sont proposés au client à la demande, pas sur l'accueil. | Implémentée (`Cart.tsx:313-317`, `Orders.tsx:128-133`) |
| RM-O2 | Chaque prix officiel affiche sa source, sa date de relevé et le régime fiscal. | Implémentée (`016` lignes 78-91, `OfficialPrices.tsx:145-160`) |
| RM-O3 | Le libellé de source annonce 67 produits ; 60 lignes sont insérées. | Contradiction à corriger (`016` lignes 91, 106-166) |

### 12.7 Design et contenu (décisions validées)

Pas de dégradés violets, pas d'emoji, pas de faux avis, pas de fausses métriques, pas de faux comptes ; palette vert profond, olive, jaune ivoire ; logo officiel avec « 241 ». État : la palette du code est conforme (`src/theme/tokens.ts:26-35`) ; les colonnes `image_emoji` existent en base mais ne sont pas affichées ; `docs/design-system.md` décrit encore une ancienne palette (voir 32).

### 12.8 Promotions et codes promo (règles cibles, Phase 2)

- Une promotion est portée par un produit (prix barré) ou par un code (réduction sur le sous-total).
- Le coût d'une promotion commerçant est supporté par le commerçant ; celui d'un code plateforme par Le Panier 241.
- Les frais de service se calculent sur le sous-total après réduction.
- Un code a une période de validité, un plafond d'utilisation global et par client, un minimum de commande.
- La réduction est calculée et contrôlée par la base, jamais par le navigateur.
- Interdiction d'afficher un prix barré fictif (prix de référence jamais pratiqué).

---

## 13. Commande

### 13.1 Modèle de données actuel

Table `orders` (`schema.sql:80-93` complétée par `004`, `007`, `008`, `009`, `016`) : `id`, `user_id`, `merchant_id` (texte), `merchant_name`, `items` (JSON : produit, nom, quantité, prix unitaire, unité), `subtotal`, `service_fee`, `delivery_fee`, `distance_km`, `total`, `status`, `slot_label` (texte), `address_label` (texte), `livreur_id`, `livreur_name`, `livreur_phone`, `shopping_video_url`, `client_phone`, `cancelled_at`, `cancel_reason`, `created_at`.

Champs absents à prévoir : moyen de paiement, type de créneau (livraison ou retrait) et date structurée, adresse complète et coordonnées, horodatage de chaque statut, montant ajusté et motif, gain livreur, référence lisible.

### 13.2 Machine à états cible

| De | Vers | Qui | Condition |
|---|---|---|---|
| (création) | `en_preparation` | Client | Panier valide, adresse obligatoire si livraison |
| `en_preparation` | `annulee` | Client | Motif obligatoire |
| `en_preparation` | `annulee` | Commerçant | Motif obligatoire (rupture, fermeture) — à créer |
| `en_preparation` | `en_livraison` | Commerçant | Livraison uniquement |
| `en_preparation` | `prete_a_retirer` | Commerçant | Retrait uniquement — à créer |
| `en_livraison` | `livree` | Livreur attribué | Code de réception en Phase 2 |
| `prete_a_retirer` | `livree` (ou `retiree`) | Commerçant | — |
| tout statut | tout statut | Administrateur | Motif tracé |

Aujourd'hui, seuls la création, l'annulation client et le gel de `annulee` sont contrôlés par la base.

### 13.3 Fonctionnalité : passer une commande

| Rubrique | Contenu |
|---|---|
| Description | Le client transforme son panier en commande enregistrée et transmise au commerçant. |
| Acteur | Client |
| Préconditions | Connecté ; panier non vide ; créneau choisi ; adresse enregistrée (si livraison). |
| Déclencheur | Bouton « Passer la commande » (`Cart.tsx:341-348`). |
| Scénario nominal | 1. Envoi de la vidéo éventuelle. 2. Création de la commande `en_preparation`. 3. Panier vidé. 4. Redirection vers « Mes commandes ». |
| Scénarios alternatifs | A1 hors connexion : message, panier conservé. A2 échec d'envoi de la vidéo : proposer de réessayer ou de continuer sans. A3 échec d'enregistrement : message d'erreur, panier conservé. A4 créneau expiré : retour au choix du créneau. A5 produit supprimé ou prix modifié entre-temps : panier mis à jour et client prévenu. |
| Règles métier | RM-P1, RM-P2, RM-P3, RM-T1 à RM-T5, RM-P7. |
| Résultat attendu | Une commande visible par le client et le commerçant, avec un total recalculé par la base. |
| Priorité | P0 |
| Critères d'acceptation | CA-01, CA-02, CA-03 (section 29). |
| État actuel | Partielle : A1 à A5 non gérés ; erreur d'insertion ignorée (`OrdersContext.tsx:94-128`, `Cart.tsx:142-146`). |

### 13.4 Fonctionnalité : annuler une commande (client)

| Rubrique | Contenu |
|---|---|
| Description | Le client annule une commande tant qu'elle n'est pas partie. |
| Acteur | Client |
| Préconditions | Commande au statut `en_preparation`. |
| Déclencheur | « Annuler la commande » sur la carte de commande. |
| Scénario nominal | Choix d'un motif parmi quatre, confirmation, statut `annulee`, date fixée par la base. |
| Scénarios alternatifs | A1 la commande vient de passer `en_livraison` : message « elle est peut-être déjà en livraison ». A2 motif « prix trop élevé » : lien vers les prix officiels. |
| Règles métier | RM-P4, RM-P5. |
| Résultat attendu | Commande annulée, total marqué « non dû ». |
| Priorité | P0 (en place) |
| Critères d'acceptation | CA-04, CA-05. |
| État actuel | Implémentée. Manque : information du commerçant (aucune notification). |

---

## 14. Paiement

### 14.1 Règle validée

Paiement à la livraison uniquement, au livreur : espèces, Airtel Money ou Moov Money (`src/data/addresses.ts:3-7`). Rappel affiché dans le panier : « Réglé au livreur à la réception. Aucun paiement en ligne. » (`Cart.tsx:285`).

### 14.2 État actuel

| Élément | Statut | Preuve |
|---|---|---|
| Choix du moyen de paiement | Partielle | Stocké en `sessionStorage` (`CartContext.tsx:41, 46`), non enregistré en base |
| Moyen transmis au livreur | Non implémentée | Le livreur ne le voit pas |
| Encaissement en ligne | Non implémentée | Permissions-Policy `payment=()` (`vercel.json`) |
| Confirmation d'encaissement par le livreur | Non implémentée | — |
| Reversement au commerçant et à la plateforme | Non implémentée | Aucun modèle de règlement |
| Acompte | Non implémentée | Évoqué par un flyer, contraire au fonctionnement actuel |

### 14.3 Exigences MVP

- Enregistrer `payment_method` sur la commande et l'afficher au livreur et au commerçant.
- Enregistrer à la clôture le montant encaissé et le moyen réellement utilisé (déclaratif livreur).
- Définir le circuit de l'argent (Décision D4).

### 14.4 Commissions

Aujourd'hui, la plateforme facture au client 5 % de frais de service. Aucune commission n'est prélevée sur le commerçant, et rien ne décrit comment ces 5 % parviennent à la plateforme quand le client paie le livreur en espèces. Options en section « Décisions » (D4).

### 14.5 Phase 2 : paiement intégré

- Paiement mobile money via un agrégateur agréé au Gabon (prestataire à sélectionner ; non fixé dans ce PRD).
- Pré-requis absolu : montants calculés côté serveur (D3), webhook de confirmation vérifié côté serveur, idempotence, rapprochement.
- Remboursement en cas d'annulation ou d'ajustement à la baisse.

---

## 15. Livraison

### 15.1 Fonctionnement actuel

1. Le commerçant passe la commande `en_livraison` (« Marquer prête »).
2. Elle apparaît dans « Disponibles » pour tous les livreurs approuvés (`014` lignes 16-28).
3. Le premier qui accepte devient le livreur ; son nom et son téléphone sont copiés par la base depuis son profil (`014` lignes 81-93).
4. Le client voit le livreur et peut le contacter sur WhatsApp.
5. Le livreur (ou le commerçant) marque la commande livrée.

### 15.2 Écarts

| Écart | Gravité | Preuve |
|---|---|---|
| Adresse complète et GPS absents de la commande | Bloquant | `Cart.tsx:132-134` |
| Statut `en_livraison` signifie à la fois « prête, en attente de livreur » et « en route » | Moyen | `MerchantSpace.tsx:466`, `OrderProgress.tsx` |
| Pas de capacité par créneau ni de délai de préparation | Moyen | `deliverySlots.ts` |
| Pas d'information de gain pour le livreur | Moyen | `CourierSpace.tsx` |
| Le commerçant peut marquer livré | Moyen | `MerchantSpace.tsx:470-474` |
| Pas de règle si aucun livreur n'accepte | Moyen | — |
| Lieux ajoutés sans coordonnées : forfait systématique | Faible | `MarketsContext.tsx:37-54` |

### 15.3 Exigences MVP

- Copier dans la commande l'adresse complète, le quartier, le repère et les coordonnées.
- Ajouter le statut intermédiaire « en attente de livreur » ou un horodatage d'acceptation.
- Afficher au livreur, avant acceptation : lieu de retrait, quartier de livraison, distance, gain estimé ; après acceptation seulement : téléphone et adresse complète.
- Seul le livreur attribué peut marquer `livree` une commande en livraison.
- Alerte administrateur si une commande reste sans livreur au-delà d'un délai (valeur à fixer, section 32).

### 15.4 Fonctionnalité : accepter une course

| Rubrique | Contenu |
|---|---|
| Description | Un livreur approuvé prend en charge une commande prête. |
| Acteur | Livreur |
| Préconditions | Livreur `approved` ; commande `en_livraison` sans livreur. |
| Déclencheur | « Accepter cette livraison ». |
| Scénario nominal | La base attribue la commande au livreur et copie son nom et son téléphone ; la commande passe dans « Mes livraisons ». |
| Scénarios alternatifs | A1 un autre livreur a accepté juste avant : message « Course déjà prise », liste rafraîchie. A2 livreur suspendu entre-temps : refus. |
| Règles métier | Premier arrivé, premier servi ; identité du livreur imposée par la base. |
| Résultat attendu | Une seule attribution par commande. |
| Priorité | P0 |
| Critères d'acceptation | CA-08, CA-09. |
| État actuel | Implémentée ; A1 non signalé à l'utilisateur. |

### 15.5 Validation de réception

Aujourd'hui, aucune preuve de remise. Cible Phase 2 : code de réception à 4 chiffres généré par la base à l'acceptation, visible par le client seul, saisi par le livreur pour passer `livree`. Repli si le client n'a pas son téléphone : photo de remise ou validation par appel au support. Décision D5.

### 15.6 Suivi

Pas de carte ni de suivi temps réel. Le suivi se limite aux statuts, rafraîchis au chargement de la page. Phase 2 : rafraîchissement automatique (abonnement temps réel Supabase ou interrogation périodique). Phase 3 : position du livreur, si la valeur est démontrée.

---

## 16. Retrait

### 16.1 État actuel

| Élément | Constat | Preuve |
|---|---|---|
| Option proposée | « Retrait sur stand — Selon horaires du marché », chaque jour | `src/data/deliverySlots.ts:7, 27` |
| Frais de livraison | Facturés comme une livraison | `CartContext.tsx:90-102` n'utilise pas le créneau |
| Adresse | Toujours demandée | `DeliverySlot.tsx:536` |
| Circuit | Le commerçant n'a que « Marquer prête (inviter un livreur) » ; la commande part dans la liste des livreurs | `MerchantSpace.tsx:465-469`, `004`/`014` |
| Horaires du stand | Non saisis | — |

Statut global : Partielle, incohérente avec la promesse.

### 16.2 Exigences cibles

| Rubrique | Contenu |
|---|---|
| Description | Le client récupère lui-même sa commande chez le commerçant. |
| Acteur | Client, commerçant |
| Préconditions | Le commerçant accepte le retrait (paramètre à créer, activé par défaut). |
| Déclencheur | Choix du créneau « Retrait ». |
| Scénario nominal | 1. Livraison à 0 F, adresse non requise. 2. Commande `en_preparation`. 3. Le commerçant passe `prete_a_retirer`. 4. Le client se présente, paie, le commerçant clôt. |
| Scénarios alternatifs | A1 client absent au-delà d'un délai : le commerçant peut annuler avec motif « non retiré ». A2 commerçant sans adresse précise : afficher l'adresse et le lieu de vente. |
| Règles métier | RM-T5 ; jamais visible des livreurs. |
| Résultat attendu | Aucune course créée, aucun frais de livraison. |
| Priorité | P0 (Décision D2) |
| Critères d'acceptation | CA-06, CA-07. |

---

## 17. Vendeurs

### 17.1 Inscription

Formulaire complet en cinq sections (`BecomeMerchant.tsx`) : type de commerce, informations du commerce, catégories, photos (1 à 4), produits (au moins un). Les champs obligatoires sont listés à l'utilisateur avant envoi (`BecomeMerchant.tsx:92-100`). Statut : Implémentée.

Manques : la pièce justificative (registre de commerce, carte de vendeur du marché) n'est pas demandée ; l'administrateur ne voit pas les photos au moment de valider.

### 17.2 Gestion du catalogue

| Exigence | Priorité |
|---|---|
| Modifier le prix, l'unité, la photo, la variante d'un produit | P0 |
| Marquer un produit indisponible sans le supprimer | P1 |
| Confirmation avant suppression | P1 |
| Indiquer pour chaque prix s'il s'agit du prix officiel DGCCRF ou du prix du magasin (décision validée) ; signaler un prix supérieur au plafond officiel | P2 |
| Modifier la fiche du commerce (téléphone, photos, horaires) | P1 |

### 17.3 Traitement des commandes

| Exigence | Priorité |
|---|---|
| Ajustement du montant réel, avec motif, plafonné et visible du client (Décision D1) | P0 |
| Refuser ou annuler une commande avec motif | P1 |
| Rafraîchissement automatique et signal sonore ou visuel de nouvelle commande | P1 |
| Ne plus marquer « livrée » une commande en livraison (réservé au livreur) | P0 |

### 17.4 Avis et réputation

Afficher au commerçant ses avis (note et commentaire). Afficher publiquement les commentaires après modération légère (P2).

### 17.5 Commissions vendeurs

Aucune commission n'est prélevée aujourd'hui. Toute introduction d'une commission devra : être annoncée dans les CGU commerçant, être calculée par la base, apparaître sur un relevé périodique. Hypothèse de travail, à valider : commission nulle pendant la phase de lancement, puis taux fixe sur le sous-total. Aucun taux n'est proposé ici sans donnée économique.

### 17.6 Publicité

Non implémentée et hors MVP. La politique de confidentialité affirme « nous n'affichons pas de publicité ciblée » (`Privacy.tsx`). Toute mise en avant payante (Phase 3) devra être signalée comme « sponsorisée », sans ciblage sur données personnelles sauf mise à jour de la politique.

---

## 18. Livreurs

### 18.1 Inscription et validation

Implémentées (`BecomeCourier.tsx`, `006`, `014`). Le libellé affiché à un livreur refusé est « Compte suspendu » (`CourierSpace.tsx:169-188`) : à distinguer.

### 18.2 Activité

| Exigence | Statut | Priorité |
|---|---|---|
| Liste des courses disponibles | Implémentée | — |
| Filtre par marché | Implémentée | — |
| Filtre par proximité ou zone | Non implémentée | P2 |
| Gain affiché avant acceptation | Non implémentée | P0 |
| Adresse complète et GPS après acceptation | Non implémentée | P0 |
| Lien d'itinéraire (ouvrir dans l'application de cartes) | Non implémentée | P1 |
| Statut en service / hors service | Non implémentée | P2 |
| Relevé des gains et des encaissements | Non implémentée | P1 |

### 18.3 Rémunération

Le code ne dit pas qui perçoit les frais de livraison. Hypothèse la plus cohérente avec le barème : le livreur perçoit tout ou partie des frais de livraison. À trancher (Décision D4).

### 18.4 Gestion documentaire

Non implémentée. Exigences Phase 2 :

- Pièces : pièce d'identité, photo du livreur ; pour les véhicules motorisés, permis et document du véhicule ; numéro mobile money de reversement.
- Stockage dans un bucket privé (jamais public), lecture réservée à l'administrateur et au livreur.
- Date d'expiration par pièce, rappel avant expiration, suspension automatique à l'expiration.
- Conservation limitée et mention dans la politique de confidentialité.

---

## 19. Administration

### 19.1 Exigences MVP

| Exigence | Priorité | Justification |
|---|---|---|
| Rôle administrateur stocké en base (table de rôles), plus d'email codé en dur | P0 | `006:4-13`, `AuthContext.tsx:25` ; confirmation d'email désactivée (`README.md`) |
| Lecture de toutes les commandes, filtre par statut | P0 | Aucune policy admin sur `orders` |
| Annuler ou corriger une commande, avec motif tracé | P1 | Litiges simples |
| Voir le dossier complet d'une demande (photos, produits, quartier, type) avant validation | P1 | `AdminSpace.tsx:39` ne charge que nom, adresse, statut |
| Lister et réactiver les comptes suspendus ou refusés | P1 | Absent |
| Supprimer les commerçants et avis de démonstration | P0 | `002` lignes 80-121 |
| Écran de mise à jour des prix officiels | P2 | SQL aujourd'hui |
| Tableau de bord KPI | P2 | Section 23 |

### 19.2 Litiges

Non implémentés. MVP : contact WhatsApp et email du support (`Contact.tsx`, numéro `+241 7752 26 76` dans `src/lib/whatsapp.ts:1`), annulation ou correction par l'administrateur. Phase 2 : bouton « Signaler un problème » sur la commande (motif, photo, message), file de traitement admin, statut du litige, journal.

---

## 20. Notifications

### 20.1 État actuel

| Canal | Statut | Preuve |
|---|---|---|
| Pastille dans la barre de navigation quand une commande a changé de statut depuis la dernière visite | Implémentée | `OrdersContext.tsx:150-160`, `BottomNav.tsx` |
| Bandeau « commandes mises à jour » dans « Mes commandes » | Implémentée | `Orders.tsx:303-307` |
| Rafraîchissement automatique | Non implémentée | Aucun abonnement temps réel dans `src` |
| Push, SMS, email transactionnel | Non implémentée | — |
| Liens WhatsApp manuels (client → commerçant, client → livreur, contact support) | Implémentée | `Cart.tsx`, `Orders.tsx`, `MerchantDetail.tsx`, `Contact.tsx` |

La politique de confidentialité mentionne « Vous informer de l'avancement de vos commandes » : vrai seulement à l'ouverture de l'application.

### 20.2 Matrice cible

| Événement | Client | Commerçant | Livreur | Admin | Phase |
|---|---|---|---|---|---|
| Nouvelle commande | — | Oui | — | — | 2 |
| Commande annulée par le client | — | Oui | Si attribuée | — | 2 |
| Commande prête | — | — | Livreurs approuvés (zone) | — | 2 |
| Livreur attribué | Oui | Oui | — | — | 2 |
| Montant ajusté | Oui | — | Oui | — | 2 |
| Commande livrée | Oui | Oui | — | — | 2 |
| Commande sans livreur après délai | — | Oui | — | Oui | 2 |
| Demande d'inscription en attente | — | — | — | Oui | 2 |
| Compte validé ou refusé | — | Oui | Oui | — | 2 |

Canal recommandé à étudier : notification web (si PWA), puis SMS ou WhatsApp Business pour les événements critiques. Coûts et prestataire à déterminer.

---

## 21. Géolocalisation

| Élément | Statut | Preuve |
|---|---|---|
| Capture de la position à l'ajout d'une adresse, avec consentement | Implémentée | `Profile.tsx:99-117` ; `Permissions-Policy geolocation=(self)` |
| Repli forfaitaire si refus | Implémentée | `pricing.ts:3, 47` |
| Coordonnées des lieux fixes | Implémentée pour 4 lieux | `src/data/markets.ts` (Mont-Bouët, Bâti Plus, Ceca-Gadis, Centr' Affaires) |
| Coordonnées des lieux ajoutés et des commerçants indépendants | Non implémentée | `015`, `019` sans colonnes de position |
| Transmission des coordonnées au livreur | Non implémentée | `Cart.tsx:132-134` |
| Carte, itinéraire, suivi | Non implémentée | — |
| Découpage en zones de livraison | Partielle | 7 zones de lecture dans `neighborhoods.ts`, non utilisées pour la tarification ni le filtrage |

Exigences :

- P0 : coordonnées et repère copiés dans la commande ; lien « ouvrir l'itinéraire » pour le livreur.
- P1 : position du commerce à l'inscription et des lieux proposés (bouton « utiliser ma position » sur place).
- P1 : modifier la position d'une adresse existante.
- P2 : plafond de distance ou refus hors zone ; tarification par zone si le haversine s'avère trop éloigné des distances routières (à mesurer).

---

## 22. Sécurité fonctionnelle

### 22.1 Acquis

- RLS sur toutes les tables ; policies séparées par rôle (`002`, `004`, `014`).
- Commande créée uniquement `en_preparation`, sans livreur (`014`).
- Champs financiers et logistiques figés après création (`014`, `016`).
- Identité du livreur imposée par la base à l'acceptation (`014`).
- Avis contrôlés (commande livrée, bon commerçant, pas d'auto-notation) (`014`).
- Stockage : écriture limitée au dossier de l'utilisateur, tailles et types bornés, pas de listing public (`014` lignes 141-179).
- Fonctions de trigger non appelables par l'API ; `search_path` figé ; `TRUNCATE` retiré (`014` lignes 181-189).
- En-têtes HTTP stricts (`vercel.json`), clé Pexels côté serveur (`api/pexels.ts`).

### 22.2 Risques à traiter

| ID | Risque | Scénario | Gravité | Correctif proposé |
|---|---|---|---|---|
| S1 | Montants fixés par le navigateur | Un utilisateur modifie la requête et crée une commande à 100 F pour un panier de 100 000 F ; le livreur encaisse le montant affiché. | Élevée | Recalcul par la base à l'insertion (D3) |
| S2 | Transitions de statut libres | Un commerçant ou un livreur repasse une commande livrée en préparation, ou l'annule sans motif. | Moyenne | Contrôle des transitions dans le trigger |
| S3 | Admin par email, confirmation d'email désactivée | Fragilité structurelle : un seul admin, impossible à changer sans migration ; toute erreur sur le compte admin bloque l'administration. | Moyenne | Table de rôles ; réactiver la confirmation d'email |
| S4 | Vidéos de liste de courses dans un bucket public | Toute personne ayant l'URL voit la vidéo (intérieur du domicile, voix). | Moyenne | Bucket privé, URL signées à durée courte |
| S5 | Téléphone du client visible avant acceptation | Tous les livreurs approuvés voient le numéro des clients des courses disponibles. | Moyenne | N'exposer le téléphone qu'au livreur attribué (vue ou colonne protégée) |
| S6 | Téléphone des livreurs approuvés lisible par tous | Policy select `status = 'approved'` sans restriction de rôle (`006` lignes 51-53). | Faible à moyenne | Restreindre aux commandes concernées |
| S7 | Données de démonstration | Faux commerçants et faux avis visibles (`002`). | Élevée (réputation, règle validée) | Suppression en production, vérification |
| S8 | Erreurs silencieuses | Commande non enregistrée mais panier vidé ; acceptation concurrente non signalée ; ajustement annulé sans message. | Moyenne | Gestion d'erreur systématique |
| S9 | Pas de limitation de débit | Création massive de comptes, de propositions de marchés ou de commandes. | Faible (MVP) | Limites Supabase Auth, captcha à l'inscription si abus constaté |

### 22.3 Données personnelles

Conformité à vérifier par un juriste : déclaration éventuelle auprès de l'autorité gabonaise de protection des données (mentionnée dans `Privacy.tsx`), affirmation d'un hébergement Supabase dans l'Union européenne (à confirmer dans la console Supabase), procédure de suppression de compte.

### 22.4 Fraude au paiement à la livraison

- Commandes fantômes (client absent) : limiter le nombre de commandes en cours par client ; suspendre après N absences (valeur à fixer).
- Grosse commande sans engagement : seuil au-delà duquel un acompte ou une confirmation téléphonique est requis (Décision D4).

### 22.5 Intégrité du catalogue

Les photos d'illustration Pexels des marchés et catégories (`MarketsContext.tsx:37-54`, `api/pexels.ts`) ne représentent pas le lieu réel. Elles doivent être identifiées comme illustrations ou remplacées par de vraies photos, pour rester cohérent avec la règle « rien de fictif ».

### 22.6 Connectivité limitée

| Exigence | Statut | Priorité |
|---|---|---|
| Bandeau hors connexion | Implémentée | — |
| Compression des images avant envoi | Partielle (inscription, lieux ; pas l'ajout de produit en espace marchand) | P1 |
| Blocage explicite de l'envoi de commande hors connexion, panier conservé | Non implémentée | P0 |
| Reprise de l'envoi de la vidéo, limite de taille annoncée (50 Mo, `014` ligne 172) | Non implémentée | P1 |
| Panier conservé à la fermeture de l'onglet (`localStorage` au lieu de `sessionStorage`) | Non implémentée | P1 |
| Chargement paginé du catalogue (aujourd'hui, tout est chargé d'un coup, `CatalogContext.tsx:85-101`) | Non implémentée | P2 |
| PWA installable, coquille en cache | Non implémentée | P2 |

---

## 23. KPI

Aucune valeur cible n'est fixée ici : il n'existe pas encore de mesure de référence. Les cibles seront posées après quatre semaines de données réelles. Tous les indicateurs sont calculables depuis la base actuelle, sauf mention contraire ; l'administrateur n'ayant pas accès aux commandes dans l'application, le calcul se fait aujourd'hui par SQL dans la console Supabase.

| KPI | Définition | Mode de calcul | Source |
|---|---|---|---|
| Commandes créées | Nombre de commandes sur la période | `count(*)` sur `orders` où `created_at` dans la période | `orders` |
| Taux de livraison | Part des commandes livrées | `livree / (total − annulee en préparation)` | `orders.status` |
| Taux d'annulation client | Part des commandes annulées | `annulee / total` ; ventilation par `cancel_reason` | `orders` |
| Délai de prise en charge | Temps entre « prête » et acceptation | Nécessite des horodatages par statut (à créer) | À instrumenter |
| Délai total | Création → livraison | Nécessite `delivered_at` (à créer) | À instrumenter |
| Panier moyen | Sous-total moyen des commandes livrées | `avg(subtotal)` où `status = 'livree'` | `orders` |
| Volume d'affaires (GMV) | Somme des sous-totaux livrés | `sum(subtotal)` livrées | `orders` |
| Revenu plateforme | Frais de service livrés | `sum(service_fee)` livrées | `orders` |
| Clients actifs | Clients ayant au moins une commande livrée sur 30 jours | `count(distinct user_id)` | `orders` |
| Taux de réachat | Part des clients avec au moins 2 commandes livrées sur 60 jours | Ratio sur `user_id` | `orders` |
| Commerçants actifs | Commerçants approuvés avec au moins une commande livrée sur 30 jours | `count(distinct merchant_id)` | `orders`, `merchants` |
| Délai de validation | Temps entre inscription et approbation | Nécessite `approved_at` (à créer) | À instrumenter |
| Taux de GPS | Part des commandes livrées avec distance calculée | `count(distance_km is not null) / livrées` | `orders` |
| Taux d'ajustement | Part des commandes dont le montant a été ajusté, et écart moyen | Après D1 | À instrumenter |
| Note moyenne | Moyenne des avis réels | `avg(rating)` | `reviews` |
| Taux d'avis | Avis / commandes livrées | `count(reviews) / livrées` | `reviews`, `orders` |
| Conversion panier | Paniers commencés → commandes | Nécessite un outil de mesure respectueux de la vie privée (aucun aujourd'hui, et la politique exclut les traceurs d'audience) | Non mesurable en l'état |

---

## 24. MVP

Le MVP de lancement public est l'application actuelle, corrigée des écarts bloquants. Pas de nouvelle grande fonctionnalité.

| Bloc | Contenu | Statut actuel |
|---|---|---|
| Catalogue et recherche | En l'état | Implémentée |
| Panier, créneau, commande | + adresse obligatoire en livraison, gestion d'erreurs, moyen de paiement enregistré | Partielle |
| Tarification | + recalcul serveur ; retrait à 0 F de livraison | Partielle |
| Statuts | + machine à états contrôlée par la base ; livré réservé au livreur | Partielle |
| Ajustement du montant | Règle D1 appliquée de bout en bout (base, écrans, CGU, Aide) | Inopérante |
| Livraison | + adresse complète, repère, coordonnées, gain affiché, téléphone après acceptation | Partielle |
| Retrait | Circuit dédié | Partielle |
| Administration | + rôle en base, lecture des commandes, purge des données fictives | Partielle |
| Données | Aucun commerçant, avis ou note fictifs | À vérifier |
| Légal | CGU et confidentialité alignées sur le fonctionnement réel ; nom de domaine personnel | Partielle |
| Marque | « Le Panier 241 » partout (titre HTML « Panier 241 », `index.html:9`) | Partielle |

Critère de sortie du MVP : tous les éléments P0 de la section 27 livrés et vérifiés par la QA sur les critères de la section 29.

---

## 25. Phase 2

Objectif : fiabilité opérationnelle et confiance.

- Notifications (matrice 20.2), rafraîchissement automatique des commandes.
- Code de réception (D5).
- Paiement mobile money intégré, une fois D3 en place ; remboursements.
- Relevés commerçant et livreur ; circuit de reversement outillé.
- Documents livreurs (18.4).
- Litiges : signalement, file admin, statuts.
- Modification et disponibilité des produits ; fiche commerce modifiable ; horaires.
- Indication « prix officiel » ou « prix du magasin » sur chaque produit concerné ; alerte au-dessus du plafond.
- Promotions et codes promo (12.8).
- Affichage des commentaires d'avis.
- Gestion complète des adresses ; sélecteur de quartier côté client.

## 26. Phase 3

### 26.1 Croissance

- Mise en avant sponsorisée signalée (17.6), sans ciblage personnel.
- Suivi du livreur sur carte, si les mesures de Phase 2 montrent un besoin.
- PWA installable et mode dégradé hors ligne.
- Paniers multi-commerçants d'un même marché (remise en cause d'une décision validée : à n'envisager qu'avec justification chiffrée).
- Import de catalogue pour les enseignes.

### 26.2 Évolution vers d'autres marchés

| Dimension | État actuel | Exigence |
|---|---|---|
| Devise | F CFA codé en dur (`src/lib/format.ts`, montants entiers) | Code devise par pays sur chaque commande ; le franc CFA BEAC (Gabon) et le franc CFA BCEAO sont des monnaies distinctes à parité fixe, à ne pas confondre |
| Langue | Interface en français, textes en dur dans les composants | Extraire les textes dans des fichiers de traduction avant d'ajouter une langue |
| Découpage géographique | Ville forcée à « Libreville » (`Profile.tsx:162`, `MarketsContext.tsx:116`) ; quartiers de Libreville en dur (`neighborhoods.ts`) | Tables pays, ville, zone, quartier en base, administrables |
| Tarification | Constantes globales (`pricing.ts`) | Barème par ville ou zone, en base |
| Paiement | Airtel Money, Moov Money, espèces | Moyens configurables par pays |
| Prix officiels | DGCCRF Gabon | Source par pays, ou fonction désactivée |
| Téléphone | Formats libres | Indicatif pays et validation |
| Marque | « 241 » est l'indicatif du Gabon | Décision de marque pour un autre pays (question ouverte) |

---

## 27. Backlog priorisé

P0 : bloquant pour le lancement public. P1 : nécessaire dans les semaines suivant le lancement. P2 : Phase 2. P3 : Phase 3 ou opportuniste.

| ID | Élément | Priorité | Acteur | Réf. |
|---|---|---|---|---|
| B01 | Recalculer sous-total, frais et total par la base à la création de la commande | P0 | Système | D3, S1 |
| B02 | Appliquer la règle d'ajustement du montant (base + écran commerçant + affichage client + CGU + Aide) | P0 | Commerçant | D1 |
| B03 | Circuit de retrait : 0 F de livraison, pas d'adresse requise, statut « prête à retirer », invisible des livreurs | P0 | Client, commerçant | D2 |
| B04 | Machine à états contrôlée par la base ; `livree` en livraison réservé au livreur attribué | P0 | Système | 13.2, S2 |
| B05 | Copier adresse complète, repère et coordonnées dans la commande ; les afficher au livreur attribué | P0 | Livreur | 15.3 |
| B06 | Enregistrer le moyen de paiement sur la commande et l'afficher | P0 | Client, livreur | 14.3 |
| B07 | Adresse obligatoire pour une livraison ; gestion des erreurs d'envoi (commande, vidéo) sans vider le panier | P0 | Client | 13.3 |
| B08 | Supprimer en production commerçants, produits et avis de démonstration ; valeur par défaut `rating` à 0 ou nulle | P0 | Admin | S7, RM-V5 |
| B09 | Rôle administrateur en base ; réactiver la confirmation d'email | P0 | Admin | S3 |
| B10 | Lecture des commandes par l'administrateur | P0 | Admin | 19.1 |
| B11 | Afficher le gain du livreur ; téléphone et adresse du client seulement après acceptation | P0 | Livreur | S5 |
| B12 | Définir et afficher le circuit de l'argent (qui encaisse, qui reverse quoi, quand) | P0 | Tous | D4 |
| B13 | Aligner CGU, confidentialité, Aide sur le fonctionnement réel | P0 | Légal | 32 |
| B14 | Nom de domaine personnel ; mettre à jour l'URL de réinitialisation du mot de passe et la configuration Supabase | P0 | Système | Décision validée |
| B15 | Modifier un produit (prix, photo, variante) | P1 | Commerçant | 17.2 |
| B16 | Bucket vidéos privé, URL signées | P1 | Système | S4 |
| B17 | Annulation commerçant avec motif | P1 | Commerçant | 13.2 |
| B18 | Dossier complet dans la validation admin ; réactivation des comptes | P1 | Admin | 19.1 |
| B19 | Panier persistant (`localStorage`), créneau expiré revalidé | P1 | Client | 22.6 |
| B20 | Gestion des adresses (modifier, supprimer, défaut, sélecteur de quartier) | P1 | Client | 10.1 |
| B21 | Coordonnées des commerces et des lieux proposés | P1 | Commerçant | 21 |
| B22 | Lien d'itinéraire pour le livreur | P1 | Livreur | 18.2 |
| B23 | Messages distincts « refusé » et « suspendu » | P1 | Commerçant, livreur | 18.1 |
| B24 | Compression des photos produit en espace marchand | P1 | Commerçant | 22.6 |
| B25 | Mettre à jour `README.md` et `docs/design-system.md` ; corriger le libellé « 67 produits » | P1 | Équipe | 32 |
| B26 | Horodatage par statut (prête, acceptée, livrée, annulée) pour les KPI | P1 | Système | 23 |
| B27 | Notifications (matrice 20.2) | P2 | Tous | 20 |
| B28 | Code de réception | P2 | Client, livreur | D5 |
| B29 | Paiement mobile money intégré | P2 | Client | 14.5 |
| B30 | Documents livreurs | P2 | Livreur, admin | 18.4 |
| B31 | Litiges | P2 | Tous | 19.2 |
| B32 | Prix officiel ou prix magasin par produit ; alerte plafond | P2 | Commerçant, client | RM-C6 |
| B33 | Promotions et codes promo | P2 | Commerçant, admin | 12.8 |
| B34 | Commentaires d'avis visibles | P2 | Client | 17.4 |
| B35 | Tableau de bord KPI admin | P2 | Admin | 23 |
| B36 | Commissions vendeurs | P2 | Commerçant | 17.5 |
| B37 | Pagination du catalogue | P2 | Système | 22.6 |
| B38 | PWA et mode dégradé hors ligne | P3 | Client | 22.6 |
| B39 | Mise en avant sponsorisée | P3 | Commerçant | 17.6 |
| B40 | Suivi du livreur sur carte | P3 | Client | 15.6 |
| B41 | Multi-villes, multi-pays, traduction | P3 | Système | 26.2 |

---

## 28. User stories

| ID | En tant que | Je veux | Afin de | Priorité | Backlog |
|---|---|---|---|---|---|
| US-01 | client | voir le détail du total avant de commander | savoir ce que je paierai | P0 (en place) | — |
| US-02 | client | que le total de ma commande ne puisse pas être faussé | payer un montant juste | P0 | B01 |
| US-03 | client | être prévenu si ma commande n'a pas pu être envoyée, sans perdre mon panier | ne pas croire à tort avoir commandé | P0 | B07 |
| US-04 | client | choisir le retrait sur stand sans payer de livraison | économiser quand je passe au marché | P0 | B03 |
| US-05 | client | voir et accepter un ajustement de prix avant de payer | comprendre l'écart avec le prix estimé | P0 | B02 |
| US-06 | client | annuler ma commande tant qu'elle est en préparation | changer d'avis sans frais | P0 (en place) | — |
| US-07 | client | ne voir que de vrais commerçants et de vrais avis | faire confiance au service | P0 | B08 |
| US-08 | client | consulter les prix officiels quand je le souhaite | vérifier qu'un prix est correct | P0 (en place) | — |
| US-09 | commerçant | ajuster le montant réel d'une commande avec un motif | facturer le cours du jour | P0 | B02 |
| US-10 | commerçant | modifier le prix d'un produit sans le supprimer | tenir mon catalogue à jour | P1 | B15 |
| US-11 | commerçant | préparer une commande à retirer sans faire venir de livreur | servir mes clients de passage | P0 | B03 |
| US-12 | livreur | voir mon gain et la distance avant d'accepter | choisir mes courses | P0 | B11 |
| US-13 | livreur | recevoir l'adresse complète et la position du client | livrer sans chercher | P0 | B05 |
| US-14 | livreur | savoir si le client paie en espèces ou par mobile money | prévoir la monnaie ou le numéro | P0 | B06 |
| US-15 | administrateur | voir toutes les commandes | suivre l'activité et traiter les problèmes | P0 | B10 |
| US-16 | administrateur | voir le dossier complet d'un commerçant avant de le valider | valider en connaissance de cause | P1 | B18 |
| US-17 | client | saisir un code de réception au moment de la remise | prouver que j'ai bien reçu | P2 | B28 |
| US-18 | livreur | déposer mes documents dans l'application | être validé plus vite | P2 | B30 |
| US-19 | client | être notifié quand mon livreur est attribué | me rendre disponible | P2 | B27 |
| US-20 | commerçant | indiquer qu'un prix est le prix officiel | rassurer mes clients | P2 | B32 |

---

## 29. Critères d'acceptation

**CA-01 Recalcul serveur du total (US-02)**
- Étant donné un panier de 2 kg de tomates à 1 500 F chez un commerçant approuvé, livraison sans GPS,
- Quand une requête de création de commande arrive avec un total de 100 F,
- Alors la commande est enregistrée avec un sous-total de 3 000 F, des frais de service de 150 F, une livraison de 3 500 F et un total de 6 650 F, ou la requête est refusée.

**CA-02 Échec d'enregistrement (US-03)**
- Étant donné un panier valide et une perte de connexion,
- Quand le client appuie sur « Passer la commande »,
- Alors un message d'erreur s'affiche, le panier est conservé et aucune commande n'apparaît dans « Mes commandes ».

**CA-03 Adresse obligatoire en livraison**
- Étant donné un client sans adresse et un créneau de livraison,
- Quand il ouvre le panier,
- Alors le bouton de commande est désactivé avec le message « Ajoutez une adresse de livraison ».

**CA-04 Annulation autorisée (US-06)**
- Étant donné une commande au statut « En préparation »,
- Quand le client choisit un motif et confirme l'annulation,
- Alors la commande passe « Annulée », la date d'annulation est fixée par la base et le total affiché devient « non dû ».

**CA-05 Annulation refusée**
- Étant donné une commande au statut « En cours de livraison »,
- Quand le client tente de l'annuler par l'interface ou par requête directe,
- Alors la base refuse la modification et le statut reste « En cours de livraison ».

**CA-06 Retrait sans frais de livraison (US-04)**
- Étant donné un panier de 10 000 F et le créneau « Retrait sur stand »,
- Quand le client consulte le panier,
- Alors la livraison affiche 0 F, le total est 10 500 F et aucune adresse n'est exigée.

**CA-07 Retrait invisible des livreurs (US-11)**
- Étant donné une commande en retrait que le commerçant marque « Prête à retirer »,
- Quand un livreur approuvé ouvre « Disponibles »,
- Alors cette commande n'apparaît pas.

**CA-08 Acceptation unique**
- Étant donné une commande prête et deux livreurs approuvés,
- Quand les deux appuient sur « Accepter » à quelques secondes d'intervalle,
- Alors un seul est attribué et l'autre voit le message « Course déjà prise ».

**CA-09 Coordonnées après acceptation (US-13, S5)**
- Étant donné une commande prête dont l'adresse a une position GPS,
- Quand un livreur la consulte avant acceptation,
- Alors il voit le quartier, la distance et son gain, mais ni le téléphone ni l'adresse complète ;
- Et quand il l'accepte, alors il voit le téléphone, l'adresse complète, le repère et un lien d'itinéraire.

**CA-10 Clôture réservée au livreur (B04)**
- Étant donné une commande en livraison attribuée à un livreur,
- Quand le commerçant tente de la marquer « Livrée »,
- Alors l'action n'est pas proposée et la base la refuse.

**CA-11 Ajustement du montant (US-05, US-09, selon D1 option recommandée)**
- Étant donné une commande en préparation de sous-total 10 000 F,
- Quand le commerçant saisit 11 500 F avec le motif « cours du jour »,
- Alors la base enregistre le nouveau sous-total, recalcule les frais de service (575 F) et le total, conserve l'ancien montant et le motif ;
- Et le client voit l'ancien et le nouveau montant avec le motif sur sa commande.
- Étant donné le même plafond, quand le commerçant saisit un montant au-delà du plafond retenu, alors la base refuse et l'écran explique pourquoi.

**CA-12 Moyen de paiement transmis (US-14)**
- Étant donné un client qui choisit « Moov Money »,
- Quand il passe commande,
- Alors la commande porte « Moov Money » et ce moyen s'affiche au livreur et au commerçant.

**CA-13 Pas de note fictive (US-07)**
- Étant donné un commerçant nouvellement approuvé sans avis,
- Quand un client affiche sa fiche,
- Alors la mention « Pas encore d'avis » apparaît et aucune note n'est affichée ;
- Et aucun commerçant sans propriétaire réel n'est visible en production.

**CA-14 Accès administrateur (B09, B10)**
- Étant donné un compte doté du rôle administrateur en base,
- Quand il ouvre l'espace admin,
- Alors il voit les demandes en attente et la liste de toutes les commandes filtrable par statut ;
- Et un compte sans ce rôle reçoit « Accès réservé à l'administrateur » et la base lui refuse ces données.

**CA-15 Magasin sans logo**
- Étant donné un utilisateur qui propose un magasin sans logo,
- Quand il valide le formulaire,
- Alors l'enregistrement est refusé avec le message « Ajoutez le logo du magasin ou de l'enseigne ».

**CA-16 Avis réservé aux commandes livrées**
- Étant donné une commande « En préparation »,
- Quand le client tente d'insérer un avis par requête directe,
- Alors la base refuse l'insertion.

**CA-17 Code de réception (US-17, Phase 2)**
- Étant donné une commande en livraison dotée d'un code à 4 chiffres visible du seul client,
- Quand le livreur saisit un code erroné trois fois,
- Alors la clôture est bloquée et l'administrateur est alerté ;
- Et quand il saisit le bon code, alors la commande passe « Livrée ».

---

## 30. Risques produit

| ID | Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Écart entre total estimé et total payé, conflit à la porte | Élevée (produits frais) | Élevé | D1 : ajustement plafonné, visible et accepté |
| R2 | Pas assez de livreurs au lancement : commandes bloquées | Moyenne | Élevé | Recruter avant ouverture ; alerte de commande sans livreur ; retrait comme alternative |
| R3 | Commandes fantômes en paiement à la livraison | Moyenne | Moyen | Limite de commandes en cours ; suspension après absences ; seuil d'acompte (D4) |
| R4 | Sécurité des livreurs transportant des espèces | Moyenne | Élevé | Encourager le mobile money ; reversement fréquent |
| R5 | Perte de confiance si une donnée fictive est découverte | Moyenne tant que `002` n'est pas purgé | Élevé | B08, revue de contenu avant lancement |
| R6 | Promesses marketing non tenues (paiement sécurisé, suivi temps réel, OTP, litiges, acompte) | Élevée (déjà publiées dans la vidéo promo, le design Sleek, un flyer) | Élevé (image, conformité) | Retirer ou corriger ces supports avant le lancement public |
| R7 | Adoption faible par les commerçants de marché (outil jugé complexe) | Moyenne | Élevé | Accompagnement sur place ; inscription assistée |
| R8 | Distance à vol d'oiseau trop éloignée de la distance routière | Moyenne | Moyen | Mesurer sur les premières livraisons ; ajuster le barème |
| R9 | Dépendance à un administrateur unique | Élevée | Moyen | Rôles en base, second administrateur |
| R10 | Coût de données mobiles (photos, vidéos) | Moyenne | Moyen | Compression, limites de taille, vidéo facultative |
| R11 | Conformité données personnelles | Faible à moyenne | Élevé | Revue juridique, suppression de compte, bucket privé |

---

## 31. Hypothèses

| ID | Hypothèse | Comment la valider |
|---|---|---|
| H1 | Les clients acceptent des frais de 5 % plus une livraison d'au moins 2 000 F. | Taux de conversion et d'annulation pour motif « prix » |
| H2 | Le paiement à la livraison est préféré au paiement en ligne au lancement. | Entretiens ; part des moyens de paiement déclarés |
| H3 | Les commerçants de marché ont un smartphone et peuvent publier des photos. | Taux de complétion de l'inscription |
| H4 | Le créneau à la demi-journée suffit (pas de livraison express). | Retours clients ; demandes au support |
| H5 | La vidéo de liste de courses réduit les erreurs de préparation. | Part des commandes avec vidéo ; ajustements et réclamations comparés |
| H6 | La consultation des prix officiels renforce la confiance sans détourner du parcours d'achat. | Consultations de `/prix-officiels` (à instrumenter sans traceur tiers) |
| H7 | Le panier mono-commerçant n'est pas un frein majeur. | Paniers vidés par changement de commerçant (à instrumenter) |
| H8 | La géolocalisation sera acceptée par une majorité de clients. | Taux de GPS (section 23) |

---

## 32. Questions ouvertes

### 32.1 Contradictions constatées

| ID | Contradiction | Sources | Proposition |
|---|---|---|---|
| C1 | Nom : brief « Le Panier 221/241 » ; application et logo « Le Panier 241 » ; titre HTML et certains textes « Panier 241 » | `index.html:9`, `Terms.tsx`, `Cart.tsx:94`, `README.md` | Retenir « Le Panier 241 » partout ; « 221 » retiré à la demande du propriétaire |
| C2 | Vidéo promo et design Sleek annoncent paiement sécurisé, suivi temps réel, code OTP, litiges | Supports marketing ; absents du code | Retirer ces mentions tant que la Phase 2 n'est pas livrée |
| C3 | Flyer : « acompte avant achat » | Support marketing ; code : paiement à la livraison uniquement | Corriger le flyer ; décider d'un éventuel acompte (D4) |
| C4 | Boutons « pilule » interdits, mais utilisés par le design Sleek adopté | 76 occurrences de `rounded-full` dans `src` ; barre de navigation en pilule (`BottomNav.tsx`) | Trancher (question Q1) |
| C5 | Montants calculés côté client | `CartContext.tsx:90-102`, `OrdersContext.tsx:94-128` | D3 |
| C6 | Ajustement du montant promis (CGU, Aide, panier, espace marchand) mais annulé par la base | `Terms.tsx`, `Help.tsx`, `Cart.tsx:313`, `MerchantSpace.tsx:146-162` contre `014` | D1 |
| C7 | Retrait sur stand facturé comme une livraison et envoyé aux livreurs | `deliverySlots.ts:7`, `CartContext.tsx:90-102` | D2 |
| C8 | Palette : `docs/design-system.md` décrit Vert Palmier / Vert Lime / Sable ; le code et la décision du propriétaire utilisent vert profond / olive / jaune ivoire | `docs/design-system.md:3, 13-19` contre `src/theme/tokens.ts:26-35` | Corrigé le 18/10/2026 : `docs/design-system.md` réécrit sur la palette actuelle |
| C9 | `README.md` dit le catalogue « en données mockées locales » et mentionne 6 écrans | `README.md` | Catalogue en base depuis `002` ; mettre à jour |
| C10 | Données de démonstration avec notes et nombres d'avis inventés | `002` lignes 81-87 | Purger (B08) |
| C11 | Commerçants de démonstration rattachés à des marchés inexistants (`mkt-nkembo`, `mkt-oloumi`, `mkt-akebe`) | `002` lignes 84-86 contre `src/data/markets.ts` | Purger avec C10 |
| C12 | Source DGCCRF « liste des 67 produits », 60 lignes insérées | `016` lignes 91, 106-166 | Compléter ou corriger le libellé |
| C13 | Confidentialité : « le commerçant voit l'adresse de livraison » ; en réalité il ne voit que libellé et quartier | `Privacy.tsx`, `Cart.tsx:132-134` | Aligner après B05 |
| C14 | Confidentialité : « Vous informer de l'avancement de vos commandes » ; aucune notification hors application | `Privacy.tsx`, section 20 | Préciser le texte ou livrer B27 |
| C15 | Confidentialité : « nous n'affichons pas de publicité ciblée » ; la Phase 3 envisage une mise en avant sponsorisée | `Privacy.tsx`, 17.6 | Garder non ciblée, ou mettre à jour la politique |
| C16 | Libellé « Compte suspendu » affiché à un compte refusé | `MerchantSpace.tsx:233-252`, `CourierSpace.tsx:169-188` | B23 |

### 32.2 Informations manquantes

| ID | Question | Pour qui |
|---|---|---|
| Q1 | Les formes « pilule » sont-elles finalement acceptées puisque le design Sleek a été adopté ? | Propriétaire |
| Q2 | Les commerçants et avis de démonstration de `002` sont-ils encore présents en production ? | Propriétaire, développeur |
| Q3 | Quel nom de domaine, et à quelle date ? | Propriétaire |
| Q4 | Qui perçoit les frais de livraison et les frais de service, et selon quel calendrier de reversement ? | Propriétaire (D4) |
| Q5 | Plafond de distance de livraison ? Livraison à Ntoum et Owendo au même barème ? | Propriétaire |
| Q6 | Délai au-delà duquel une commande sans livreur est signalée ? Délai de non-retrait ? | Propriétaire |
| Q7 | Montant minimum de commande ? | Propriétaire |
| Q8 | Horaires réels des créneaux et capacité par créneau ? | Propriétaire, commerçants |
| Q9 | Le projet Supabase est-il bien hébergé dans l'Union européenne, comme l'affirme la politique de confidentialité ? | Développeur |
| Q10 | Démarches de déclaration auprès de l'autorité gabonaise de protection des données ? | Juriste |
| Q11 | Statut juridique de l'exploitant (mentions légales absentes des CGU) ? | Propriétaire, juriste |
| Q12 | Livraisons de charges lourdes (ciment, fer) : véhicule adapté, barème spécifique ? | Propriétaire |
| Q13 | Les photos d'illustration Pexels des marchés sont-elles acceptables au regard de la règle « rien de fictif » ? | Propriétaire |
| Q14 | Une commission vendeur est-elle envisagée, et à partir de quand ? | Propriétaire |

---

## DÉCISIONS À VALIDER AVANT DÉVELOPPEMENT

Seules figurent ici les décisions sans lesquelles les éléments P0 ne peuvent pas être développés.

### D1. Ajustement du montant réel par le commerçant

Constat : promis dans les CGU, l'Aide, le panier et l'espace marchand ; annulé en silence par la base (`014`, trigger `protect_order_columns`). Les clients et les commerçants sont aujourd'hui induits en erreur.

| Option | Description | Avantage | Inconvénient |
|---|---|---|---|
| A | Prix fermes : supprimer l'ajustement, retirer les mentions | Simple, aucune surprise | Inadapté aux produits frais à cours variable ; pertes pour le commerçant |
| B | Ajustement par la base, une seule fois, avant le départ en livraison, avec motif, dans un plafond (par exemple ± un pourcentage à fixer) ; au-delà, acceptation du client requise ; ancien montant conservé et affiché | Juste, traçable, protège le client | Développement d'une fonction serveur et d'un écran client |
| C | Ajustement libre, simplement affiché au client | Rapide | Ouvre la porte aux abus ; conflits à la livraison |

Recommandation : **B**. Le plafond exact est à fixer par le propriétaire.

### D2. Retrait sur stand

Constat : le retrait facture la livraison et crée une course pour les livreurs.

| Option | Description |
|---|---|
| A | Circuit dédié : livraison 0 F, adresse non requise, statut « prête à retirer », jamais visible des livreurs, clôture par le commerçant |
| B | Retirer l'option retrait jusqu'à la Phase 2 |

Recommandation : **A**. Effort limité, promesse déjà affichée au client.

### D3. Calcul des montants côté serveur

Constat : le navigateur fixe le sous-total, les frais et le total ; la base les fige ensuite. En paiement à la livraison, le livreur encaisse le montant affiché : une commande falsifiée fait perdre de l'argent au commerçant.

| Option | Description | Avantage | Inconvénient |
|---|---|---|---|
| A | Trigger à l'insertion qui recalcule à partir des prix en base, des coordonnées et du type de créneau, et écrase les valeurs reçues | Transparent pour le front, sûr | Barème à dupliquer en SQL (ou déplacer en base) |
| B | Fonction RPC « créer la commande » qui reçoit seulement produits, quantités, adresse et créneau | Contrat d'API propre, prêt pour le paiement en ligne | Refonte de l'envoi de commande côté front |
| C | Statu quo | Aucun effort | Fraude possible ; bloque tout paiement en ligne futur |

Recommandation : **B**, avec le barème stocké en base (prépare aussi les tarifs par zone et par pays). A est un repli acceptable si le délai est contraint.

### D4. Circuit de l'argent et acompte

Constat : le client paie le livreur ; rien ne définit comment le commerçant reçoit le prix des produits, ni comment la plateforme perçoit ses 5 %, ni ce que gagne le livreur. Un flyer parle d'acompte.

| Option | Description |
|---|---|
| A | Le livreur paie le commerçant au retrait (avance), encaisse le total chez le client, garde les frais de livraison, reverse les frais de service à la plateforme à fréquence fixe |
| B | Le commerçant encaisse tout (le livreur collecte pour lui), reverse au livreur les frais de livraison et à la plateforme les frais de service |
| C | Le client paie le commerçant directement par mobile money à la préparation ; il paie au livreur seulement la livraison |

Question liée : acompte au-delà d'un seuil de commande (oui ou non, montant du seuil).

Recommandation : **C** pour les commerçants équipés en mobile money, **B** en repli pour les autres ; pas d'avance d'argent par le livreur (option A exclue pour la sécurité des livreurs et le risque de non-remboursement). Acompte obligatoire au-delà d'un seuil à fixer, réglé au commerçant par mobile money, pour les paniers de forte valeur (matériaux, électroménager). Corriger le flyer en conséquence.

### D5. Machine à états et preuve de livraison

Constat : commerçant et livreur peuvent écrire n'importe quel statut ; le commerçant peut clore une livraison ; aucune preuve de remise.

| Option | Description |
|---|---|
| A | Transitions contrôlées par la base dès le MVP (section 13.2) ; `livree` réservé au livreur attribué (ou au commerçant pour un retrait) ; code de réception en Phase 2 |
| B | Transitions contrôlées et code de réception dès le MVP |
| C | Statu quo |

Recommandation : **A**. Les transitions contrôlées sont indispensables et peu coûteuses ; le code de réception demande un parcours de secours (client sans téléphone) qui mérite d'être conçu à part, en Phase 2.
