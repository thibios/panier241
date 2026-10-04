# Le Panier 241 — système de design

Direction validée : **Choix B** — Vert Palmier / Vert Lime / Sable / Ivoire / Anthracite.

## 1. Design tokens

Source unique : [`src/theme/tokens.ts`](../src/theme/tokens.ts). Chaque jeton devient une variable CSS
(`--color-<jeton>`, en canaux RGB) que Tailwind consomme (`tailwind.config.js`). Aucun composant ne
contient de couleur en dur.

| Jeton | Rôle | Classe Tailwind | Valeur de base |
|---|---|---|---|
| `brand` | Actions, liens, états actifs | `bg-brand`, `text-brand` | `#166534` Vert Palmier |
| `ink` | Texte et titres | `text-brand-dark` | `#1C1C1C` Anthracite |
| `soft` | Champs, boutons secondaires, fonds d'icône | `bg-brand-light` | `#F3E6C8` Sable |
| `surface` | Fond de page | `bg-surface` | `#FFFBF5` Ivoire |
| `accent` | Badges, indicateurs, compteur du panier | `bg-accent` | `#84CC16` Vert Lime |
| `header` | Fond des en-têtes | `bg-header` | `#166534` |
| `cat-*` | Accent par catégorie de produit | `bg-category-*` | voir `categoryColors` |

Autres jetons (Tailwind) : rayon `rounded-card` (1,25 rem), ombre `shadow-card` (très légère, teintée
par `ink`), courbe `ease-spring`.

## 2. Thèmes marchands

- `ThemeTokens` décrit un thème complet ; `baseTheme` est l'ADN Le Panier 241.
- `resolveMarketTheme(market)` et `resolveMerchantTheme(merchant, market)` choisissent le thème :
  enseigne connue (`marketThemes`) > univers « marché frais » (terre cuite, crème, vert) > thème de base.
- `MerchantThemeProvider` pose les variables du thème sur le conteneur de la vitrine seulement. La
  navigation et le reste de l'app gardent le thème de base. L'entrée se fait en fondu (380 ms).
- Thèmes d'enseigne actuels : Bâti Plus (blanc / rouge / noir, **à confirmer avec leur charte**) et
  Ceca-Gadis (bleu du logo).
- Ajouter une enseigne = ajouter une entrée dans `marketThemes`. Vérifier le contraste du texte blanc
  sur `brand` et `header` (4,5:1 minimum).

## 3. Composants d'animation

| Composant / classe | Effet | Fichier |
|---|---|---|
| `Reveal` (`.reveal`) | Fondu + montée à l'entrée dans l'écran, décalage par `index` | `components/ui/Reveal.tsx` |
| `CategoryTabs` | Indicateur glissant, onglet actif agrandi (spring) | `components/ui/CategoryTabs.tsx` |
| `flyToCart()` | La vignette du produit vole vers l'icône panier | `lib/flyToCart.ts` |
| `CartIcon` (`.cart-bounce`) | Micro-rebond à l'arrivée du produit | `components/ui/CartIcon.tsx` |
| `CartBadge` (`.badge-pop`) | Rebond du compteur à chaque changement | `components/ui/CartBadge.tsx` |
| `HeroBackdrop` (`.ken-burns`) | Zoom très lent sur les photos d'en-tête | `components/layout/MarketHeader.tsx` |
| `BottomNav` | S'efface en descendant, revient en remontant ou à l'ajout au panier | `components/layout/BottomNav.tsx` |
| `.theme-scope` | Fondu d'entrée dans la vitrine d'un commerce | `index.css` |
| `.skeleton` | Pulsation des blocs de chargement | `index.css` |

Tout est en CSS ou via les API natives (`IntersectionObserver`, Web Animations) : aucun calcul
JavaScript à chaque image. `prefers-reduced-motion` neutralise les animations (CSS) et `flyToCart`
saute le vol.

## 4. Icône Panier 241

`PanierMark` (dans `CartIcon.tsx`) : panier à anse, bord arrondi, corps évasé et quatre brins de
tressage. Tracé en `currentColor`, donc recolorable.

| Variante | Usage |
|---|---|
| Contour | Navigation, état normal |
| Contour + corps légèrement rempli (`filled`) | Onglet Panier actif |
| Blanc sur carré vert, tressage lime | Favicon (`public/basket-icon.svg`) |

## 5. États des composants

| Composant | Normal | Press | Sélectionné | Chargement | Désactivé | Erreur |
|---|---|---|---|---|---|---|
| `Button` | fond `brand` | `scale 0.97` | — | `loading` : spinner, bloqué | opacité 50 % | variante `danger` |
| Onglet catégorie | photo ronde | `scale 0.95` | agrandi + anneau `accent` + indicateur | icône de catégorie tant que la photo charge | — | icône si photo indisponible |
| `MarketCard` / `MerchantCard` | carte blanche | `scale 0.97` | — | `CardSkeleton` | « Bientôt disponible » | — |
| Onglet de navigation | gris | `scale 0.95` | `brand`, soulevé, barre `accent` | — | — | — |
| Catalogue (`CatalogState`) | — | — | — | squelettes | — | message + « Réessayer » |
| Connexion | — | — | — | — | — | bandeau `OfflineBanner` |

Tous les éléments interactifs ont un anneau de focus clavier (`focus-visible`), une zone tactile d'au
moins 40 px et un libellé pour lecteur d'écran quand ils n'ont pas de texte.
