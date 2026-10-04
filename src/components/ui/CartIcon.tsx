import { useEffect, useRef } from 'react'
import { CART_BUMP_EVENT } from '../../lib/flyToCart'

/**
 * Icône propriétaire Le Panier 241 : panier à anse avec un détail de tressage.
 * Monochrome (`currentColor`), donc recolorable par le thème. `filled` remplit
 * légèrement le corps du panier pour l'état actif.
 */
export function PanierMark({ className, filled = false }: { className?: string; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* anse */}
      <path d="M7.2 10.4C7.2 5.2 16.8 5.2 16.8 10.4" />
      {/* bord */}
      <rect x="3" y="10.2" width="18" height="2.8" rx="1.4" />
      {/* corps */}
      <path
        d="M4.7 13l1.5 6.3a2.2 2.2 0 0 0 2.1 1.7h7.4a2.2 2.2 0 0 0 2.1-1.7L19.3 13"
        fill={filled ? 'currentColor' : 'none'}
        fillOpacity={filled ? 0.16 : undefined}
      />
      {/* tressage */}
      <path d="M9.3 13.2l.6 7.6M12 13.2v7.6M14.7 13.2l-.6 7.6M5.6 17h12.8" strokeWidth="1.1" opacity="0.75" />
    </svg>
  )
}

/** Icône panier de la navigation : cible du « vol » des produits, avec micro-rebond à l'arrivée. */
export default function CartIcon({ className, filled }: { className?: string; filled?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    function bump() {
      const el = ref.current
      if (!el) return
      el.classList.remove('cart-bounce')
      // Relance l'animation même si deux ajouts se suivent de près.
      void el.offsetWidth
      el.classList.add('cart-bounce')
    }
    window.addEventListener(CART_BUMP_EVENT, bump)
    return () => window.removeEventListener(CART_BUMP_EVENT, bump)
  }, [])

  return (
    <span ref={ref} data-cart-target className="inline-flex">
      <PanierMark className={className} filled={filled} />
    </span>
  )
}
