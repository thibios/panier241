# Le Panier 241 — système de design

Source de vérité de la charte **actuelle**. Elle décrit ce qui est dans le code ; en cas d'écart,
le code fait foi (`src/theme/tokens.ts`, `tailwind.config.js`, `src/index.css`) et ce fichier doit
être corrigé. Ne pas ajouter de couleur ni de jeton sans accord du propriétaire (`AI_RULES.md` R7, R51).

Direction : vert profond du logo, olive, jaune ivoire, ivoire, encre vert-noir.

## 1. Chaîne des jetons

1. `src/theme/tokens.ts` définit les valeurs hex (`baseTheme`, `uiTokens`, `categoryColors`, thèmes marchands).
2. `applyBaseTheme()` les pose sur `:root` en variables CSS `--color-<jeton>` (canaux RGB, ex. `27 74 46`).
   Les clés en camelCase passent en kebab-case (`onHeader` → `--color-on-header`).
3. `tailwind.config.js` expose chaque variable en classe : `rgb(var(--color-x) / <alpha-value>)`,
   donc les opacités Tailwind fonctionnent (`bg-brand/10`, `ring-brand/40`).
4. Hors Tailwind (CSS, ombres arbitraires), utiliser `rgb(var(--color-x) / 0.25)`.

Aucun composant ne code de couleur hex en dur (exceptions listées en §7).

## 2. Palette

### 2.1 `baseTheme` (ADN Le Panier 241)

| Jeton | Variable CSS | Classe Tailwind | Valeur | Rôle |
|---|---|---|---|---|
| `brand` | `--color-brand` | `bg-brand`, `text-brand`, `ring-brand` | `#1B4A2E` vert profond | Actions, liens, états actifs |
| `ink` | `--color-ink` | `text-brand-dark`, `bg-brand-dark` | `#22261F` encre vert-noir | Texte et titres |
| `soft` | `--color-soft` | `bg-brand-light` | `#F1E8C9` jaune ivoire | Champs, boutons secondaires, fonds d'icône, squelettes |
| `surface` | `--color-surface` | `bg-surface` | `#FBF8EC` ivoire | Fond de page |
| `accent` | `--color-accent` | `bg-accent`, `text-accent` | `#9DA94A` olive | Badges, indicateurs, compteur du panier |
| `header` | `--color-header` | `bg-header` | `#1B4A2E` | Fond des en-têtes |
| `onHeader` | `--color-on-header` | `text-on-header` | `#FBF8EC` | Texte et icônes sur l'en-tête |

`index.html` reprend `#1B4A2E` dans `<meta name="theme-color">` (une balise meta ne lit pas de variable CSS).

### 2.2 `uiTokens` (communs à toute l'app, non surchargés par les thèmes marchands)

| Jeton | Variable CSS | Classe Tailwind | Valeur | Rôle |
|---|---|---|---|---|
| `card` | `--color-card` | `bg-card` | `#FFFDF6` | Fond de carte, panneaux |
| `line` | `--color-line` | `border-line` | `#E6DDBF` | Bordures, séparateurs |
| `muted` | `--color-muted` | `text-muted` | `#676A58` | Texte secondaire, placeholders |
| `muted-bg` | `--color-muted-bg` | `bg-muted-bg` | `#F5EFD9` | Fond discret (info, bandeaux neutres) |
| `warn` | `--color-warn` | `text-warn`, `bg-warn` | `#D99A2B` | Avertissement, « En préparation » |
| `danger` | `--color-danger` | `text-danger`, `bg-danger` | `#A6402A` | Erreur, « Annulée » |

### 2.3 `categoryColors` (accent par catégorie de produit)

Variable `--color-cat-<id>`, classe `bg-category-<id>` / `text-category-<id>`.

| Catégorie | Valeur | Catégorie | Valeur |
|---|---|---|---|
| `legumes` | `#3FAE5C` | `mode` | `#A65D57` |
| `fruits` | `#F2994A` | `beaute` | `#C0796A` |
| `poisson` | `#E8543A` | `auto-moto` | `#4A4F55` |
| `cereales` | `#C08A3E` | `bebe` | `#5B93AB` |
| `restauration` | `#B5532E` | `livres` | `#8A5A3C` |
| `boulangerie` | `#C9922F` | `jeux` | `#D08A2E` |
| `bricolage` | `#5B7C99` | `sport` | `#2F7F6F` |
| `epicerie` | `#2FA3A3` | `industrie` | `#6B7280` |
| `high-tech` | `#34495E` | `chr` | `#7A6A2E` |
| `maison` | `#7E8F5A` | `numerique` | `#3F6E9A` |

Note : la variante `danger` de `Button` utilise `bg-category-poisson`, pas le jeton `danger`.

### 2.4 Blanc et noir Tailwind

`bg-white`, `text-white`, `bg-black/40` (voiles de modale) et `ring-black/5` restent utilisés
(cartes, boutons pleins, en-têtes). Ce sont les couleurs par défaut de Tailwind, pas des hex en dur.

### 2.5 Jetons de contraste (validés le 18/10/2026)

Ajoutés à `uiTokens` après validation du propriétaire. Ils complètent la palette sans la modifier.

| Jeton | Variable CSS | Classe Tailwind | Valeur | Rôle | Contraste |
|---|---|---|---|---|---|
| `warn-ink` | `--color-warn-ink` | `text-warn-ink` | `#8A5A0E` | Texte d'avertissement sur fond clair (statut « En préparation ») | 5,56 sur `surface`, 4,83 sur `soft`, 5,92 sur blanc |
| `accent-ink` | `--color-accent-ink` | `text-accent-ink`, `bg-accent-ink`, `ring-accent-ink` | `#59641C` | Olive foncé : texte et états actifs sur fond clair (onglet catégorie actif) | 6,05 sur `surface`, 5,25 sur `soft`, 6,43 sur blanc |
| `line-strong` | `--color-line-strong` | `border-line-strong`, `bg-line-strong` | `#8E8A6E` | Bordure de champ, bouton radio, étape inactive | 3,28 sur `surface`, 3,49 sur blanc |

Règles : `warn` et `accent` restent des fonds ou des pastilles (avec texte `ink`) ; sur fond clair, le texte
ou l'indicateur passe par `warn-ink` / `accent-ink`. `line` reste réservé aux bordures décoratives et
séparateurs. Texte secondaire : `text-muted` (5,22 sur `surface`), jamais `text-brand-dark/40` à `/60`.
Anneau de focus : `ring-brand` plein (9,56 sur `surface`), pas `ring-brand/40` ou `/50`.

## 3. Thèmes marchands

- `ThemeTokens` décrit un thème complet ; `baseTheme` est l'ADN Le Panier 241.
- `resolveMarketTheme(market)` et `resolveMerchantTheme(merchant, market)` choisissent le thème :
  enseigne connue (`marketThemes`) > univers « marché frais » (`freshMarketTheme` : terre cuite
  `#C2542D`, vert `#3F8F4A`, fond `baseTheme.surface`) > `baseTheme`.
- `MerchantThemeProvider` (`src/theme/MerchantThemeProvider.tsx`) pose les variables du thème sur le
  conteneur de la vitrine seulement. La navigation garde le thème de base. Entrée en fondu (380 ms).
- Thèmes d'enseigne : Bâti Plus (`mkt-bati-plus`, rouge `#D0121A` sur blanc) et Ceca-Gadis
  (`mkt-ceca-gadis`, bleu `#1B3F8F`, jaune `#F2B705`), repris des logos des enseignes.
- Ajouter une enseigne = une entrée dans `marketThemes`. Vérifier le contraste du texte sur `brand`
  et `header` (4,5:1 minimum).

## 4. Typographie

Chargée depuis Google Fonts dans `index.html`.

| Famille | Classe | Graisses chargées | Usage |
|---|---|---|---|
| Nunito | `font-sans` (défaut du `body`) | 400, 500, 600, 700, 800 | Texte courant, boutons, libellés |
| Quicksand | `font-display` (appliqué à `h1`–`h4` dans `index.css`) | 500, 600, 700 | Titres, logo |

Repli : `ui-sans-serif, system-ui, sans-serif`. Le `body` est en `bg-surface text-brand-dark antialiased`.

## 5. Rayons, ombres, mouvement

| Jeton | Classe | Valeur |
|---|---|---|
| Rayon de carte | `rounded-card` | `1.5rem` (24 px) |
| Ombre de carte | `shadow-card` | `0 8px 20px -12px rgb(var(--color-brand) / 0.30)` |
| Ombre flottante | `shadow-float` | `0 12px 30px -10px rgb(var(--color-brand) / 0.35)` |
| Ombre de champ | `shadow-field` | `0 6px 18px -8px rgb(var(--color-brand) / 0.25)` |
| Courbe | `ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |

Les ombres sont teintées par `brand` : elles suivent le thème marchand. Boutons : `rounded-xl`.

Classes CSS de `src/index.css` : `.woven-pattern` (motif tressé en filigrane, blanc 7 %),
`.reveal` / `.is-visible`, `.theme-scope`, `.ken-burns`, `.badge-pop`, `.cart-bounce`, `.skeleton`
(`bg-brand-light` pulsé). `prefers-reduced-motion` neutralise toutes les animations.

## 6. Composants existants

| Composant | Rôle | Fichier |
|---|---|---|
| `BrandLogo` | Logo officiel (§7) | `src/components/ui/BrandLogo.tsx` |
| `Button` | Variantes `primary`, `secondary`, `ghost`, `danger` ; `loading` | `src/components/ui/Button.tsx` |
| `Card` | Carte blanche `rounded-card shadow-card` | `src/components/ui/Card.tsx` |
| `CartIcon` / `PanierMark` | Icône panier tressé en `currentColor`, rebond `.cart-bounce` | `src/components/ui/CartIcon.tsx` |
| `CartBadge` | Compteur du panier `.badge-pop` | `src/components/ui/CartBadge.tsx` |
| `CatalogState` | Squelettes et message d'erreur avec « Réessayer » | `src/components/ui/CatalogState.tsx` |
| `CategoryTabs` | Onglets catégorie, indicateur glissant | `src/components/ui/CategoryTabs.tsx` |
| `MarketCard`, `MarketVisual` | Carte et visuel d'un lieu de vente (logo obligatoire) | `src/components/ui/` |
| `MerchantCard` | Carte commerçant | `src/components/ui/MerchantCard.tsx` |
| `AddMarketCard` | Proposition d'un marché ou magasin | `src/components/ui/AddMarketCard.tsx` |
| `NeighborhoodPicker` | Choix du quartier | `src/components/ui/NeighborhoodPicker.tsx` |
| `OrderProgress`, `StatusBadge` | Suivi et statut de commande | `src/components/ui/` |
| `ProductPhoto`, `ProductTile`, `ProductResultCard` | Produit (vignette, tuile, résultat) | `src/components/ui/` |
| `QuantityStepper` | Quantité | `src/components/ui/QuantityStepper.tsx` |
| `Reveal` | Apparition au défilement | `src/components/ui/Reveal.tsx` |
| `ScrollRow` | Rangée horizontale avec flèches | `src/components/ui/ScrollRow.tsx` |
| `SearchBar` | Recherche | `src/components/ui/SearchBar.tsx` |
| `StarPicker` | Note d'un avis réel | `src/components/ui/StarPicker.tsx` |
| `icons` | Icônes de l'app | `src/components/ui/icons.tsx` |
| `PageShell`, `BottomNav` | Structure d'écran, navigation basse | `src/components/layout/` |
| `WovenHeader`, `MarketHeader` | En-têtes (`bg-header`, motif tressé, `HeroBackdrop`) | `src/components/layout/` |
| `OfflineBanner` | Bandeau hors connexion | `src/components/layout/OfflineBanner.tsx` |
| `LegalPage` | Gabarit des pages légales | `src/components/layout/LegalPage.tsx` |
| `MerchantThemeProvider` | Thème local de la vitrine | `src/theme/MerchantThemeProvider.tsx` |

Tous les éléments interactifs ont un anneau `focus-visible`, une zone tactile d'au moins 40 px et un
libellé pour lecteur d'écran quand ils n'ont pas de texte.

## 7. Logo et couleurs hors jetons (autorisées)

- `BrandLogo` : panier tressé (`public/logos/panier-mark.png`) sur plaque blanche, mot « Panier » en
  `text-brand-dark` (ou `text-on-header` sur fond sombre), plaque « 241 » aux couleurs du drapeau
  gabonais : `2` vert `#009E60`, `4` jaune `#F2B705`, `1` bleu `#3A75C4`. Ces trois hex sont les
  couleurs officielles du logo et restent en dur. Ne pas modifier le logo.
- Logo complet : `public/logos/le-panier-241.webp` (écran de connexion).
- `public/basket-icon.svg` (non référencé à ce jour) : carré `#1B4A2E`, panier `#FBF8EC`, tressage `#9DA94A`.
- Favicon et icône iOS : `public/favicon.png`, `public/apple-touch-icon.png`.
- Couleurs de marque des enseignes : uniquement dans `marketThemes` (`tokens.ts`).

## 8. Règles « pas de look IA »

- Pas de dégradé violet, pas de look générique (seul dégradé admis : vert vers transparent).
- Pas d'emoji dans l'interface ni dans les contenus.
- Pas de faux avis, de fausses métriques, de faux comptes ni de chiffres décoratifs. « Pas encore
  d'avis » quand il n'y en a pas.
- Pas de photo générée par IA ; visuels réels (logos des commerces, photos Pexels).
- Toute couleur passe par les jetons. Contrôle : `grep -rnE "#[0-9A-Fa-f]{6}" src --include=*.tsx`
  ne doit renvoyer que les trois couleurs du logo (§7).
