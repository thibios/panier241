import type { CSSProperties } from 'react'
import type { CategoryId, Market, Merchant } from '../types'

/**
 * Design tokens de couleur. Toute couleur de l'interface passe par ces jetons
 * (exposés en variables CSS, consommées par Tailwind) : aucun composant ne
 * code de couleur en dur.
 */
export interface ThemeTokens {
  /** Couleur d'action : boutons, liens, états actifs. */
  brand: string
  /** Texte et titres. */
  ink: string
  /** Surface douce : champs, boutons secondaires, fonds d'icône. */
  soft: string
  /** Fond général de la page. */
  surface: string
  /** Accent : badges, indicateurs, compteur du panier. */
  accent: string
  /** Fond des en-têtes. */
  header: string
}

/** ADN Le Panier 241 : Vert Palmier / Vert Lime / Sable / Ivoire / Anthracite. */
export const baseTheme: ThemeTokens = {
  brand: '#166534',
  ink: '#1C1C1C',
  soft: '#F3E6C8',
  surface: '#FFFBF5',
  accent: '#84CC16',
  header: '#166534',
}

/** Accents par catégorie de produit (pastilles, fonds de vignette). */
export const categoryColors: Record<CategoryId, string> = {
  legumes: '#3FAE5C',
  fruits: '#F2994A',
  poisson: '#E8543A',
  cereales: '#C08A3E',
  bricolage: '#5B7C99',
  epicerie: '#2FA3A3',
}

/** Univers visuels réutilisables par type de commerce. */
const freshMarketTheme: ThemeTokens = {
  brand: '#C2542D',
  ink: '#2A1D16',
  soft: '#FBEBDD',
  surface: '#FFFBF5',
  accent: '#3F8F4A',
  header: '#C2542D',
}

/** Thèmes propres à une enseigne, par identifiant de lieu de vente. */
const marketThemes: Record<string, ThemeTokens> = {
  // Direction blanc / rouge / noir, à confirmer avec la charte officielle de Batiplus.
  'mkt-bati-plus': {
    brand: '#D0121A',
    ink: '#111111',
    soft: '#F3F3F3',
    surface: '#FFFFFF',
    accent: '#D0121A',
    header: '#111111',
  },
  // Bleu du logo du groupe Ceca-Gadis.
  'mkt-ceca-gadis': {
    brand: '#1B3F8F',
    ink: '#14213D',
    soft: '#E8EEF9',
    surface: '#FFFFFF',
    accent: '#F2B705',
    header: '#1B3F8F',
  },
}

const freshCategories: CategoryId[] = ['legumes', 'fruits', 'poisson', 'cereales']

/** Thème d'un lieu de vente : celui de l'enseigne, sinon l'univers « marché frais », sinon l'ADN Panier 241. */
export function resolveMarketTheme(market: Market | undefined): ThemeTokens {
  if (!market) return baseTheme
  return marketThemes[market.id] ?? (market.kind === 'marche' ? freshMarketTheme : baseTheme)
}

/** Thème de la vitrine d'un commerçant : celui de son enseigne, sinon déduit de ce qu'il vend. */
export function resolveMerchantTheme(merchant: Merchant, market: Market | undefined): ThemeTokens {
  if (market && marketThemes[market.id]) return marketThemes[market.id]
  return merchant.categories.some((c) => freshCategories.includes(c)) ? freshMarketTheme : baseTheme
}

function toRgbChannels(hex: string): string {
  const value = hex.replace('#', '')
  return [0, 2, 4].map((i) => Number.parseInt(value.slice(i, i + 2), 16)).join(' ')
}

/** Variables CSS d'un thème, à poser sur `:root` (thème global) ou sur un conteneur (vitrine d'un commerce). */
export function themeToCssVars(theme: ThemeTokens): CSSProperties {
  return Object.fromEntries(
    (Object.keys(theme) as (keyof ThemeTokens)[]).map((token) => [`--color-${token}`, toRgbChannels(theme[token])]),
  ) as CSSProperties
}

/** Applique le thème global et les couleurs de catégorie sur la racine du document. */
export function applyBaseTheme(root: HTMLElement) {
  for (const [name, value] of Object.entries(themeToCssVars(baseTheme))) root.style.setProperty(name, String(value))
  for (const [id, hex] of Object.entries(categoryColors)) root.style.setProperty(`--color-cat-${id}`, toRgbChannels(hex))
}
