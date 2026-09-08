import type { ReactNode } from 'react'

interface WovenHeaderProps {
  children: ReactNode
  className?: string
}

/**
 * En-tête bleu de marque avec le motif tressé signature (vannerie de panier)
 * en filigrane, obtenu en CSS (voir .woven-pattern dans index.css) — jamais une image en dur.
 */
export default function WovenHeader({ children, className = '' }: WovenHeaderProps) {
  return (
    <header className={`woven-pattern relative overflow-hidden bg-brand px-5 pb-6 pt-[calc(env(safe-area-inset-top)+1.25rem)] text-white ${className}`}>
      {children}
    </header>
  )
}
