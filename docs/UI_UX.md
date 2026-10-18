# Le Panier 241 — UI/UX et design system

| Élément | Valeur |
|---|---|
| Produit | Le Panier 241, marketplace mobile de commerces de proximité (Grand Libreville) |
| Version | 1.0 |
| Date | 18 octobre 2026 |
| Base de vérification | `src/theme/tokens.ts`, `tailwind.config.js`, `src/index.css`, `index.html`, `src/components/ui/*`, `src/components/layout/*`, `src/pages/*`, `docs/PRD.md`, `docs/APP_FLOW.md`, `PROJECT_CONVENTIONS.md` §35, `AI_RULES.md` §8 |
| Public | Design, développeurs, QA, propriétaire du produit |

**Nom du produit.** Le brief dit « Le Panier 221/241 ». Le nom validé est « Le Panier 241 ». Ce document n'utilise que ce nom. Le titre de l'onglet dit encore « Panier 241 » (`index.html:9`).

**Charte de référence.** `docs/design-system.md` a été réécrit le 18 octobre 2026 : il décrit la charte actuelle (`src/theme/tokens.ts`, `tailwind.config.js`, `src/index.css`) et fait référence pour les valeurs. Ce document-ci garde les règles UX et les propositions ; les jetons `warn-ink`, `accent-ink` et `line-strong` (§4.3) ont été validés par le propriétaire le 18/10/2026 et sont dans le code.

**Portée.** Ce document décrit l'existant et propose des règles. Il ne tranche aucune décision ouverte du PRD (D1 à D5). Les ajouts de jetons marqués [Proposé] demandent l'accord du propriétaire (`AI_RULES.md` R7, R51) : ils complètent la palette, ils ne la modifient pas.

---

## 0. Conventions

| Marque | Sens |
|---|---|
| **[Existant]** | Présent dans le code. Le fichier est cité. |
| **[Partiel]** | Présent, mais incomplet ou contraire à une règle de ce document. |
| **[Proposé]** | Règle ou valeur nouvelle, à valider puis à implémenter. |
| **[À créer]** | Écran absent du code (reprise d'`APP_FLOW.md`). |
| **Écart** | Différence entre le code et la règle. Fichier et ligne cités. |

Unités : px pour les tailles, rem quand le code utilise rem (1 rem = 16 px). Les classes citées sont des classes Tailwind du projet.

---

## 1. Principes UX

| # | Principe | Ce que cela veut dire à l'écran | Statut |
|---|---|---|---|
| P1 | Le prix d'abord, et vrai | Prix, unité et total visibles sans geste. Chaque montant estimé est dit « estimé ». Frais de service et livraison détaillés. | [Existant] `Cart.tsx` (récapitulatif) |
| P2 | Rien d'inventé | Aucun faux avis, aucune note décorative, aucun compteur fictif. « Pas encore d'avis » quand il n'y en a pas. | [Existant] `MerchantCard.tsx` |
| P3 | Une action principale par écran | Un seul bouton plein (`bg-brand`). Les autres actions sont secondaires ou textuelles. | [Partiel] respecté sur Panier, Créneau ; non formalisé |
| P4 | Dire ce qui se passe | Chaque envoi a un état d'attente, de succès et d'échec. Aucun échec silencieux. | [Partiel] voir APP_FLOW §4.3 et §5.4 |
| P5 | Tenir hors connexion | Le réseau est instable. La saisie n'est jamais perdue. Le bandeau dit l'état. | [Partiel] `OfflineBanner.tsx` ; panier perdu à la fermeture |
| P6 | Une main, un pouce | Actions principales en bas d'écran. Cibles de 44 px. | [Partiel] barres collantes `Cart.tsx:321`, `MerchantDetail.tsx:277` ; cibles de 28 à 36 px ailleurs |
| P7 | Parler simple et local | Français, tutoiement, mots du quotidien (« quartier », « marché », « stand »), FCFA écrit « F ». | [Partiel] tutoiement et vouvoiement mélangés |
| P8 | Le commerce garde son identité | La vitrine prend les couleurs de l'enseigne. La navigation garde l'ADN Le Panier 241. | [Existant] `MerchantThemeProvider.tsx` |
| P9 | Calme et premium | Peu d'effets. Le mouvement sert un retour d'action, pas la décoration. | [Partiel] voir §18 et §26 |
| P10 | Confiance par la preuve | Statut de validation, nom du livreur, motif d'annulation, source DGCCRF : la confiance vient de faits affichés, pas de badges. | [Existant] `Orders.tsx`, `OfficialPrices.tsx` |

Règles de contenu « pas de look IA » (`AI_RULES.md` R48 à R50, `PROJECT_CONVENTIONS.md` §35) :

| Interdit | État du code |
|---|---|
| Dégradé violet | Aucun. Un seul dégradé, vert vers transparent, sur la carte « À la une » (`Home.tsx:38`). Conforme. |
| Emoji | Aucun dans l'interface. Colonnes `image_emoji` en base, non affichées. Conforme. |
| Faux avis, fausses métriques, faux comptes | Aucun constaté. Notes et nombres d'avis réels. Conforme. |
| Photos générées par IA | Aucune. Les visuels de repli viennent de Pexels (photos réelles). Voir la réserve en §12. |
| Badges marketing vagues | Écart : badge « À la une » (`Home.tsx:40`), sans critère affiché. |
| Boutons pilule | Écart : nombreux, liste en §10. |
| Animations de scroll ou de curseur exagérées | Écart partiel : zoom continu `ken-burns`, vol du produit vers le panier, barre qui se masque au défilement. Voir §18. |

---

## 2. Architecture de navigation

Reprise d'`APP_FLOW.md` §1. Une seule garde de route : la session (`App.tsx:76-95`).

### 2.1 Niveaux

| Niveau | Contenu | Accès | Statut |
|---|---|---|---|
| Public | Connexion et inscription, nouveau mot de passe, CGU, confidentialité | Sans session | [Existant] `App.tsx:89-92` |
| Onglets (5) | Accueil `/`, Recherche `/recherche`, Panier `/panier`, Commandes `/commandes`, Profil `/profil` | Barre du bas | [Existant] `BottomNav.tsx` |
| Découverte | Catégorie `/categorie/:id`, Marché ou magasin `/marche/:id`, Commerçant `/marchand/:id` | Depuis Accueil et Recherche | [Existant] |
| Tunnel d'achat | Commerçant → Créneau `/creneau` → Panier `/panier` → Commandes | Bouton collant « Commander » | [Existant] |
| Espaces métier | `/marchand-espace`, `/livreur-espace`, `/admin`, `/devenir-marchand`, `/devenir-livreur` | Depuis Profil | [Existant] |
| Annexes | `/aide`, `/contact`, `/prix-officiels` | Profil, Panier, motif d'annulation | [Existant] |

### 2.2 Règles

| Règle | Statut |
|---|---|
| Cinq onglets au plus. Pas d'onglet par rôle. | [Existant] |
| Retour en haut à gauche sur tout écran de niveau 2 et plus. Cible de 44 px, libellé accessible « Retour ». | [Partiel] cible de 36 px et sans libellé dans `Help.tsx:14`, `Contact.tsx:16`, `DeliverySlot.tsx:52`, `CourierSpace.tsx:194`, `MerchantSpace.tsx:260`, `BecomeCourier.tsx:53`, `LegalPage.tsx` |
| Dans un espace métier, la barre du bas reste celle du client. Un en-tête d'espace rappelle où l'on est et propose « Quitter l'espace ». | [Proposé] |
| La barre du bas est masquée dans le tunnel quand une barre d'action collante est présente, pour éviter deux barres empilées. | [Proposé] aujourd'hui les deux coexistent (`Cart.tsx:321` à `bottom-24`) |
| Une route inconnue affiche une page 404 avec retour à l'accueil. | [À créer] |
| Les prix officiels ne sont pas liés depuis l'accueil (décision validée). | [Existant] |

---

## 3. Design system

### 3.1 Architecture des jetons

| Couche | Source | Rôle | Statut |
|---|---|---|---|
| Jetons de thème | `baseTheme` dans `src/theme/tokens.ts` | `brand`, `ink`, `soft`, `surface`, `accent`, `header`, `onHeader` | [Existant] |
| Jetons d'interface | `uiTokens` | `card`, `line`, `muted`, `muted-bg`, `warn`, `danger` | [Existant] |
| Couleurs de catégorie | `categoryColors` | 8 catégories de produits | [Existant] |
| Thèmes d'enseigne | `marketThemes`, `freshMarketTheme` | Vitrine d'un commerce seulement | [Existant] |
| Variables CSS | `applyBaseTheme`, `themeToCssVars` | `--color-*` en canaux RGB | [Existant] |
| Classes Tailwind | `tailwind.config.js` | `bg-brand`, `text-brand-dark`, `bg-brand-light`, `rounded-card`, `shadow-card` | [Existant] |
| Composants | `src/components/ui/*`, `src/components/layout/*` | Briques réutilisables | [Existant], incomplet (§23) |

### 3.2 Règles

| Règle | Statut |
|---|---|
| Aucune couleur en dur dans un composant. Exception tolérée : chiffres du logo (`BrandLogo.tsx:22-24`). | [Existant] |
| Les styles de champ sont définis une fois, dans un composant. | [Partiel] 6 définitions locales : `Auth.tsx:34`, `ResetPassword.tsx:9`, `BecomeCourier.tsx:13`, `MerchantSpace.tsx:20`, `BecomeMerchant.tsx:34`, `AddMarketCard.tsx:17` |
| Les boutons passent par `Button.tsx`. | [Partiel] `Orders.tsx`, `Cart.tsx`, `Search.tsx`, `OfficialPrices.tsx`, `BecomeMerchant.tsx`, `AddMarketCard.tsx` codent leurs boutons à la main |
| Le rouge d'erreur est `danger`, jamais `category-poisson`. | [Partiel] `Button.tsx:17`, `Auth.tsx:221`, `ResetPassword.tsx:95`, `BecomeCourier.tsx:85`, `Profile.tsx:340`, `MerchantSpace.tsx:394` |
| Tout nouveau jeton est ajouté dans `tokens.ts`, puis exposé dans `tailwind.config.js`. | [Existant] règle `AI_RULES.md` R51 |

---

## 4. Palette

### 4.1 Jetons existants

| Jeton | Classe | Valeur | Rôle | Statut |
|---|---|---|---|---|
| `brand` | `bg-brand`, `text-brand` | `#1B4A2E` | Vert profond du logo. Actions, liens, état actif. | [Existant] `tokens.ts:27` |
| `ink` | `text-brand-dark` | `#22261F` | Texte et titres | [Existant] `tokens.ts:28` |
| `soft` | `bg-brand-light` | `#F1E8C9` | Jaune ivoire. Champs, boutons secondaires, fonds d'icône | [Existant] `tokens.ts:29` |
| `surface` | `bg-surface` | `#FBF8EC` | Ivoire. Fond de page | [Existant] `tokens.ts:30` |
| `accent` | `bg-accent` | `#9DA94A` | Olive. Compteurs, indicateurs, bouton « + » | [Existant] `tokens.ts:31` |
| `header` | `bg-header` | `#1B4A2E` | Fond d'en-tête | [Existant] `tokens.ts:32` |
| `onHeader` | `text-on-header` | `#FBF8EC` | Texte sur en-tête | [Existant] `tokens.ts:33` |
| `card` | `bg-card` | `#FFFDF6` | Fond de carte | [Existant] `tokens.ts:38` |
| `line` | `border-line` | `#E6DDBF` | Bordure décorative, séparateur | [Existant] `tokens.ts:39` |
| `muted` | `text-muted` | `#676A58` | Texte secondaire | [Existant] `tokens.ts:40` |
| `muted-bg` | `bg-muted-bg` | `#F5EFD9` | Fond neutre | [Existant] `tokens.ts:41` |
| `warn` | `text-warn` | `#D99A2B` | Avertissement | [Existant] `tokens.ts:42` |
| `danger` | `text-danger`, `bg-danger` | `#A6402A` | Erreur, action destructive | [Existant] `tokens.ts:43` |
| Catégories | `bg-category-*` | légumes `#3FAE5C`, fruits `#F2994A`, poisson `#E8543A`, céréales `#C08A3E`, restauration `#B5532E`, boulangerie `#C9922F`, bricolage `#5B7C99`, épicerie `#2FA3A3` | Pastilles et fonds de vignette | [Existant] `tokens.ts:47-56` |
| Logo | en dur | `#009E60` (2), `#F2B705` (4), `#3A75C4` (1) | Plaque « 241 » | [Existant] `BrandLogo.tsx:22-24`, exception tolérée |

`bg-white` est aussi utilisé pour les cartes (`Card.tsx`, `MerchantCard.tsx`). Écart mineur : deux blancs de carte (`white` et `card`). Règle [Proposé] : `bg-card` partout, `bg-white` réservé aux plaques de logo.

### 4.2 Contrastes WCAG 2.2 calculés

Formule de luminance relative WCAG. Seuils : texte normal 4,5:1 (AA), grand texte (≥ 18,66 px gras ou ≥ 24 px) 3:1, éléments d'interface et icônes 3:1.

| Premier plan | Fond | Ratio | Texte normal | Grand texte / UI |
|---|---|---|---|---|
| `ink` | `surface` | 14,46 | Conforme AAA | Conforme |
| `ink` | `card` | 15,12 | AAA | Conforme |
| `ink` | `soft` | 12,55 | AAA | Conforme |
| `ink` | `accent` | 6,01 | AA | Conforme |
| `brand` | `surface` | 9,56 | AAA | Conforme |
| `brand` | `soft` | 8,29 | AAA | Conforme |
| `white` | `brand` | 10,17 | AAA | Conforme |
| `onHeader` | `header` | 9,56 | AAA | Conforme |
| `white` | `brand` à 90 % (survol) | 7,77 | AAA | Conforme |
| `muted` | `surface` | 5,22 | AA | Conforme |
| `muted` | `card` | 5,46 | AA | Conforme |
| `muted` | `soft` | 4,53 | AA, de justesse | Conforme |
| `muted` | `muted-bg` | 4,82 | AA | Conforme |
| `danger` | `surface` | 5,83 | AA | Conforme |
| `danger` | `soft` | 5,05 | AA | Conforme |
| `white` | `danger` | 6,20 | AA | Conforme |
| `warn` | `soft` | **1,99** | Échec | Échec |
| `warn` | `surface` | **2,29** | Échec | Échec |
| `accent` | `surface` (indicateur, anneau) | **2,41** | Échec | Échec |
| `brand` | `accent` | 3,97 | Échec | Conforme |
| `white` | `category-poisson` | **3,65** | Échec | Conforme en grand texte |
| `category-poisson` | `surface` | **3,43** | Échec | Conforme en grand texte |
| `ink` à 40 % | `white` | **2,39** | Échec | Échec |
| `ink` à 50 % | `white` | **3,10** | Échec | Conforme en grand texte |
| `ink` à 60 % | `white` | **4,17** | Échec | Conforme |
| `ink` à 70 % | `white` | 5,74 | AA | Conforme |
| `ink` à 80 % | `surface` | 7,72 | AAA | Conforme |
| `line` | `surface` | **1,28** | Sans objet | Échec si bordure de champ |
| `brand` à 50 % (anneau de focus) | `surface` | **2,60** | Sans objet | Échec |
| `category-fruits` (étoiles) | `white` | **2,23** | Sans objet | Échec |
| `white` (icône) | `category-legumes` | 2,83 | Échec | Échec |
| `white` (icône) | `category-boulangerie` | 2,75 | Échec | Échec |
| `white` (icône) | `category-fruits` | 2,23 | Échec | Échec |
| `white` | `freshMarketTheme.brand` `#C2542D` | 4,57 | AA, de justesse | Conforme |
| `freshMarketTheme.ink` `#2A1D16` | `freshMarketTheme.accent` `#3F8F4A` | 4,07 | Échec | Conforme |
| `white` | Bâti Plus `#D0121A` | 5,55 | AA | Conforme |
| `white` | Ceca-Gadis `#1B3F8F` | 9,75 | AAA | Conforme |
| Chiffre « 4 » `#F2B705` | `white` | 1,82 | Logo, exempté | Logo, exempté |

Usages en échec relevés dans le code :

| Usage | Fichier | Correction [Proposé] |
|---|---|---|
| Statut « En préparation » en `text-warn` sur `bg-brand-light` | `StatusBadge.tsx:4` | Texte `warn-ink` ou texte `ink` sur fond `warn` (6,31) |
| Texte secondaire `text-brand-dark/40`, `/50`, `/60` | `MerchantCard.tsx`, `CatalogState.tsx`, `Auth.tsx:128`, `SearchBar.tsx` | `text-muted` (5,22) ou `text-brand-dark/80` |
| Placeholder `placeholder:text-brand-dark/40` | `Auth.tsx:34`, `ResetPassword.tsx:9`, `BecomeCourier.tsx:13`, `MerchantSpace.tsx:20` | `placeholder:text-muted` |
| Bouton danger blanc sur `category-poisson` | `Button.tsx:17` | `bg-danger` |
| Messages d'erreur en `text-category-poisson` | `Auth.tsx:221` et 5 autres | `text-danger` |
| Anneau de focus `ring-brand/50` ou `/40` | `Button.tsx`, champs, cartes | `ring-brand` plein, 2 px, décalage 2 px |
| Bordure de champ `border-line` seule | `BecomeMerchant.tsx:35`, `AddMarketCard.tsx:18` | Bordure `line-strong` |
| Étoiles `category-fruits` | `StarPicker.tsx`, `MerchantCard.tsx` | Contour `ink` sur l'étoile vide ; étoile pleine accompagnée de la note en chiffres (déjà le cas sur la carte) |
| Icône blanche sur pastille de catégorie claire | `CategoryTabs.tsx`, `ProductPhoto.tsx` | Icône `ink` sur ces catégories, ou fond `soft` et icône de couleur foncée |

### 4.3 Jetons proposés

Ajouts. Aucun jeton existant ne change. `warn-ink`, `accent-ink` et `line-strong` validés le 18/10/2026 (`tokens.ts`, `uiTokens`) ; `success` reste [Proposé].

| Jeton | Valeur | Rôle | Contraste vérifié | Statut |
|---|---|---|---|---|
| `warn-ink` | `#8A5A0E` | Texte d'avertissement | 5,56 sur `surface`, 4,83 sur `soft`, 5,92 sur blanc | [Existant] validé le 18/10/2026 |
| `accent-ink` | `#59641C` | Texte olive (liens secondaires, états actifs sur fond clair) | 6,05 sur `surface`, 5,25 sur `soft` | [Existant] validé le 18/10/2026 |
| `line-strong` | `#8E8A6E` | Bordure de champ, case à cocher, contour d'étape inactive | 3,28 sur `surface`, 3,49 sur blanc | [Existant] validé le 18/10/2026 |
| `success` | alias de `brand` | Succès. Pas de second vert. | 9,56 sur `surface` | [Proposé] |

Pas de jeton « info » bleu. L'information utilise `ink` sur `muted-bg`.

### 4.4 Règles d'usage

| Règle | Statut |
|---|---|
| `brand` porte l'action. Il n'est jamais décoratif. | [Proposé] |
| `accent` ne porte jamais un texte seul. Il sert de fond, avec un texte `ink`. | [Partiel] respecté sur les compteurs (`CartBadge.tsx`) |
| Les couleurs de catégorie ne portent pas de sens d'état. | [Existant] |
| Un état n'est jamais dit par la couleur seule : icône ou libellé en plus. | [Partiel] `StatusBadge` a un libellé ; les points de catégorie (`MerchantCard.tsx`) n'ont pas de texte alternatif |
| Thème d'enseigne : limité à la vitrine. Contraste vérifié à l'ajout de chaque enseigne. | [Existant] `MerchantThemeProvider.tsx` ; vérification [Proposé] |
| Mode sombre : hors périmètre MVP. | [Proposé] |

---

## 5. Typographies

Polices chargées par Google Fonts (`index.html:12-14`) : Nunito 400 à 800, Quicksand 500 à 700, `display=swap`. [Existant]

| Rôle | Police | Classe | Statut |
|---|---|---|---|
| Texte courant, champs, boutons | Nunito | `font-sans` (défaut du `body`) | [Existant] `index.css:12` |
| Titres h1 à h4, prix mis en avant | Quicksand | `font-display` | [Existant] `index.css:16-20` |
| Chiffres (prix, quantités, heures) | Nunito, chiffres tabulaires | `tabular-nums` | [Existant] `Cart.tsx`, `ProductTile.tsx` |

### 5.1 Échelle

| Niveau | Taille / interligne | Graisse | Police | Usage | Statut |
|---|---|---|---|---|---|
| Display | 24 / 30 (`text-2xl`) | 700 | Quicksand | Titre d'écran sans en-tête (Recherche, Prix officiels) | [Existant] `Search.tsx:87` |
| H1 | 20 / 28 (`text-xl`) | 700 | Quicksand | Titre dans `WovenHeader` | [Existant] |
| H2 | 18 / 28 (`text-lg`) | 700 | Quicksand | Titre de section | [Existant] `sectionTitle`, `Home.tsx:23` |
| H3 | 16 / 24 (`text-base`) | 600 | Quicksand | Titre de carte, de modale | [Existant] |
| Corps | 14 / 20 (`text-sm`) | 400 à 600 | Nunito | Texte, boutons | [Existant] |
| Champ | 16 / 24 (`text-base`) | 400 | Nunito | Saisie | [Proposé] aujourd'hui `text-sm` : Safari iOS zoome au focus sous 16 px |
| Légende | 12 / 16 (`text-xs`) | 400 à 600 | Nunito | Aide, texte secondaire, métadonnées | [Existant] |
| Surtitre | 11 / 16, majuscules, interlettrage 0,08 em | 600 | Nunito | Étiquettes de statut, surtitres | [Proposé] |
| Prix fort | 18 / 24 (`text-lg`) | 700 | Quicksand | Total du panier | [Existant] `Cart.tsx` |

Écarts :

| Écart | Fichiers | Règle [Proposé] |
|---|---|---|
| Textes à 9 et 10 px (16 occurrences) | `OrderProgress.tsx`, `StatusBadge.tsx`, `CartBadge.tsx`, `BottomNav.tsx`, `ProductTile.tsx`, `Home.tsx:40`, `Search.tsx:176` | Plancher 11 px pour un surtitre, 12 px pour tout texte lu. 10 px toléré dans le compteur seulement. |
| Interlettrage 0,14 à 0,18 em | `StatusBadge.tsx`, `Home.tsx:40` | 0,08 em au plus |
| Graisse 800 (`font-extrabold`) | `BrandLogo.tsx` | Réservée au logo |

---

## 6. Hiérarchie visuelle

| Ordre | Élément | Traitement | Statut |
|---|---|---|---|
| 1 | Titre d'écran | En-tête vert tressé (`WovenHeader`) ou titre Display sur ivoire | [Existant] `WovenHeader.tsx` |
| 2 | Action principale | Bouton plein `bg-brand`, pleine largeur sur mobile, en bas | [Existant] `Cart.tsx:345` (pilule, à corriger) |
| 3 | Prix et total | Quicksand gras, `tabular-nums` | [Existant] |
| 4 | Contenu (cartes) | `bg-card`, `rounded-card`, `shadow-card` | [Existant] |
| 5 | Métadonnées | `text-xs text-muted` | [Partiel] remplacé par `text-brand-dark/50` à plusieurs endroits |
| 6 | Décor | Motif tressé à 7 % d'opacité, photo d'en-tête voilée à 60 % | [Existant] `index.css:24`, `MarketHeader.tsx` |

Règles [Proposé] :

- Un seul niveau H1 par écran.
- Au plus trois tailles de texte dans une carte.
- Pas plus de deux couleurs vives dans un même écran hors photos (`brand` et une couleur de catégorie).
- Le total à payer est toujours l'élément le plus contrasté du récapitulatif.

---

## 7. Espacements

Grille de 4 px de Tailwind. [Existant]

| Jeton | Valeur | Usage | Statut |
|---|---|---|---|
| `space-1` | 4 px (`gap-1`) | Icône et libellé serrés | [Existant] |
| `space-2` | 8 px (`gap-2`) | Éléments d'une même ligne | [Existant] |
| `space-3` | 12 px (`gap-3`, `p-3`) | Intérieur de carte compacte, écart entre cartes | [Existant] `ScrollRow.tsx`, `MerchantCard.tsx` |
| `space-4` | 16 px (`p-4`) | Intérieur de carte standard, de bottom sheet | [Existant] `Card.tsx` |
| `space-5` | 20 px (`px-5`) | Marge latérale de page | [Existant] `ScrollRow.tsx`, `LegalPage.tsx` |
| `space-6` | 24 px | Écart entre sections | [Existant] |
| Colonne | 448 px max (`max-w-md`) | Largeur de l'application | [Existant] `PageShell.tsx` |
| Bas de page | 96 px (`pb-24`) | Place pour la barre du bas | [Existant] `PageShell.tsx` |
| Zones sûres | `env(safe-area-inset-*)` | Encoche et barre système | [Existant] `WovenHeader.tsx`, `BottomNav.tsx` |

Règles [Proposé] : marge latérale unique de 20 px ; 24 px entre sections ; 12 px entre cartes d'une liste ; aucun espacement hors grille de 4 px.

---

## 8. Border radius

| Jeton | Valeur | Usage | Statut |
|---|---|---|---|
| `rounded-lg` | 8 px | Onglet interne d'un sélecteur segmenté, petit badge | [Existant] `Auth.tsx:114` |
| `rounded-xl` | 12 px | Boutons, champs, barre de recherche, badges | [Existant] `Button.tsx`, `SearchBar.tsx` |
| `rounded-2xl` | 16 px | Vignettes, photos dans une carte, sélecteurs | [Existant] `ProductPhoto.tsx`, `MerchantCard.tsx` |
| `rounded-card` | 24 px (1,5 rem) | Cartes, listes déroulantes | [Existant] `tailwind.config.js:44` |
| `rounded-[1.75rem]` | 28 px | Modale, barre collante du panier | [Existant] `AddMarketCard.tsx:93`, `Cart.tsx:322` ; à nommer `rounded-sheet` [Proposé] |
| `rounded-b-[2rem]` | 32 px, bas seulement | En-tête tressé | [Existant] `WovenHeader.tsx` |
| `rounded-full` | cercle | Avatars, boutons icône carrés, points, compteur | [Existant] |

Règle [Proposé] : `rounded-full` est réservé aux éléments dont la largeur égale la hauteur. Tout élément avec du texte utilise `rounded-xl` ou `rounded-lg`. Exception : le compteur `CartBadge` à trois caractères (« 99+ »).

---

## 9. Ombres

Ombres teintées par `brand`, jamais grises. [Existant] `tailwind.config.js:46-50`

| Jeton | Valeur | Usage | Statut |
|---|---|---|---|
| `shadow-card` | 0 8 20 −12, `brand` à 30 % | Cartes au repos | [Existant] |
| `shadow-field` | 0 6 18 −8, `brand` à 25 % | Barre de recherche mise en avant | [Existant] |
| `shadow-float` | 0 12 30 −10, `brand` à 35 % | Barre du bas, barre collante, modale, liste déroulante | [Existant] |
| Ombre du logo | valeur arbitraire | Plaque du logo | [Existant] `BrandLogo.tsx`, tolérée |

Règles [Proposé] : trois niveaux seulement. Pas d'ombre sur un élément posé sur l'en-tête vert. Une carte a une ombre ou une bordure `line`, pas les deux (aujourd'hui `MarketCard.tsx` et `ProductTile.tsx` ont les deux).

---

## 10. Boutons

[Existant] `src/components/ui/Button.tsx` : variantes `primary`, `secondary`, `ghost`, `danger` ; `fullWidth` ; `loading` avec `Loader2` et `aria-busy` ; hauteur minimale 44 px ; `rounded-xl` ; `active:scale-[0.97]`.

| Variante | Fond / texte | Usage | Statut |
|---|---|---|---|
| Principal | `bg-brand` / blanc | Une seule action principale par écran | [Existant] |
| Secondaire | `bg-brand-light` / `brand` | Action alternative | [Existant] |
| Fantôme | transparent / `ink` | Action tertiaire, « Annuler » dans une modale | [Existant] |
| Danger | `category-poisson` / blanc | Action destructive | [Partiel] contraste 3,65 : passer à `bg-danger` |
| Contour | `bg-card`, bordure `line-strong` / `ink` | « Garder », « Rafraîchir » | [Proposé] utilisé à la main dans `Orders.tsx:136` |
| Icône | carré 44 px, `rounded-full`, libellé accessible obligatoire | Retour, fermer, favori, « + » | [Proposé] composant `IconButton` |
| Lien | `text-brand`, souligné | Navigation dans un texte | [Existant] `Auth.tsx:234` |

| État | Rendu | Statut |
|---|---|---|
| Repos | Voir variante | [Existant] |
| Survol (ordinateur) | Fond à 90 % | [Existant] |
| Pression | Échelle 0,97 | [Existant] |
| Focus clavier | Anneau 2 px `brand` plein, décalage 2 px | [Partiel] anneau à 50 % |
| Désactivé | Opacité 50 %, curseur interdit, raison affichée sous le bouton | [Partiel] raison affichée dans le libellé du panier seulement (« Choisissez un créneau ») |
| Chargement | Icône qui tourne, libellé conservé, bouton bloqué | [Existant] |

Tailles [Proposé] : standard 48 px de haut pour l'action principale en bas d'écran ; compact 44 px ; jamais moins de 44 px pour un bouton seul.

**Boutons et formes pilule encore présents dans le code (écart à la règle « pas de pilule ») :**

| Fichier : ligne | Élément |
|---|---|
| `components/layout/BottomNav.tsx:49` | Conteneur de la barre du bas en pilule flottante |
| `components/ui/StatusBadge.tsx:14` | Badge de statut |
| `components/ui/QuantityStepper.tsx:11` | Conteneur du sélecteur de quantité |
| `components/ui/AddMarketCard.tsx:118, 209` | « Fermer », « Envoyer » |
| `pages/Home.tsx:40` | Badge « À la une » |
| `pages/Home.tsx:142` | Accès à la recherche |
| `pages/Search.tsx:88, 112, 131, 176, 250` | Champ, suggestions, filtres, badge, bouton |
| `pages/OfficialPrices.tsx:74, 93, 103` | Champ, filtres de catégorie |
| `pages/Orders.tsx:78, 109, 136, 139, 220, 231, 340` | Boutons d'avis, d'annulation, de contact, d'état vide |
| `pages/Orders.tsx:286, 292` | Sélecteur « En cours / Passées » |
| `pages/Cart.tsx:69, 345` | « Découvrir », « Passer la commande » |
| `pages/BecomeMerchant.tsx:39, 358, 376, 393` | Puces de choix, champ, ajout de produit, envoi |

Correction [Proposé] : `rounded-xl` pour les boutons, champs et filtres ; `rounded-lg` pour les badges ; barre du bas en bandeau plein de bord à bord (§16).

---

## 11. Champs

Aucun composant de champ. Six styles locaux (§3.2). [Partiel]

Composant [Proposé] `src/components/ui/TextField.tsx`, avec `Select`, `Textarea`, `Checkbox`, `RadioGroup` dans le même dossier.

| Propriété | Règle | Statut |
|---|---|---|
| Libellé | Toujours visible, au-dessus, `text-xs font-semibold text-brand-dark`. Le placeholder n'est pas un libellé. | [Partiel] `BecomeMerchant.tsx:36` le fait ; `Auth.tsx` s'appuie sur le placeholder |
| Fond | `bg-card` | [Proposé] |
| Bordure | 1 px `line-strong`, 2 px `brand` au focus | [Proposé] |
| Rayon | `rounded-xl` | [Proposé] |
| Hauteur | 48 px | [Proposé] |
| Texte | 16 px | [Proposé] |
| Placeholder | `text-muted`, exemple local (« Ex. : Nzeng-Ayong ») | [Partiel] `NeighborhoodPicker.tsx` |
| Aide | Sous le champ, `text-xs text-muted` | [Proposé] |
| Erreur | Bordure `danger`, message `text-danger` avec icône `AlertCircle`, lié par `aria-describedby` | [Proposé] |
| Obligatoire | Mention « (facultatif) » sur les champs facultatifs, pas d'astérisque | [Existant] téléphone dans `Auth.tsx` |
| Clavier | `inputmode="tel"` pour un téléphone, `inputmode="numeric"` pour un prix, `type="email"` | [Proposé] |
| Autocomplétion | `autocomplete` renseigné (email, mot de passe, nom, téléphone) | [Partiel] `Auth.tsx:137` |
| Prix saisi | Mention obligatoire « Prix du magasin » ou « Plafond officiel DGCCRF » à côté du champ | [Proposé] règle `AI_RULES.md` R47 |

Champs spécialisés :

| Champ | Composant | Statut |
|---|---|---|
| Quartier avec recherche | `NeighborhoodPicker.tsx` (combobox, insensible aux accents, saisie libre gardée) | [Existant] |
| Recherche | `SearchBar.tsx` | [Existant], peu utilisé : `Home.tsx` et `Search.tsx` ont leur propre champ |
| Quantité | `QuantityStepper.tsx` | [Existant], cibles de 28 px à agrandir à 44 px |
| Note | `StarPicker.tsx` | [Existant], ajouter `role="radiogroup"` |
| Photo | Champ fichier local | [Partiel] `Profile.tsx`, `BecomeMerchant.tsx` ; composant `PhotoInput` [Proposé] |
| Mot de passe | Champ avec « Afficher » | [Proposé] |
| Code à 4 chiffres (réception, Phase 2) | `CodeInput` | [Proposé], selon décision D5 |

---

## 12. Cards

| Carte | Fichier | Contenu | Statut |
|---|---|---|---|
| Générique | `components/ui/Card.tsx` | `rounded-card bg-white p-4 shadow-card` | [Existant] |
| Commerçant | `components/ui/MerchantCard.tsx` | Photo, nom, lieu, note réelle ou « Pas encore d'avis », points de catégorie, favori | [Existant] |
| Lieu de vente | `components/ui/MarketCard.tsx` | Visuel, nom, quartier, nombre réel de commerçants ou « Bientôt disponible » | [Existant] |
| Lieu à la une | `FeaturedCard` dans `pages/Home.tsx:26` | Grande photo, dégradé vert, badge, nom | [Partiel] badge vague, pilule |
| Produit en grille | `components/ui/ProductTile.tsx` | Photo, nom, vendeur, prix, unité, bouton « + » | [Existant] |
| Résultat produit | `components/ui/ProductResultCard.tsx` | Photo, nom, prix, liste des vendeurs | [Existant] |
| Proposer un lieu | `components/ui/AddMarketCard.tsx` | Carte d'appel et modale de proposition | [Existant] |
| Commande client | locale à `pages/Orders.tsx` | Statut, frise, articles, total, actions | [Partiel] à extraire en `OrderCard` [Proposé] |
| Commande commerçant | locale à `pages/MerchantSpace.tsx` | Créneau, adresse, articles, total, actions | [Partiel] |
| Course livreur | locale à `pages/CourierSpace.tsx` | Commerçant, quartier, créneau, total | [Partiel] |
| Dossier à valider | locale à `pages/AdminSpace.tsx` | Nom, adresse ou téléphone, boutons | [Partiel] |
| Squelette | `CardSkeleton` dans `components/ui/CatalogState.tsx` | Gabarit de carte en attente | [Existant] |

Règles [Proposé] :

- Fond `bg-card`, `rounded-card`, `shadow-card` ou bordure `line`, pas les deux.
- Toute la carte est cliquable quand elle mène à un détail. Une action secondaire dans la carte a sa propre cible de 44 px.
- Photo de repli Pexels : mention discrète « Photo d'illustration » quand la photo ne vient pas du commerçant. Une photo de stock ne doit pas passer pour le produit vendu. Source de la photo déjà connue dans `ProductPhoto.tsx`.
- Une note ne s'affiche qu'avec son nombre d'avis.
- Aucun compteur décoratif (« +500 clients », « livré en 30 min »).

---

## 13. Badges

| Badge | Fichier | Rendu | Statut |
|---|---|---|---|
| Statut de commande | `components/ui/StatusBadge.tsx` | Libellé majuscule sur `bg-brand-light` | [Partiel] pilule, 10 px, « En préparation » à 1,99:1 |
| Compteur | `components/ui/CartBadge.tsx` | Nombre `ink` sur `accent`, « 99+ » au-delà | [Existant] |
| « À la une » | `pages/Home.tsx:40` | Majuscules sur `accent` | [Partiel] badge vague |
| Type de résultat | `pages/Search.tsx:176` | Majuscules sur `bg-brand-light` | [Partiel] pilule |
| Statut de compte (en attente, suspendu, refusé) | suffixe texte dans `pages/Profile.tsx:84-88` | Texte entre parenthèses | [Partiel] |

Statuts de commande [Proposé] (libellés réels, couleurs vérifiées) :

| Statut | Libellé | Fond | Texte | Icône lucide |
|---|---|---|---|---|
| `en_preparation` | En préparation | `muted-bg` | `warn-ink` | `Clock` |
| `en_livraison` sans livreur | Prête, livreur attendu | `muted-bg` | `ink` | `PackageCheck` |
| `en_livraison` avec livreur | En livraison | `brand-light` | `brand` | `Bike` |
| `livree` | Livrée | `brand` | blanc | `CheckCircle2` |
| `annulee` | Annulée | `muted-bg` | `danger` | `XCircle` |

La distinction « prête » et « en livraison » repose sur `livreur_id`. Elle corrige l'écart d'APP_FLOW §2.1 sans créer de statut.

Règles [Proposé] : `rounded-lg`, 11 px, interlettrage 0,08 em, icône de 14 px. Un badge dit un fait vérifiable (statut, catégorie, « Prix officiel DGCCRF »). Pas de « Top », « Populaire », « Recommandé », « À la une » sans critère affiché. « À la une » devient un titre de section factuel, par exemple « Lieux avec des commerçants ».

---

## 14. Modales

| Élément | Règle | Statut |
|---|---|---|
| Existant | Une seule : proposition de marché ou magasin, `role="dialog"`, `aria-modal`, `aria-labelledby`, voile `bg-black/40`, `rounded-[1.75rem]`, ouverte en bas sur mobile et centrée dès `sm` | [Existant] `AddMarketCard.tsx:92` |
| Composant | `src/components/ui/Modal.tsx` | [Proposé] |
| Usage | Confirmation d'une action irréversible ou à conséquence (supprimer un produit, suspendre un compte, approuver ou rejeter, marquer livrée) | [Proposé] ; aujourd'hui aucune confirmation (`MerchantSpace.tsx:200`, `AdminSpace.tsx`) |
| Structure | Titre, une phrase de conséquence, deux boutons : fantôme « Annuler » à gauche, principal ou danger à droite | [Proposé] |
| Fermeture | Bouton fermer de 44 px, touche Échap, toucher le voile (sauf si une saisie est en cours) | [Partiel] bouton seul dans `AddMarketCard.tsx` |
| Focus | Piégé dans la modale, rendu à l'élément d'origine à la fermeture | [Proposé] |
| Défilement | Page bloquée derrière | [Proposé] |
| Taille | Largeur 448 px max, hauteur 90 vh max | [Existant] |
| Mouvement | Fondu de 150 ms, sans rebond | [Proposé] |

Le choix du motif d'annulation reste en ligne dans la carte (`Orders.tsx:117`). C'est conforme : la décision est lisible à côté de la commande.

---

## 15. Bottom sheets

| Élément | Règle | Statut |
|---|---|---|
| Existant | Aucun composant. La modale de `AddMarketCard` s'ouvre en bas sur mobile. Le récapitulatif du panier est une barre collante, pas une feuille. | [Partiel] |
| Composant | `src/components/ui/BottomSheet.tsx`, même base que `Modal` | [Proposé] |
| Usages | Filtres et tri de la recherche, choix du moyen de paiement, détail d'une course livreur, choix d'adresse, avertissement « panier d'un autre commerçant » | [Proposé] |
| Forme | Coins hauts 28 px, poignée de 32 × 4 px `line-strong`, `bg-card`, `shadow-float` | [Proposé] |
| Hauteur | Contenu, 85 % de l'écran au plus, défilement interne | [Proposé] |
| Action | Bouton principal collé en bas, au-dessus de la zone sûre | [Proposé] |
| Fermeture | Glisser vers le bas, voile, bouton fermer, Échap | [Proposé] |
| Avertissement panier | Le changement de commerçant demande une confirmation : « Ton panier contient des produits de X. Le vider et ajouter ce produit ? » | [Proposé] ; aujourd'hui remplacement sans confirmation (APP_FLOW §4.3) |

---

## 16. Navigation

| Composant | Fichier | Rôle | Statut |
|---|---|---|---|
| Barre du bas | `components/layout/BottomNav.tsx` | 5 onglets, icônes lucide et icône panier propriétaire, compteurs, état actif `text-brand` et trait plus épais | [Partiel] |
| En-tête tressé | `components/layout/WovenHeader.tsx` | Titre, retour, motif `woven-pattern` | [Existant] ; le commentaire dit « bleu », la couleur est verte |
| En-tête de lieu | `components/layout/MarketHeader.tsx` | Photo voilée ou logo en filigrane | [Existant] |
| Onglets de catégorie | `components/ui/CategoryTabs.tsx` | Rangée de catégories, indicateur qui glisse | [Existant] |
| Rangée horizontale | `components/ui/ScrollRow.tsx` | Défilement au doigt, flèches au clavier et à la souris, points de position | [Existant] |
| Sélecteur segmenté | local à `Orders.tsx:292`, `Auth.tsx:107`, `MerchantSpace.tsx:274`, `CourierSpace.tsx:265` | Deux ou trois onglets internes | [Partiel] quatre implémentations ; `role="tablist"` dans `Orders.tsx` seulement |
| Page légale | `components/layout/LegalPage.tsx` | En-tête et sections | [Existant] |

Barre du bas, règles [Proposé] :

| Règle | Écart actuel |
|---|---|
| Bandeau plein de bord à bord, `bg-card`, filet `line` en haut, hauteur 64 px plus la zone sûre | Pilule flottante translucide avec flou (`BottomNav.tsx:49`) |
| Toujours visible | Masquée au défilement vers le bas (`BottomNav.tsx:27`) : l'utilisateur perd ses repères |
| Libellés de 11 px au moins | 10 px |
| `aria-current="page"` sur l'onglet actif | Fourni par `NavLink` [Existant] |
| Masquée dans le tunnel quand une barre d'action collante est présente | Les deux sont empilées |

Composant [Proposé] `src/components/ui/SegmentedControl.tsx` : `role="tablist"`, `rounded-xl`, onglet actif `bg-card` et texte `brand`, flèches clavier.

---

## 17. Icônes

Bibliothèque : `lucide-react`. [Existant]

| Règle | Statut |
|---|---|
| Une seule bibliothèque. Pas de mélange avec une autre famille. | [Existant] |
| Exception : icône panier propriétaire `PanierMark` | [Existant] `components/ui/CartIcon.tsx` |
| Tailles : 16 px dans le texte, 20 px dans un bouton, 24 px dans la barre du bas, 36 px dans un état vide | [Existant] dans les faits ; [Proposé] comme règle |
| Trait : 1,8 par défaut, 2,4 pour l'état actif | [Existant] `BottomNav.tsx` |
| Décorative : `aria-hidden="true"` | [Partiel] absent dans `SearchBar.tsx`, `MerchantCard.tsx`, `StarPicker.tsx`, liens retour |
| Seule dans un bouton : libellé accessible obligatoire | [Partiel] liens retour sans libellé |
| Pas d'icône pour décorer un titre de section | [Proposé] |

Correspondances [Existant] (`components/ui/icons.tsx`) : légumes `Carrot`, fruits `Apple`, poisson `Fish`, céréales `Wheat`, restauration `UtensilsCrossed`, boulangerie `CakeSlice`, bricolage `Hammer`, épicerie `ShoppingCart` ; marché `ShoppingBasket`, magasin `Store`.

Correspondances [Proposé] : retour `ArrowLeft`, fermer `X`, erreur `AlertCircle`, succès `CheckCircle2`, info `Info`, hors connexion `WifiOff` [Existant], attente `Hourglass` [Existant], suspendu `Ban` [Existant], téléphone `Phone`, WhatsApp `MessageCircle` [Existant], itinéraire `Navigation`, prix officiels `Scale` [Existant], vidéo `Video`, favori `Star`.

---

## 18. Loading

| Situation | Composant | Statut |
|---|---|---|
| Lecture de la session | Écran « Chargement... » (`App.tsx:79-85`) | [Partiel] texte seul ; logo et indicateur [Proposé] |
| Catalogue | `CatalogState` : trois `CardSkeleton` | [Existant] `CatalogState.tsx` |
| Squelette | Classe `.skeleton`, pulsation 1,4 s, `bg-brand-light` | [Existant] `index.css` |
| Bouton | `loading` : `Loader2` qui tourne | [Existant] `Button.tsx` |
| Bouton sans composant | Libellé changé (« Envoi de la commande… », « Annulation… ») | [Existant] `Cart.tsx:347`, `Orders.tsx:140` |
| Envoi de photo ou de vidéo | Progression | [Proposé] |
| Espaces commerçant, livreur, admin | Bouton « Rafraîchir » | [Partiel] pas de squelette |

Règles [Proposé] :

- Moins de 300 ms : rien.
- De 300 ms à 2 s : squelette ou indicateur dans le bouton.
- Plus de 2 s : texte « Chargement des commandes… ».
- Plus de 10 s : message « La connexion est lente » et « Réessayer ».
- Le squelette a la forme du contenu final.
- `role="status"` sur la zone qui charge.

Mouvement [Existant] et décisions [Proposé] :

| Animation | Fichier | Décision |
|---|---|---|
| Apparition au défilement (`.reveal`, 14 px, 480 ms) | `Reveal.tsx`, `index.css` | Garder, réduire à 8 px et 240 ms, premier écran seulement |
| Zoom continu des en-têtes (`.ken-burns`, 16 s en boucle) | `MarketHeader.tsx`, `CategoryDetail.tsx` | Retirer : mouvement permanent sans fonction (WCAG 2.2.2) |
| Vol du produit vers le panier | `lib/flyToCart.ts` | Garder comme retour d'ajout ; durée 400 ms au plus |
| Rebond du compteur et de l'icône panier | `CartBadge.tsx`, `CartIcon.tsx` | Garder |
| Fondu du thème de vitrine (380 ms) | `MerchantThemeProvider.tsx` | Garder |
| Courbe `ease-spring` sur les onglets de catégorie | `CategoryTabs.tsx` | Remplacer par `ease-out` : moins de rebond |
| Réduction du mouvement | `prefers-reduced-motion` | [Existant] `index.css`, `flyToCart.ts` |

---

## 19. Empty

[Existant] dans `Cart.tsx:62`, `Orders.tsx:322`, `Search.tsx:240` : cercle `bg-brand-light`, icône, phrase, bouton. Composant [Proposé] `src/components/ui/EmptyState.tsx`.

| Écran | Message | Action | Statut |
|---|---|---|---|
| Panier vide | « Votre panier est vide » (vouvoiement, à passer au tutoiement) | « Découvrir les commerçants » → Accueil | [Existant] `Cart.tsx:65` |
| Aucune commande | « Aucune commande en cours » ou « Aucune commande livrée pour le moment » | « Découvrir les commerçants » | [Existant] `Orders.tsx` |
| Aucun résultat | « Aucun résultat pour « … » » | Bouton de réinitialisation | [Existant] `Search.tsx:244` |
| Lieu sans commerçant | « Aucun commerçant n'est encore rattaché à ce lieu… » | « Devenir marchand » | [Existant] `MarketDetail.tsx:82` |
| Commerçant sans avis | « Pas encore d'avis » | — | [Existant] |
| Aucune course disponible | « Aucune livraison disponible pour l'instant. » (texte à 50 %) | « Rafraîchir » | [Partiel] `CourierSpace.tsx:320` |
| Aucune commande reçue | « Aucune commande reçue pour l'instant. » (texte à 50 %) | « Rafraîchir » | [Partiel] `MerchantSpace.tsx:493` |
| Aucun produit (commerçant) | « Aucun produit pour l'instant. » ; cible « Ajoute ton premier produit » | Ouvrir le formulaire | [Partiel] `MerchantSpace.tsx:401` |
| Aucun dossier à valider | « Aucune demande en attente. » (texte à 50 %) | — | [Partiel] `AdminSpace.tsx:120` |
| Aucune adresse | « Ajoute une adresse pour être livré » | « Ajouter une adresse » | [Partiel] `DeliverySlot.tsx` |
| Aucun favori | « Aucun favori » | Accueil | [À créer] |

Règles [Proposé] : une icône lucide de 36 px, une phrase de titre, une phrase d'aide au plus, une action. Pas d'illustration générée, pas de mascotte.

---

## 20. Erreur

| Niveau | Rendu | Exemple | Statut |
|---|---|---|---|
| Champ | Message sous le champ, `text-danger`, icône | « Le mot de passe doit contenir au moins 6 caractères. » | [Partiel] message global sous le formulaire, en `category-poisson` |
| Formulaire | Liste des champs manquants en haut, avec liens vers les champs | `BecomeMerchant.tsx` | [Existant] |
| Action | Message dans la carte, `role="alert"` | « La commande n'a pas pu être annulée : elle est peut-être déjà en livraison. » | [Existant] `Orders.tsx:131` |
| Chargement | Bloc avec icône `WifiOff`, phrase, « Réessayer » | `CatalogState.tsx` | [Existant] |
| Réseau | Bandeau sombre en haut | `OfflineBanner.tsx` | [Existant] |
| Écran | Page 404 ; « Ce lien n'est plus valide. » | `ResetPassword.tsx` | [Partiel] 404 à créer |
| Accès | « Accès réservé à l'administrateur » et retour | `AdminSpace.tsx` | [Existant] |

Règles [Proposé] :

- Aucune erreur silencieuse. Les cas listés dans APP_FLOW (commande, vidéo, produit, statut, actions admin) affichent un message.
- Jamais de message brut de la base. Traduction en phrase utile (`BecomeCourier.tsx:85` et avis dans `Orders.tsx` à corriger).
- Structure : ce qui s'est passé, puis ce que l'utilisateur peut faire. « La commande n'a pas été envoyée. Ton panier est conservé. Réessaie. »
- La saisie est conservée après une erreur.
- Couleur `danger` et icône `AlertCircle`. Jamais la couleur seule.

---

## 21. Succès

| Situation | Rendu | Statut |
|---|---|---|
| Proposition de lieu envoyée | Icône `Check` sur `accent`, phrase, « Fermer » | [Existant] `AddMarketCard.tsx:104` |
| Mot de passe modifié | « Ton mot de passe a été modifié. » et « Continuer » | [Existant] `ResetPassword.tsx` |
| Avis envoyé | « Merci pour votre avis » | [Existant] `Orders.tsx` |
| Lien de réinitialisation envoyé | « Vérifie ta boîte mail » | [Existant] `Auth.tsx:127` |
| Commande passée | Écran de confirmation : numéro, commerçant, créneau, total estimé, moyen de paiement, suite | [À créer] (APP_FLOW, B07) |
| Produit ajouté au panier | Vol vers le panier et compteur | [Existant] |
| Action commerçant, livreur ou admin | Message court de confirmation (§22) | [Proposé] |

Règles [Proposé] : le succès dit le fait et la suite (« Commande envoyée à Maman Odette. Tu seras livré demain matin. »). Pas de confettis, pas d'animation de célébration.

---

## 22. Notifications

| Canal | Rendu | Statut |
|---|---|---|
| Compteur « Commandes » dans la barre | `CartBadge`, statuts vus en `localStorage` | [Existant] `BottomNav.tsx` |
| Bandeau « Une ou plusieurs commandes ont été mises à jour… » | En haut de `/commandes` | [Existant] `Orders.tsx:303-307` |
| Compteur « Panier » | `CartBadge` | [Existant] |
| Bandeau hors connexion | `OfflineBanner` | [Existant] |
| Message éphémère (toast) | Composant `Toast.tsx` : bas d'écran au-dessus de la barre, 4 s, `role="status"`, fermeture manuelle, une seule à la fois | [Proposé] |
| Bandeau de page | Composant `Banner.tsx` : info (`muted-bg` et `ink`), avertissement (`warn-ink`), erreur (`danger`) | [Proposé] |
| Centre de notifications | Écran C20 | [À créer] |
| Push, SMS, email | Phase 2 (APP_FLOW §8.2) | [À créer] |

Règles [Proposé] : une erreur bloquante n'est jamais un toast ; elle reste à l'écran. Un toast ne contient pas d'action critique. Pas de son, pas de vibration au MVP.

---

## 23. Composants réutilisables

### 23.1 Existants

| Composant | Chemin | Rôle | État |
|---|---|---|---|
| `BrandLogo` | `src/components/ui/BrandLogo.tsx` | Logo panier + « Panier » + plaque « 241 » (2 vert, 4 jaune, 1 bleu), tailles `md` et `lg`, variante sur fond sombre | Conforme ; couleurs du drapeau en dur tolérées |
| `Button` | `src/components/ui/Button.tsx` | 4 variantes, chargement, 44 px | Variante danger à corriger ; sous-utilisé |
| `Card` | `src/components/ui/Card.tsx` | Carte générique | `bg-white` au lieu de `bg-card` |
| `CartBadge` | `src/components/ui/CartBadge.tsx` | Compteur animé | Conforme |
| `CartIcon`, `PanierMark` | `src/components/ui/CartIcon.tsx` | Icône panier propriétaire | Conforme |
| `CatalogState`, `CardSkeleton` | `src/components/ui/CatalogState.tsx` | Chargement et erreur du catalogue | Texte secondaire à 60 % |
| `CategoryTabs` | `src/components/ui/CategoryTabs.tsx` | Onglets de catégorie | Icônes blanches peu contrastées |
| `MarketCard` | `src/components/ui/MarketCard.tsx` | Carte de lieu | Ombre et bordure cumulées |
| `MarketVisual`, `useMarketPhoto` | `src/components/ui/MarketVisual.tsx` | Logo, photo ou icône d'un lieu | Conforme |
| `MerchantCard` | `src/components/ui/MerchantCard.tsx` | Carte commerçant | Texte à 40 et 50 % |
| `NeighborhoodPicker` | `src/components/ui/NeighborhoodPicker.tsx` | Combobox de quartier | Conforme ; style de champ fourni par l'appelant |
| `OrderProgress` | `src/components/ui/OrderProgress.tsx` | Frise de 3 étapes | « En route » affiché trop tôt ; textes 9 px |
| `ProductPhoto` | `src/components/ui/ProductPhoto.tsx` | Vignette produit avec repli | Mention « Photo d'illustration » à ajouter |
| `ProductResultCard` | `src/components/ui/ProductResultCard.tsx` | Résultat de recherche | Conforme |
| `ProductTile` | `src/components/ui/ProductTile.tsx` | Produit en grille | Conforme |
| `QuantityStepper` | `src/components/ui/QuantityStepper.tsx` | Quantité | Pilule ; cibles de 28 px |
| `Reveal` | `src/components/ui/Reveal.tsx` | Apparition au défilement | À atténuer |
| `ScrollRow` | `src/components/ui/ScrollRow.tsx` | Rangée horizontale accessible | Conforme |
| `SearchBar` | `src/components/ui/SearchBar.tsx` | Champ de recherche | Peu réutilisé ; placeholder à 40 % ; pas de libellé |
| `StarPicker` | `src/components/ui/StarPicker.tsx` | Note de 1 à 5 | Pas de `radiogroup` |
| `StatusBadge` | `src/components/ui/StatusBadge.tsx` | Statut de commande | Pilule, contraste, 10 px |
| `CategoryIcon`, `MarketIcon` | `src/components/ui/icons.tsx` | Icônes métier | Conforme |
| `AddMarketCard` | `src/components/ui/AddMarketCard.tsx` | Proposer un lieu (carte et modale) | Modale à extraire en `Modal` |
| `BottomNav` | `src/components/layout/BottomNav.tsx` | Barre du bas | Pilule, masquage au défilement |
| `WovenHeader` | `src/components/layout/WovenHeader.tsx` | En-tête de marque | Conforme |
| `MarketHeader`, `HeroBackdrop`, `LogoWatermark` | `src/components/layout/MarketHeader.tsx` | En-tête de lieu | Zoom continu à retirer |
| `LegalPage`, `LegalSection` | `src/components/layout/LegalPage.tsx` | Pages légales | Lien retour sans libellé |
| `OfflineBanner` | `src/components/layout/OfflineBanner.tsx` | Hors connexion | Conforme |
| `PageShell` | `src/components/layout/PageShell.tsx` | Colonne `max-w-md` | Conforme |
| `MerchantThemeProvider` | `src/theme/MerchantThemeProvider.tsx` | Thème de vitrine | Conforme |

### 23.2 À créer [Proposé]

| Composant | Chemin | Remplace ou sert | Priorité |
|---|---|---|---|
| `TextField`, `Textarea`, `Select` | `src/components/ui/TextField.tsx` | Six styles de champ locaux | P1 |
| `Checkbox`, `RadioGroup` | `src/components/ui/Choice.tsx` | Motifs d'annulation, type de commerce, acceptation des CGU | P1 |
| `IconButton` | `src/components/ui/IconButton.tsx` | Liens retour, fermer, favori | P1 |
| `BackLink` | `src/components/layout/BackLink.tsx` | Retour d'en-tête, 44 px, libellé « Retour » | P1 |
| `Modal` | `src/components/ui/Modal.tsx` | Confirmations | P1 |
| `BottomSheet` | `src/components/ui/BottomSheet.tsx` | Filtres, paiement, avertissement panier | P2 |
| `Toast` | `src/components/ui/Toast.tsx` | Retours d'action | P1 |
| `Banner` | `src/components/ui/Banner.tsx` | Mise à jour des commandes, ajustement de montant, suspension | P1 |
| `EmptyState` | `src/components/ui/EmptyState.tsx` | États vides | P2 |
| `ErrorState` | `src/components/ui/ErrorState.tsx` | Erreur de chargement générique (au-delà du catalogue) | P1 |
| `SegmentedControl` | `src/components/ui/SegmentedControl.tsx` | Quatre sélecteurs locaux | P2 |
| `FilterChip` | `src/components/ui/FilterChip.tsx` | Filtres de recherche et de prix officiels, `rounded-xl` | P2 |
| `OrderCard` | `src/components/ui/OrderCard.tsx` | Cartes de commande client, commerçant, livreur | P2 |
| `PriceSummary` | `src/components/ui/PriceSummary.tsx` | Récapitulatif sous-total, frais, livraison, total | P2 |
| `PriceOriginTag` | `src/components/ui/PriceOriginTag.tsx` | « Prix du magasin » ou « Plafond officiel DGCCRF » | P2 |
| `AccountStatusNotice` | `src/components/ui/AccountStatusNotice.tsx` | En attente, refusé, suspendu (corrige le libellé erroné C16) | P1 |
| `PhotoInput` | `src/components/ui/PhotoInput.tsx` | Photos de profil, de stand, de produit | P2 |
| `StickyActionBar` | `src/components/layout/StickyActionBar.tsx` | Barres « Commander » et « Passer la commande » | P2 |
| `SpaceHeader` | `src/components/layout/SpaceHeader.tsx` | En-tête des espaces commerçant, livreur, admin | P2 |
| `CodeInput` | `src/components/ui/CodeInput.tsx` | Code de réception (Phase 2, selon D5) | P3 |
| `DataTable` | `src/components/ui/DataTable.tsx` | Listes admin sur ordinateur | P3 |
| `StatTile` | `src/components/ui/StatTile.tsx` | Indicateurs réels (dashboard, statistiques) | P3 |

---

## 24. Accessibilité

Cible : WCAG 2.2 niveau AA.

| Critère | Règle | Statut |
|---|---|---|
| 1.4.3 Contraste du texte | 4,5:1 ; 3:1 en grand texte | [Partiel] échecs listés en §4.2 |
| 1.4.11 Contraste non textuel | Bordures de champ, focus, icônes seules à 3:1 | [Partiel] `line`, focus à 50 %, icônes de catégorie |
| 1.4.1 Couleur seule | Libellé ou icône en plus | [Partiel] points de catégorie |
| 1.4.4 Agrandissement | Lisible à 200 % sans perte | [Proposé] à tester ; textes de 9 et 10 px |
| 2.1.1 Clavier | Tout est atteignable au clavier | [Partiel] `ScrollRow` [Existant] ; modale sans piège de focus |
| 2.4.7 Focus visible | Anneau 2 px `brand` | [Partiel] 50 % ; `BecomeCourier.tsx:14` et `MerchantSpace.tsx:21` sans anneau |
| 2.5.8 Taille des cibles | 24 px minimum (AA), 44 px visé | [Partiel] cibles de 28 et 36 px |
| 2.2.2 Pause | Pas de mouvement continu | [Partiel] `ken-burns` |
| 2.3.3 Mouvement | `prefers-reduced-motion` respecté | [Existant] `index.css` |
| 3.3.1 et 3.3.3 Erreurs | Message lié au champ, suggestion | [Partiel] |
| 3.3.2 Libellés | Libellé visible | [Partiel] `Auth.tsx` |
| 4.1.2 Nom, rôle, valeur | Libellé des boutons icône, `aria-current`, `role="tablist"`, `role="radiogroup"` | [Partiel] |
| 4.1.3 Messages d'état | `role="status"` ou `role="alert"` | [Existant] `OfflineBanner`, `CatalogState`, `Orders` |
| Langue | `lang="fr"` | [Existant] `index.html:2` |
| Images | `alt` descriptif sur les photos de produit ; `alt=""` sur le décor | [Existant] `ProductPhoto.tsx`, `MarketHeader.tsx` |
| Logo | `aria-label="Le Panier 241"` | [Existant] `BrandLogo.tsx` |

Contexte local [Proposé] : écrans lus en plein soleil, téléphones d'entrée de gamme, lecteurs moins à l'aise avec l'écrit. Donc contraste au-delà du minimum pour les prix et les actions, phrases courtes, chiffres en clair, icônes doublées de mots.

---

## 25. Responsive

| Largeur | Mise en page | Statut |
|---|---|---|
| 320 à 374 px | Colonne unique, marge 16 px, grille de produits sur 2 colonnes | [Proposé] à vérifier |
| 375 à 447 px (référence) | Colonne unique, marge 20 px | [Existant] |
| 448 à 767 px | Colonne centrée de 448 px sur fond `surface` | [Existant] `max-w-md` |
| 768 à 1023 px | Client : colonne de 448 px. Espaces commerçant et livreur : colonne de 640 px (`max-w-2xl`). Modales centrées. | [Proposé] ; modale centrée dès `sm` [Existant] |
| 1024 px et plus | Client : inchangé. Admin : largeur 1120 px, navigation latérale, tableaux. | [Proposé] |

Règles [Proposé] :

- Le client reste une application mobile, même sur ordinateur.
- L'admin est le seul espace pensé aussi pour l'ordinateur.
- Aucune information n'est retirée en petite largeur. Elle passe à la ligne ou se tronque avec le texte complet accessible.
- Les rangées horizontales gardent leurs flèches au-dessus de 768 px (`ScrollRow`).
- Paysage mobile : la barre collante ne dépasse pas 25 % de la hauteur.

---

## 26. Mobile-first

Référence : 375 × 812 (`PROJECT_CONVENTIONS.md` §35, vérification avant commit).

| Zone (375 × 812) | Hauteur | Contenu | Statut |
|---|---|---|---|
| Barre d'état et encoche | 44 px (`safe-area-inset-top`) | Système | [Existant] |
| En-tête | 120 à 160 px | Titre, retour, éventuellement recherche | [Existant] `WovenHeader` |
| Contenu | défilant | Sections | [Existant] |
| Barre d'action collante | 72 px | Action principale | [Existant] panier et vitrine |
| Barre du bas | 64 px + zone sûre (34 px) | Onglets | [Existant] |

Budget du premier écran [Proposé] : sur 812 px, la barre du bas, la zone sûre et une barre collante prennent environ 170 px. Le récapitulatif du panier (`Cart.tsx:321`) en prend davantage : il couvre près de la moitié de l'écran au-dessus de la barre du bas. Règle : récapitulatif repliable, total et bouton toujours visibles.

Règles [Proposé] :

- Action principale dans le tiers bas de l'écran.
- Cibles de 44 × 44 px, 8 px entre deux cibles.
- Champs en 16 px.
- Pas d'effet de survol nécessaire pour comprendre une action.
- Images en `loading="lazy"` et `decoding="async"` [Existant], taille servie adaptée au mobile, poids réduit pour les réseaux 3G.
- Le panier survit à la fermeture de l'onglet (`localStorage`, B19).
- Polices limitées aux graisses utilisées : Nunito 400, 600, 700 ; Quicksand 600, 700. Aujourd'hui 8 graisses chargées.
- Test sur un appareil Android d'entrée de gamme en plus de l'émulation.

---

## 27. Inventaire des écrans

Reprise d'`APP_FLOW.md` §9. Les écrans partagés (connexion, profil, aide, contact, pages légales) sont comptés dans la colonne Client. L'écran « Chargement » de session est un état transversal (§18), non compté.

| Acteur | Existants ou partiels | À créer | Total |
|---|---|---|---|
| Client | 16 | 8 | 24 |
| Commerçant | 4 | 7 | 11 |
| Livreur | 5 | 5 | 10 |
| Administrateur | 2 | 12 | 14 |
| **Total** | **27** | **32** | **59** |

Gabarit commun à toutes les fiches : colonne `max-w-md`, `PageShell`, barre du bas, `OfflineBanner`. Responsive par défaut : colonne unique centrée (§25). Seules les différences sont indiquées.

---

## 28. Écrans Client

### C01 Connexion, inscription, mot de passe oublié — [Partiel]

| Rubrique | Contenu |
|---|---|
| Route, fichier | Toute route sans session, `src/pages/Auth.tsx` |
| Objectif | Entrer dans l'application ou créer un compte. |
| Utilisateur | Tous, sans session. |
| Contenu | Logo officiel, phrase d'accroche, sélecteur « Connexion / Créer un compte ». Inscription : prénom, nom, téléphone (facultatif), email, mot de passe. Oubli : email. Mentions CGU et confidentialité. |
| Composants | `BrandLogo` (image), sélecteur segmenté local, champs locaux, `Button`, case « Rester connecté ». À venir : `SegmentedControl`, `TextField`, `Checkbox`. |
| Action principale | « Se connecter » ou « Créer mon compte » ou « Envoyer le lien ». |
| Actions secondaires | « Mot de passe oublié ? », retour à la connexion, liens CGU et confidentialité. |
| États | Saisie, envoi, lien envoyé (« Vérifie ta boîte mail »). |
| Erreurs | « Email ou mot de passe incorrect. » ; « Un compte existe déjà avec cet email. » ; mot de passe trop court ; « L'email n'a pas pu être envoyé... ». Écart : couleur `category-poisson`, message global au lieu d'un message par champ. |
| Navigation | Succès → URL demandée ou Accueil. Oubli → message → lien email → C02. |
| Responsive | Colonne de 448 px centrée. Clavier ouvert : bouton visible sans défilement. |
| Écarts design | Libellés absents (placeholder seul), placeholder à 40 %, champs 14 px. Case d'acceptation des CGU absente (cible APP_FLOW). |

### C02 Nouveau mot de passe — [Existant]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/nouveau-mot-de-passe`, `src/pages/ResetPassword.tsx` |
| Objectif | Définir un nouveau mot de passe depuis le lien reçu. |
| Utilisateur | Tous, session de récupération. |
| Contenu | Titre, nouveau mot de passe, confirmation. |
| Composants | Champs locaux, `Button`. |
| Action principale | « Enregistrer ». |
| Actions secondaires | « Continuer » après succès. |
| États | Lien valide, envoi, succès (« Ton mot de passe a été modifié. »). |
| Erreurs | « Ce lien n'est plus valide. » ; « Les deux mots de passe ne sont pas identiques. » |
| Navigation | Succès → Accueil. Lien invalide → connexion. |
| Responsive | Gabarit commun. |

### C03 Accueil — [Existant]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/`, `src/pages/Home.tsx` |
| Objectif | Trouver vite un lieu, un commerçant ou un produit. |
| Utilisateur | Client connecté (et tout rôle). |
| Contenu | Salutation et avatar, accès à la recherche, « À la une », catégories, magasins et enseignes, commerçants, marchés de proximité, produits à découvrir, proposer un marché ou un magasin. Pas de lien vers les prix officiels (décision). |
| Composants | `ScrollRow`, `FeaturedCard` locale, `CategoryTabs`, `MarketCard`, `MerchantCard`, `ProductTile`, `AddMarketCard`, `Reveal`, `CatalogState`. |
| Action principale | Toucher la recherche. |
| Actions secondaires | Ouvrir une catégorie, un lieu, un commerçant ; ajouter un produit ; proposer un lieu ; ouvrir le profil. |
| États | Chargement (squelettes), contenu, catalogue vide par section. |
| Erreurs | Catalogue non chargé : « Impossible de charger le catalogue » et « Réessayer ». Proposition de magasin sans logo : « Ajoutez le logo du magasin ou de l'enseigne. » |
| Navigation | → C04, C05, C06, C07, C11. |
| Responsive | Rangées horizontales ; flèches visibles à la souris. Grille produits sur 2 colonnes. |
| Écarts design | Badge « À la une » vague et en pilule ; accès recherche en pilule (`Home.tsx:142`). |

### C04 Recherche — [Existant]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/recherche`, `src/pages/Search.tsx` |
| Objectif | Trouver un produit, un commerce, un lieu ou un quartier. |
| Utilisateur | Client. |
| Contenu | Titre, champ, suggestions, filtres de catégorie, tri par prix, résultats « Commerces et marchés » et « Produits ». |
| Composants | Champ local (pas `SearchBar`), puces locales, `ProductResultCard`, `MerchantCard`. À venir : `SearchBar`, `FilterChip`, `BottomSheet` pour les filtres. |
| Action principale | Saisir une recherche. |
| Actions secondaires | Filtrer, trier, effacer, ouvrir un résultat. |
| États | Vide (suggestions), saisie, résultats, aucun résultat. |
| Erreurs | Catalogue non chargé. Aucun résultat : message et « Effacer ». |
| Navigation | → C07, C06. |
| Responsive | Filtres en rangée horizontale. |
| Écarts design | Champ, puces, badge et bouton en pilule (`Search.tsx:88, 112, 131, 176, 250`). Pas de pagination (B37). |

### C05 Catégorie — [Existant]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/categorie/:categoryId`, `src/pages/CategoryDetail.tsx` |
| Objectif | Comparer les produits d'une catégorie et leurs vendeurs. |
| Utilisateur | Client. |
| Contenu | En-tête photo, onglets de catégorie, produits groupés, « à partir de », lien vers le vendeur. |
| Composants | `HeroBackdrop`, `CategoryTabs`, `ProductResultCard`, `Reveal`. |
| Action principale | Ouvrir un vendeur. |
| Actions secondaires | Changer de catégorie, retour. |
| États | Chargement, liste, catégorie vide. |
| Erreurs | « Catégorie introuvable. » et retour à l'accueil. |
| Navigation | → C07 ; retour → C03. |
| Responsive | Gabarit commun. |
| Écarts design | Zoom continu de l'en-tête à retirer. |

### C06 Marché ou magasin — [Existant]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/marche/:marketId`, `src/pages/MarketDetail.tsx` |
| Objectif | Voir les commerçants d'un lieu. |
| Utilisateur | Client. |
| Contenu | En-tête photo ou logo en filigrane, nom, quartier, liste des commerçants. |
| Composants | `MarketHeader`, `MerchantCard`, `Reveal`. |
| Action principale | Ouvrir un commerçant. |
| Actions secondaires | Retour ; « Devenir marchand » si le lieu est vide. |
| États | Liste, lieu vide. |
| Erreurs | « Marché introuvable. » et retour. |
| Navigation | → C07, M01. |
| Responsive | Gabarit commun. |

### C07 Fiche commerçant (vitrine) — [Existant]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/marchand/:merchantId`, `src/pages/MerchantDetail.tsx` |
| Objectif | Choisir des produits chez un commerçant. |
| Utilisateur | Client. |
| Contenu | En-tête au thème de l'enseigne, nom, lieu, catégories, note réelle ou « Pas encore d'avis », téléphone, favori, produits avec variantes, avertissement si le panier vient d'un autre commerçant, barre « Commander · n articles » et sous-total. |
| Composants | `MerchantThemeProvider`, `ProductPhoto`, `QuantityStepper`, barre collante locale. À venir : `StickyActionBar`, `BottomSheet` de confirmation. |
| Action principale | « Commander ». |
| Actions secondaires | Ajouter ou retirer un produit, favori, appeler, retour. |
| États | Panier vide, panier en cours ici, panier chez un autre commerçant. |
| Erreurs | Commerçant introuvable. Remplacement du panier sans confirmation (à corriger, §15). |
| Navigation | → C08. |
| Responsive | Barre collante pleine largeur dans la colonne. |
| Écarts design | Commentaires d'avis non affichés (B34). Mention « Photo d'illustration » absente. |

### C08 Créneau — [Partiel]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/creneau`, `src/pages/DeliverySlot.tsx` |
| Objectif | Choisir jour, créneau et adresse. |
| Utilisateur | Client avec un panier. |
| Contenu | « Quel jour ? » (5 jours), « Quel créneau ? » (matin, après-midi, soir, retrait sur stand), « Adresse de livraison ». |
| Composants | `WovenHeader`, cartes de choix locales, `Button`. À venir : `RadioGroup`. |
| Action principale | « Valider le créneau ». |
| Actions secondaires | Changer d'adresse, ajouter une adresse (→ C11), retour. |
| États | Panier vide, sans adresse (bouton désactivé et lien), complet. |
| Erreurs | Pas d'adresse : bouton désactivé, raison affichée. |
| Navigation | → C09 ; retour → C09 ou C07. |
| Responsive | Jours en rangée horizontale. |
| Écarts design | Retrait sur stand exige une adresse et facture la livraison (selon décision D2). Lien retour sans libellé, 36 px. |

### C09 Panier — [Partiel]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/panier`, `src/pages/Cart.tsx` |
| Objectif | Vérifier et envoyer la commande. |
| Utilisateur | Client. |
| Contenu | Commerçant, articles et quantités, adresse, créneau, moyen de paiement (Airtel Money, Moov Money, espèces), vidéo de liste facultative, note « le montant réel peut varier », lien prix officiels, récapitulatif collant : sous-total estimé, frais de service 5 %, livraison, total. |
| Composants | `QuantityStepper`, `ProductPhoto`, récapitulatif local. À venir : `PriceSummary`, `StickyActionBar`, `RadioGroup`, `Toast`. |
| Action principale | « Passer la commande ». |
| Actions secondaires | Modifier les quantités, choisir le créneau, payer avec, joindre une vidéo, « Envoyer aussi via WhatsApp », « Comparer avec les prix officiels ». |
| États | Vide, sans créneau (« Choisissez un créneau »), prêt, envoi (« Envoi de la commande… »). |
| Erreurs | Aujourd'hui ignorées : panier vidé même en échec, vidéo perdue en silence. Cible : message, panier conservé, « Réessayer » ou « Continuer sans la vidéo ». Hors connexion : envoi bloqué. |
| Navigation | → C19 (à créer), puis C10 ; → C12 ; → WhatsApp. |
| Responsive | Récapitulatif repliable sur 375 × 812 (§26). |
| Écarts design | Bouton principal et bouton d'état vide en pilule. Moyen de paiement non enregistré (B06). Vouvoiement dans le libellé. |

### C10 Mes commandes — [Partiel]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/commandes`, `src/pages/Orders.tsx` |
| Objectif | Suivre, annuler, contacter le livreur, noter. |
| Utilisateur | Client. |
| Contenu | Sélecteur « En cours / Passées », bandeau de mise à jour, cartes : statut, frise, articles, total, nom du livreur, motif et date d'annulation. |
| Composants | `StatusBadge`, `OrderProgress`, `StarPicker`, sélecteur local. À venir : `OrderCard`, `SegmentedControl`, `Banner`. |
| Action principale | Selon le statut : « Annuler la commande » (en préparation), « Contacter le livreur sur WhatsApp » (livreur attribué), « Laisser un avis » (livrée). |
| Actions secondaires | « Garder », lien prix officiels si motif « prix trop élevé ». À venir : accepter ou refuser un ajustement (D1), code de réception (D5), « Signaler un problème ». |
| États | Aucune commande, en cours, passées, mise à jour non vue. |
| Erreurs | « La commande n'a pas pu être annulée : elle est peut-être déjà en livraison. » ; message brut de la base pour un avis refusé (à traduire). |
| Navigation | → C12, → WhatsApp, → C22 (à créer). |
| Responsive | Gabarit commun. |
| Écarts design | Sept boutons et le sélecteur en pilule. « En route » affiché dès que la commande est prête. Rafraîchissement manuel. |

### C11 Profil — [Partiel]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/profil`, `src/pages/Profile.tsx` |
| Objectif | Gérer ses informations et accéder aux espaces. |
| Utilisateur | Tous. |
| Contenu | Photo, nom, compteurs réels (commandes, favoris), « Vos informations » (téléphone), « Mes adresses » (ajout avec GPS facultatif), « Moyens de paiement acceptés », accès Espace marchand, Espace livreur, Administration, Aide, Contact, CGU, confidentialité, « Se déconnecter ». |
| Composants | `WovenHeader`, `NeighborhoodPicker`, champs locaux, `Button`. À venir : `TextField`, `PhotoInput`, `AccountStatusNotice`. |
| Action principale | Aucune unique. Section la plus utilisée : adresses. |
| Actions secondaires | Changer la photo, modifier le téléphone, ajouter une adresse, ouvrir un espace, se déconnecter. |
| États | Statuts d'espace : aucun, en attente, suspendu, refusé, actif. |
| Erreurs | « La photo n'a pas pu être envoyée. » ; GPS refusé (forfait de livraison expliqué) ; erreur d'enregistrement du téléphone non affichée (à corriger). |
| Navigation | → M01 ou M03, L01 ou L03, A01, C13, C14, C15, C16, C21, C24 ; déconnexion → C01. |
| Responsive | Gabarit commun. |
| Écarts design | Nom non modifiable ; adresses non modifiables ni supprimables ; « Se déconnecter » à confirmer [Proposé]. |

### C12 Prix officiels — [Existant]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/prix-officiels`, `src/pages/OfficialPrices.tsx` |
| Objectif | Comparer un prix au plafond DGCCRF. |
| Utilisateur | Client. Non lié depuis l'accueil. |
| Contenu | Titre, icône `Scale`, recherche, filtres de catégorie, liste produit et prix plafond, source et date. |
| Composants | Champ et filtres locaux. À venir : `SearchBar`, `FilterChip`, `PriceOriginTag`. |
| Action principale | Rechercher un produit. |
| Actions secondaires | Filtrer, retour. |
| États | Chargement, liste, aucun résultat. |
| Erreurs | « Les prix n'ont pas pu être chargés. Vérifiez votre connexion. » |
| Navigation | Depuis C09 et C10 ; retour. |
| Responsive | Filtres en rangée horizontale. |
| Écarts design | Champ et filtres en pilule (`OfficialPrices.tsx:74, 93, 103`). |

### C13 Aide — [Existant]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/aide`, `src/pages/Help.tsx` |
| Objectif | Comprendre le calcul des prix et le fonctionnement. |
| Utilisateur | Tous. |
| Contenu | Sections d'explication : frais de service 5 %, livraison 2 000 F + 300 F par km, forfait sans GPS, paiement à la livraison. |
| Composants | `WovenHeader`, `Card`. |
| Action principale | Lire. |
| Actions secondaires | Retour, aller au contact. |
| États | Statique. |
| Erreurs | Aucune. |
| Navigation | ← C11 ; → C14. |
| Responsive | Gabarit commun. |
| Écarts design | Lien retour sans libellé. |

### C14 Contact — [Existant]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/contact`, `src/pages/Contact.tsx` |
| Objectif | Joindre le support. |
| Utilisateur | Tous. |
| Contenu | WhatsApp, email. |
| Composants | `WovenHeader`, `Card`, `Button`. |
| Action principale | « Écrire sur WhatsApp ». |
| Actions secondaires | Email, retour. |
| États | Statique. |
| Erreurs | Aucune. |
| Navigation | ← C11, C13 ; → applications externes. |
| Responsive | Gabarit commun. |

### C15 CGU — [Existant]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/cgu`, `src/pages/Terms.tsx` |
| Objectif | Lire les conditions d'utilisation. |
| Utilisateur | Tous, avec ou sans session. |
| Contenu | Date de mise à jour, sections. |
| Composants | `LegalPage`, `LegalSection`. |
| Action principale | Lire. |
| Actions secondaires | Retour. |
| États | Statique. |
| Erreurs | Aucune. |
| Navigation | ← C01, C11. |
| Responsive | Texte 14 px, interligne relâché, largeur de ligne limitée par la colonne. |

### C16 Confidentialité — [Existant]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/confidentialite`, `src/pages/Privacy.tsx` |
| Objectif | Lire la politique de confidentialité. |
| Utilisateur | Tous, avec ou sans session. |
| Contenu | Date, sections, email de contact, demande de suppression par email. |
| Composants | `LegalPage`, `LegalSection`. |
| Action principale | Lire. |
| Actions secondaires | Retour, écrire à l'adresse de contact. |
| États | Statique. |
| Erreurs | Aucune. |
| Navigation | ← C01, C11. |
| Responsive | Comme C15. |

### C17 Vérification email ou OTP — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Confirmer l'email (B09). Le SMS n'est pas décidé. |
| Utilisateur | Nouveau compte ; prioritaire pour l'administrateur. |
| Contenu | Explication, adresse masquée, saisie du code ou attente du lien, délai avant renvoi. |
| Composants | `CodeInput`, `Button`, `Banner`. |
| Action principale | « Valider ». |
| Actions secondaires | « Renvoyer le code », « Changer d'email ». |
| États | Attente, saisie, vérification, succès. |
| Erreurs | Code expiré ou erroné ; envoi impossible. |
| Navigation | C01 → C17 → C03. |
| Responsive | Gabarit commun ; clavier numérique. |

### C18 Fiche produit — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Voir un produit en détail avant l'ajout. Hors MVP. |
| Utilisateur | Client. |
| Contenu | Photo (mention « Photo d'illustration » si besoin), nom, variantes, prix, unité, origine du prix, vendeur, autres vendeurs du même produit. |
| Composants | `ProductPhoto`, `QuantityStepper`, `PriceOriginTag`, `MerchantCard`, `StickyActionBar`. |
| Action principale | « Ajouter au panier ». |
| Actions secondaires | Ouvrir le vendeur, comparer aux prix officiels. |
| États | Disponible, indisponible (P1 commerçant). |
| Erreurs | Produit introuvable ; panier chez un autre commerçant (confirmation). |
| Navigation | C04, C05, C07 → C18 → C07 ou C08. |
| Responsive | Photo pleine largeur, ratio 4:3. |

### C19 Confirmation de commande — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Prouver que la commande est enregistrée (B07). |
| Utilisateur | Client. |
| Contenu | Icône `CheckCircle2`, « Commande envoyée », commerçant, créneau, adresse ou retrait, total estimé, moyen de paiement, rappel « paiement à la livraison », étape suivante. |
| Composants | `PriceSummary`, `Button`. |
| Action principale | « Suivre ma commande ». |
| Actions secondaires | « Envoyer aussi via WhatsApp », « Retour à l'accueil ». |
| États | Succès seulement. L'échec reste sur C09 avec le panier conservé. |
| Erreurs | Aucune ici. |
| Navigation | C09 → C19 → C10 ou C03. |
| Responsive | Gabarit commun. |

### C20 Centre de notifications — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Retrouver les événements de ses commandes (APP_FLOW §8.2). |
| Utilisateur | Client (puis commerçant, livreur). |
| Contenu | Liste datée : livreur attribué, montant ajusté, commande livrée, compte validé. Non lus en gras. |
| Composants | Liste simple, `EmptyState`. |
| Action principale | Ouvrir l'événement. |
| Actions secondaires | « Tout marquer comme lu ». |
| États | Vide, liste, non lus. |
| Erreurs | Chargement impossible : `ErrorState`. |
| Navigation | Accès depuis l'en-tête de C03 ou C10 [Proposé] ; → C10. |
| Responsive | Gabarit commun. |

### C21 Liste des favoris — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Retrouver ses commerçants favoris. |
| Utilisateur | Client. |
| Contenu | Liste de `MerchantCard`. |
| Composants | `MerchantCard`, `EmptyState`. |
| Action principale | Ouvrir un commerçant. |
| Actions secondaires | Retirer un favori. |
| États | Vide (« Aucun favori »), liste. |
| Erreurs | Chargement impossible. |
| Navigation | C11 (compteur favoris) → C21 → C07. |
| Responsive | Gabarit commun. |

### C22 Signalement de problème — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Signaler un problème sur une commande (B31, Phase 2). |
| Utilisateur | Client. |
| Contenu | Commande concernée, motif (liste), description, photo facultative. |
| Composants | `RadioGroup`, `Textarea`, `PhotoInput`, `Button`. |
| Action principale | « Envoyer le signalement ». |
| Actions secondaires | « Contacter le support sur WhatsApp ». |
| États | Saisie, envoi, envoyé avec référence. |
| Erreurs | Envoi impossible hors connexion : saisie conservée. |
| Navigation | C10 → C22 → C10. |
| Responsive | Gabarit commun. |

### C23 Page 404 — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Expliquer qu'une page n'existe pas. |
| Utilisateur | Tous. |
| Contenu | « Cette page n'existe pas », icône. |
| Composants | `EmptyState`, `Button`. |
| Action principale | « Retour à l'accueil ». |
| Actions secondaires | Aucune. |
| États | Unique. |
| Erreurs | Sans objet. |
| Navigation | → C03. |
| Responsive | Gabarit commun. |

### C24 Suppression de compte — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Supprimer son compte en libre-service. |
| Utilisateur | Tous. |
| Contenu | Conséquences (commandes, commerce, profil livreur), conditions (aucune commande en cours), saisie de confirmation. |
| Composants | `Modal`, `TextField`, bouton danger. |
| Action principale | « Supprimer mon compte ». |
| Actions secondaires | « Annuler ». |
| États | Conditions remplies ou non, envoi, terminé. |
| Erreurs | Commande en cours : suppression bloquée avec raison. |
| Navigation | C11 → C24 → C01. |
| Responsive | Gabarit commun. |

---

## 29. Écrans Commerçant

Gabarit [Proposé] des espaces : `SpaceHeader` (nom du commerce, statut, « Quitter l'espace »), largeur 640 px dès 768 px.

### M01 Devenir marchand — [Existant]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/devenir-marchand`, `src/pages/BecomeMerchant.tsx` |
| Objectif | Inscrire son commerce. |
| Utilisateur | Compte sans commerce. |
| Contenu | Cinq sections : type de commerce, informations (nom, lieu, quartier, téléphone), catégories, photos (1 à 4), produits (au moins un). |
| Composants | Champs et puces locaux, `NeighborhoodPicker`. À venir : `TextField`, `Choice`, `FilterChip`, `PhotoInput`, `PriceOriginTag` par produit. |
| Action principale | « Envoyer ma demande ». |
| Actions secondaires | Ajouter ou retirer une photo, un produit ; retour. |
| États | Saisie, champs manquants listés, envoi, envoyé. |
| Erreurs | Photo non envoyée ; commerce non enregistré ; produits non ajoutés (texte renvoyant à un espace encore bloqué, à corriger). |
| Navigation | C11, C03, C06 → M01 → M02. |
| Responsive | Formulaire long : sections repliables [Proposé]. |
| Écarts design | Puces, champ de prix, bouton d'ajout et bouton d'envoi en pilule. Origine du prix non demandée (R47). |

### M02 Espace en attente, refusé ou suspendu — [Partiel]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/marchand-espace`, `src/pages/MerchantSpace.tsx:205-252` |
| Objectif | Dire où en est la demande. |
| Utilisateur | Commerçant non approuvé. |
| Contenu | Icône `Hourglass` ou `Ban`, nom du commerce, message de statut. |
| Composants | `WovenHeader`. À venir : `AccountStatusNotice`. |
| Action principale | En attente : aucune. Refusé ou suspendu : « Contacter le support ». |
| Actions secondaires | Retour au profil. |
| États | Aucun commerce, en attente, refusé, suspendu. |
| Erreurs | Chargement impossible. |
| Navigation | ← C11 ; → C14. |
| Responsive | Gabarit des espaces. |
| Écarts design | Refus affiché « Compte suspendu » (C16). Pas de lien vers le support. Icône `Ban` en `category-poisson`. |

### M03 Mes produits — [Partiel]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/marchand-espace`, onglet « Mes produits », `src/pages/MerchantSpace.tsx:169-203` |
| Objectif | Gérer son catalogue. |
| Utilisateur | Commerçant approuvé. |
| Contenu | Formulaire d'ajout (nom, catégorie, prix, unité, variante, photo), liste des produits. |
| Composants | Sélecteur d'onglets local, champs locaux, `ProductPhoto`. À venir : `SegmentedControl`, `TextField`, `PriceOriginTag`, `Modal` de suppression. |
| Action principale | « Ajouter le produit ». |
| Actions secondaires | Supprimer ; à venir : modifier (M05), marquer indisponible. |
| États | Aucun produit, liste. |
| Erreurs | Échec d'insertion et de photo non signalés (à corriger). |
| Navigation | ↔ M04 ; → M05. |
| Responsive | Formulaire et liste en deux colonnes dès 768 px [Proposé]. |
| Écarts design | Suppression sans confirmation. Champs sans anneau de focus. |

### M04 Commandes reçues — [Partiel]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/marchand-espace`, onglet « Commandes reçues », `src/pages/MerchantSpace.tsx` |
| Objectif | Préparer et remettre les commandes. |
| Utilisateur | Commerçant approuvé. |
| Contenu | Cartes : créneau, libellé d'adresse, articles, total, vidéo, statut, nom du livreur après acceptation. |
| Composants | `StatusBadge`, cartes locales, `Button`. À venir : `OrderCard`, `Modal`, `Toast`. |
| Action principale | « Marquer prête (inviter un livreur) ». |
| Actions secondaires | « Rafraîchir », voir la vidéo, ajuster le montant (D1), « Marquer livrée » (à retirer selon D5) ; à venir : annuler avec motif, « Prête à retirer » (D2). |
| États | Aucune commande, en préparation, prête sans livreur, en livraison, livrée, annulée. |
| Erreurs | Statut affiché avant la réponse de la base ; ajustement annulé en silence. Cible : attente, puis succès ou erreur. |
| Navigation | ↔ M03. |
| Responsive | Gabarit des espaces. |
| Écarts design | Moyen de paiement absent. Bouton d'ajustement affiché sur une commande annulée. |

### M05 Modifier un produit — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Changer prix, unité, photo, disponibilité sans recréer (B15). |
| Utilisateur | Commerçant approuvé. |
| Contenu | Champs du produit, origine du prix, interrupteur « Disponible ». |
| Composants | `BottomSheet` ou écran, `TextField`, `PriceOriginTag`, `PhotoInput`. |
| Action principale | « Enregistrer ». |
| Actions secondaires | « Supprimer le produit » (confirmation). |
| États | Saisie, envoi, enregistré. |
| Erreurs | Champ invalide ; prix au-delà du plafond DGCCRF : avertissement (B32). |
| Navigation | M03 → M05 → M03. |
| Responsive | Feuille sur mobile, modale dès 768 px. |

### M06 Modifier la fiche commerce — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Mettre à jour téléphone, photos, horaires (PRD §17.2). |
| Utilisateur | Commerçant approuvé. |
| Contenu | Informations, photos, horaires. |
| Composants | `TextField`, `PhotoInput`, `Button`. |
| Action principale | « Enregistrer ». |
| Actions secondaires | Annuler. |
| États | Saisie, envoi, enregistré. |
| Erreurs | Photo trop lourde ; enregistrement impossible. |
| Navigation | `SpaceHeader` → M06. |
| Responsive | Gabarit des espaces. |

### M07 Statistiques — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Suivre ses ventes réelles. |
| Utilisateur | Commerçant approuvé. |
| Contenu | Commandes, chiffre livré, annulations, période. Valeurs calculées en base, jamais estimées. |
| Composants | `StatTile`, `SegmentedControl` (période), `EmptyState`. |
| Action principale | Changer la période. |
| Actions secondaires | Ouvrir une commande. |
| États | Pas assez de données (message explicite), données. |
| Erreurs | Chargement impossible. |
| Navigation | Onglet de l'espace [Proposé]. |
| Responsive | Tuiles sur 2 colonnes, 4 dès 768 px. |

### M08 Relevé de commissions — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Voir les commissions dues (taux non fixé, PRD §17.5). |
| Utilisateur | Commerçant approuvé. |
| Contenu | Période, commandes, base, commission, statut du règlement. |
| Composants | Liste, `StatTile`. |
| Action principale | Choisir une période. |
| Actions secondaires | Contacter le support. |
| États | Aucun relevé, relevés. |
| Erreurs | Chargement impossible. |
| Navigation | `SpaceHeader` → M08. |
| Responsive | Liste sur mobile, tableau dès 768 px. |

### M09 Promotions — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Créer une réduction (Phase 2, PRD §12.8). |
| Utilisateur | Commerçant approuvé. |
| Contenu | Produit, réduction, dates. Prix barré calculé par la base. |
| Composants | `TextField`, `Select`, `Button`. |
| Action principale | « Créer la promotion ». |
| Actions secondaires | Arrêter une promotion. |
| États | Aucune, active, terminée. |
| Erreurs | Dates incohérentes ; prix final sous zéro. |
| Navigation | `SpaceHeader` → M09. |
| Responsive | Gabarit des espaces. |
| Règle | Pas de mention « Super promo » ni de compte à rebours. Prix avant et après, dates. |

### M10 Avis reçus — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Lire les avis réels. |
| Utilisateur | Commerçant approuvé. |
| Contenu | Note moyenne avec nombre d'avis, liste datée avec commentaire. |
| Composants | Liste, étoiles en lecture. |
| Action principale | Lire. |
| Actions secondaires | Signaler un avis (modération admin, A07). |
| États | « Pas encore d'avis », liste. |
| Erreurs | Chargement impossible. |
| Navigation | `SpaceHeader` → M10. |
| Responsive | Gabarit des espaces. |

### M11 Justificatifs — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Déposer registre ou carte de vendeur (PRD §17.1). |
| Utilisateur | Commerçant, en attente ou approuvé. |
| Contenu | Pièces attendues, état de chaque pièce. |
| Composants | `PhotoInput`, `StatusBadge` de pièce. |
| Action principale | « Envoyer les pièces ». |
| Actions secondaires | Remplacer une pièce. |
| États | Manquante, envoyée, validée, refusée avec motif. |
| Erreurs | Fichier trop lourd ; format refusé. |
| Navigation | M02 ou `SpaceHeader` → M11. |
| Responsive | Gabarit des espaces. |

---

## 30. Écrans Livreur

Principe [Proposé] : écrans utilisables d'une main, en mouvement, au soleil. Texte des montants et adresses en 16 px au moins.

### L01 Devenir livreur — [Existant]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/devenir-livreur`, `src/pages/BecomeCourier.tsx` |
| Objectif | S'inscrire comme livreur. |
| Utilisateur | Compte sans profil livreur. |
| Contenu | Nom, téléphone, véhicule (Moto, Vélo, Voiture, À pied). |
| Composants | `WovenHeader`, champs locaux, `Button`. À venir : `TextField`, `RadioGroup`. |
| Action principale | « Envoyer ». |
| Actions secondaires | Retour. |
| États | Saisie, envoi. |
| Erreurs | Message brut de la base (à traduire), en `category-poisson`. |
| Navigation | C11 → L01 → L02. |
| Responsive | Gabarit commun. |
| Écarts design | Champs sans anneau de focus. |

### L02 Espace en attente, refusé ou suspendu — [Partiel]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/livreur-espace`, `src/pages/CourierSpace.tsx:141-188` |
| Objectif | Dire où en est la demande. |
| Utilisateur | Livreur non approuvé. |
| Contenu | Icône, nom, message de statut. |
| Composants | `WovenHeader`. À venir : `AccountStatusNotice`. |
| Action principale | Refusé ou suspendu : « Contacter le support ». |
| Actions secondaires | Retour ; à venir : déposer les documents (L06). |
| États | En attente, refusé, suspendu. |
| Erreurs | Chargement impossible. |
| Navigation | ← C11 ; → L06, C14. |
| Responsive | Gabarit des espaces. |
| Écarts design | Refus affiché « Compte suspendu » (C16). |

### L03 Disponibles — [Existant]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/livreur-espace`, onglet « Disponibles », `src/pages/CourierSpace.tsx` |
| Objectif | Trouver une course. |
| Utilisateur | Livreur approuvé. |
| Contenu | Filtre par marché, cartes : commerçant, articles, libellé d'adresse, créneau, total. |
| Composants | Sélecteur local, cartes locales, `Button`. À venir : `SegmentedControl`, `FilterChip`, `OrderCard`. |
| Action principale | « Voir le détail ». |
| Actions secondaires | « Rafraîchir », filtrer. |
| États | Aucune course, liste. |
| Erreurs | Lieux ajoutés absents du filtre ; liste ancienne hors connexion. |
| Navigation | ↔ L05 ; → L04. |
| Responsive | Gabarit des espaces. |
| Écarts design | Gain non affiché, seulement le total (cible : gain estimé, quartier, distance). |

### L04 Détail de course — [Partiel]

| Rubrique | Contenu |
|---|---|
| Route, fichier | État interne de `src/pages/CourierSpace.tsx` |
| Objectif | Décider d'accepter. |
| Utilisateur | Livreur approuvé. |
| Contenu | Articles, libellé d'adresse, créneau, total, téléphone du client. |
| Composants | Vue locale. À venir : `BottomSheet`, `Button`. |
| Action principale | « Accepter cette livraison ». |
| Actions secondaires | Retour, appeler le client. |
| États | Disponible, acceptation en cours. |
| Erreurs | Course déjà prise : aucun message (cible « Course déjà prise » et liste rafraîchie) ; « Numéro non renseigné. » |
| Navigation | L03 → L04 → L05. |
| Responsive | Feuille sur mobile [Proposé]. |
| Écarts design | Téléphone du client visible avant acceptation (S5) ; cible : masqué jusqu'à l'acceptation. |

### L05 Mes livraisons — [Partiel]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/livreur-espace`, onglet « Mes livraisons » |
| Objectif | Suivre ses courses et les clore. |
| Utilisateur | Livreur approuvé. |
| Contenu | Cartes des courses acceptées et livrées. |
| Composants | Cartes locales, `StatusBadge`, `Button`. À venir : `OrderCard`, `Modal` de confirmation. |
| Action principale | « Marquer livrée ». |
| Actions secondaires | Appeler le client, « Rafraîchir ». |
| États | Aucune, en cours, livrées. |
| Erreurs | Erreur non affichée à la clôture. |
| Navigation | ↔ L03 ; → L07, L08. |
| Responsive | Gabarit des espaces. |
| Écarts design | Pas de filtre sur le livreur dans le code (APP_FLOW §3). Aucun total ni gain. |

### L06 Documents — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Déposer les pièces (PRD §18.4, Phase 2). |
| Utilisateur | Livreur. |
| Contenu | Pièce d'identité, photo, permis et document du véhicule si motorisé, numéro mobile money, dates d'expiration. |
| Composants | `PhotoInput`, `TextField`, statuts de pièce. |
| Action principale | « Envoyer les documents ». |
| Actions secondaires | Remplacer une pièce. |
| États | Manquante, envoyée, validée, refusée, expirée. |
| Erreurs | Fichier trop lourd ; pièce expirée. |
| Navigation | L02 → L06. |
| Responsive | Gabarit des espaces. |

### L07 Course acceptée — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Aller chercher et livrer (B05, B22). |
| Utilisateur | Livreur attribué. |
| Contenu | Étape 1 retrait : commerçant, lieu, téléphone. Étape 2 livraison : adresse complète, repère, coordonnées. Montant à encaisser et moyen de paiement. |
| Composants | `OrderCard` détaillée, `Button`, `IconButton` (appel, itinéraire). |
| Action principale | « Ouvrir l'itinéraire ». |
| Actions secondaires | Appeler le commerçant, appeler le client, WhatsApp. |
| États | À récupérer, en route. |
| Erreurs | Sans GPS : adresse et repère seulement, message explicite. |
| Navigation | L05 → L07 → L08. |
| Responsive | Gros boutons d'appel de 48 px. |

### L08 Clôture — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Prouver la remise et l'encaissement (selon D5). |
| Utilisateur | Livreur attribué. |
| Contenu | Code de réception à 4 chiffres (Phase 2), montant encaissé, moyen réellement utilisé. |
| Composants | `CodeInput`, `TextField` numérique, `RadioGroup`, `Button`. |
| Action principale | « Valider la livraison ». |
| Actions secondaires | « Le client n'a pas son téléphone » : repli support. |
| États | Saisie, vérification, livrée. |
| Erreurs | Code erroné ; trois erreurs : blocage et alerte admin. |
| Navigation | L07 → L08 → L05. |
| Responsive | Clavier numérique. |

### L09 Relevé de gains — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Voir ses gains réels (circuit selon D4). |
| Utilisateur | Livreur approuvé. |
| Contenu | Période, courses, frais de livraison perçus, montants encaissés pour les commerçants. |
| Composants | `StatTile`, liste, `SegmentedControl`. |
| Action principale | Changer de période. |
| Actions secondaires | Ouvrir une course. |
| États | Aucun, données. |
| Erreurs | Chargement impossible. |
| Navigation | `SpaceHeader` → L09. |
| Responsive | Gabarit des espaces. |

### L10 Disponibilité et zone — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Se déclarer en service et choisir ses zones (P2). |
| Utilisateur | Livreur approuvé. |
| Contenu | Interrupteur « En service », zones ou quartiers. |
| Composants | Interrupteur, `NeighborhoodPicker` multiple ou `FilterChip`. |
| Action principale | Basculer « En service ». |
| Actions secondaires | Modifier les zones. |
| États | En service, hors service. |
| Erreurs | Enregistrement impossible. |
| Navigation | `SpaceHeader` → L10. |
| Responsive | Gabarit des espaces. |

---

## 31. Écrans Administrateur

Gabarit [Proposé] : sur mobile, sections empilées ; dès 1024 px, navigation latérale (Dashboard, Validations, Utilisateurs, Commandes, Catalogue, Finances, Litiges, Paramètres) et tableaux `DataTable`. Toute action de changement de statut passe par une `Modal` avec motif.

### A01 Espace admin (validations et suspensions) — [Partiel]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/admin`, `src/pages/AdminSpace.tsx` |
| Objectif | Valider ou suspendre commerçants, lieux, livreurs. |
| Utilisateur | Administrateur (email unique). |
| Contenu | Cinq sections : marchands en attente, lieux proposés, livreurs en attente, marchands actifs, livreurs actifs. |
| Composants | `WovenHeader`, cartes locales, `Button`. À venir : `Modal`, `Toast`, `DataTable`, `EmptyState`. |
| Action principale | « Approuver ». |
| Actions secondaires | « Rejeter », « Suspendre », « Rafraîchir » ; à venir : réactiver, ouvrir le dossier (A05). |
| États | Sections vides, listes. |
| Erreurs | Aucune erreur affichée ; aucune confirmation. |
| Navigation | C11 → A01 → A05, A06. |
| Responsive | Une colonne sur mobile ; tableau dès 1024 px. |
| Écarts design | Dossier marchand réduit au nom et à l'adresse. |

### A02 Accès refusé — [Existant]

| Rubrique | Contenu |
|---|---|
| Route, fichier | `/admin` sans droit, `src/pages/AdminSpace.tsx:68-80` |
| Objectif | Bloquer l'accès. |
| Utilisateur | Compte non administrateur. |
| Contenu | « Accès réservé à l'administrateur ». |
| Composants | `Button`. |
| Action principale | « Retour à l'accueil ». |
| Actions secondaires | Aucune. |
| États | Unique. |
| Erreurs | Sans objet. |
| Navigation | → C03. |
| Responsive | Gabarit commun. |

### A03 Dashboard — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Suivre les KPI du PRD §23. |
| Contenu | Commandes, taux de livraison, annulations et motifs, délais, demandes en attente. Valeurs réelles uniquement ; « Données insuffisantes » avant quatre semaines. |
| Composants | `StatTile`, `SegmentedControl`, liste d'alertes. |
| Action principale | Ouvrir une alerte. |
| Actions secondaires | Changer de période. |
| États | Données insuffisantes, données. |
| Erreurs | Chargement impossible. |
| Navigation | Entrée de l'espace admin [Proposé] → A01, A08. |
| Responsive | 2 tuiles par ligne sur mobile, 4 dès 1024 px. |

### A04 Utilisateurs — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Rechercher un compte. |
| Contenu | Recherche, liste : nom, email, téléphone, rôles, date. |
| Composants | `SearchBar`, `DataTable`. |
| Action principale | Ouvrir un compte. |
| Actions secondaires | Filtrer par rôle. |
| États | Vide, liste. |
| Erreurs | Chargement impossible. |
| Navigation | → fiche compte. |
| Responsive | Cartes sur mobile, tableau dès 1024 px. |

### A05 Dossier commerçant — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Décider sur un dossier complet (B18). |
| Contenu | Type, quartier, photos, produits et prix avec origine, justificatifs, historique des statuts. |
| Composants | Galerie, liste, `PriceOriginTag`, `Modal`. |
| Action principale | « Approuver ». |
| Actions secondaires | « Rejeter » avec motif, « Suspendre », « Réactiver ». |
| États | En attente, approuvé, refusé, suspendu. |
| Erreurs | Action refusée par la base : message. |
| Navigation | A01 → A05. |
| Responsive | Deux colonnes dès 1024 px. |

### A06 Livreurs et documents — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Valider les livreurs et leurs pièces (B30). |
| Contenu | Profil, véhicule, documents et expirations. |
| Composants | Liste, visionneuse, `Modal`. |
| Action principale | « Valider le livreur ». |
| Actions secondaires | Refuser une pièce avec motif, suspendre, réactiver. |
| États | En attente, approuvé, refusé, suspendu, pièce expirée. |
| Erreurs | Pièce illisible. |
| Navigation | A01 → A06. |
| Responsive | Comme A05. |

### A07 Produits et avis — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Modérer produits et avis. |
| Contenu | Produits signalés ou au-delà du plafond, avis signalés. |
| Composants | `SegmentedControl`, `DataTable`, `Modal`. |
| Action principale | « Masquer ». |
| Actions secondaires | « Garder », contacter le commerçant. |
| États | Vide, à traiter, traités. |
| Erreurs | Action impossible. |
| Navigation | A03 → A07. |
| Responsive | Cartes sur mobile. |

### A08 Commandes — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Lister, corriger, annuler (B10, P0). |
| Contenu | Filtres par statut, liste, détail avec historique. |
| Composants | `FilterChip`, `DataTable`, `OrderCard`, `Modal` avec motif. |
| Action principale | Ouvrir une commande. |
| Actions secondaires | Corriger le statut, annuler, motif tracé. |
| États | Vide, liste, commande sans livreur après délai (alerte). |
| Erreurs | Motif obligatoire manquant. |
| Navigation | A03 → A08. |
| Responsive | Tableau dès 1024 px. |

### A09 Paiements — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Suivre les encaissements déclarés (selon D4). |
| Contenu | Commande, montant, moyen, encaissé par, date. |
| Composants | `DataTable`, `StatTile`. |
| Action principale | Filtrer par période. |
| Actions secondaires | Ouvrir une commande. |
| États | Vide, liste, écart signalé. |
| Erreurs | Chargement impossible. |
| Navigation | A03 → A09. |
| Responsive | Tableau dès 1024 px. |

### A10 Commissions — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Produire les relevés (PRD §17.5). |
| Contenu | Commerçant, période, base, commission, statut. |
| Composants | `DataTable`, `Button`. |
| Action principale | « Générer le relevé ». |
| Actions secondaires | Marquer réglé. |
| États | Aucun taux fixé (écran désactivé avec explication), relevés. |
| Erreurs | Génération impossible. |
| Navigation | A03 → A10. |
| Responsive | Tableau dès 1024 px. |

### A11 Publicités — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Gérer les mises en avant (Phase 3, PRD §17.6). |
| Contenu | Commerce, emplacement, dates. Mention « Sponsorisé » visible côté client. |
| Composants | `DataTable`, `TextField`, `Modal`. |
| Action principale | « Créer une mise en avant ». |
| Actions secondaires | Arrêter. |
| États | Aucune, active, terminée. |
| Erreurs | Dates incohérentes. |
| Navigation | A03 → A11. |
| Responsive | Gabarit admin. |
| Règle | Une mise en avant payée porte toujours le libellé « Sponsorisé ». Jamais « À la une » seul. |

### A12 Litiges — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Traiter les signalements (PRD §19.2). |
| Contenu | File : commande, motif, description, photo, statut. |
| Composants | `DataTable`, détail, `Textarea`, `Modal`. |
| Action principale | « Traiter le signalement ». |
| Actions secondaires | Contacter les parties, corriger la commande, clore. |
| États | Ouvert, en cours, clos. |
| Erreurs | Motif de clôture manquant. |
| Navigation | A03 → A12 → A08. |
| Responsive | Liste et détail côte à côte dès 1024 px. |

### A13 Prix officiels — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Mettre à jour les plafonds DGCCRF (écriture déjà autorisée, `016:99-102`). |
| Contenu | Produit, unité, prix plafond, source, date. |
| Composants | `DataTable`, `TextField`, `PriceOriginTag` (« Plafond officiel DGCCRF »). |
| Action principale | « Enregistrer le prix ». |
| Actions secondaires | Ajouter, retirer un produit. |
| États | Liste, saisie. |
| Erreurs | Source ou date manquante. |
| Navigation | A03 → A13. |
| Responsive | Tableau dès 1024 px. |

### A14 Paramètres — [À créer]

| Rubrique | Contenu |
|---|---|
| Objectif | Régler barème, délais et plafonds (selon D3 ; valeurs à fixer). |
| Contenu | Frais de service, base et prix au km de livraison, forfait sans GPS, délais, plafond d'ajustement. Valeur actuelle et date de changement. |
| Composants | `TextField`, `Modal` de confirmation. |
| Action principale | « Enregistrer ». |
| Actions secondaires | Voir l'historique. |
| États | Lecture, modification. |
| Erreurs | Valeur hors bornes. |
| Navigation | A03 → A14. |
| Responsive | Gabarit admin. |
| Règle | Toute modification du barème est confirmée et tracée. Pas de valeur saisie dans ce document. |

---

## 32. Synthèse des écarts majeurs entre le code et ce design system

| # | Écart | Fichiers | Priorité [Proposé] |
|---|---|---|---|
| E1 | Boutons, champs, filtres et badges en pilule (plus de 30 occurrences) et barre du bas en pilule flottante | §10 | P1 |
| E2 | Contrastes en échec : `warn` sur `soft` (1,99), texte à 40 à 60 % d'opacité, `category-poisson` pour les erreurs et le bouton danger, anneau de focus à 50 % | §4.2 | P1 |
| E3 | Pas de composant de champ : six styles locaux, libellés absents sur la connexion, texte de 14 px qui déclenche le zoom iOS | §11 | P1 |
| E4 | `Button` contourné dans six écrans | §3.2 | P2 |
| E5 | Aucune modale de confirmation, aucun toast : suppressions et décisions admin sans confirmation ni retour | §14, §22 | P1 |
| E6 | Textes de 9 et 10 px, interlettrage large | §5.1 | P2 |
| E7 | Cibles tactiles de 28 et 36 px ; liens retour sans libellé | §24 | P1 |
| E8 | Mouvement : zoom continu des en-têtes, barre du bas qui disparaît, rebonds `ease-spring` | §18 | P2 |
| E9 | Badge « À la une » sans critère | §13 | P2 |
| E10 | `docs/design-system.md` obsolète ; titre d'onglet « Panier 241 » ; commentaire « bleu » dans `WovenHeader.tsx` | En-tête, §16 | P3 |
| E11 | Tutoiement et vouvoiement mélangés | §1 | P2 |
| E12 | Photos Pexels affichées comme photo du produit, sans mention | §12 | P2 |
