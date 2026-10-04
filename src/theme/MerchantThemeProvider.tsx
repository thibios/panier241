import type { ReactNode } from 'react'
import { themeToCssVars, type ThemeTokens } from './tokens'

/**
 * Applique l'univers visuel d'un commerce à sa vitrine uniquement : les
 * variables CSS du thème sont posées sur ce conteneur, donc tous les
 * composants à l'intérieur (boutons, badges, en-tête...) se recolorent, tandis
 * que l'enveloppe de l'app (navigation) garde l'ADN Le Panier 241.
 * L'entrée se fait en fondu (classe `theme-scope`, 380 ms).
 */
export default function MerchantThemeProvider({ theme, children }: { theme: ThemeTokens; children: ReactNode }) {
  return (
    <div className="theme-scope min-h-screen bg-surface text-brand-dark" style={themeToCssVars(theme)}>
      {children}
    </div>
  )
}
