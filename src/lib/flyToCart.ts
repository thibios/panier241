/** Émis dès qu'un produit est ajouté : la barre de navigation se ré-affiche. */
export const CART_ADDED_EVENT = 'panier241:cart-added'
/** Émis quand le produit « arrive » dans le panier : l'icône rebondit. */
export const CART_BUMP_EVENT = 'panier241:cart-bump'

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Fait voler une copie de la vignette du produit vers l'icône panier, puis
 * déclenche le micro-rebond de l'icône. Sans animation si l'utilisateur a
 * demandé moins de mouvement ou si la vignette est introuvable.
 */
export function flyToCart(source: Element | null | undefined) {
  window.dispatchEvent(new CustomEvent(CART_ADDED_EVENT))
  const bump = () => window.dispatchEvent(new CustomEvent(CART_BUMP_EVENT))

  const target = document.querySelector('[data-cart-target]')
  if (!source || !target || prefersReducedMotion() || typeof source.animate !== 'function') {
    bump()
    return
  }

  const from = source.getBoundingClientRect()
  const to = target.getBoundingClientRect()
  const clone = source.cloneNode(true) as HTMLElement
  Object.assign(clone.style, {
    position: 'fixed',
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: '0',
    zIndex: '60',
    pointerEvents: 'none',
  })
  document.body.appendChild(clone)

  const dx = to.left + to.width / 2 - (from.left + from.width / 2)
  // La barre peut être en train de remonter : on vise sa position finale, en bas de l'écran.
  const dy = Math.min(to.top, window.innerHeight - 56) + to.height / 2 - (from.top + from.height / 2)

  const animation = clone.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.35 - 36}px) scale(0.7)`, opacity: 0.95, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.2)`, opacity: 0.35 },
    ],
    { duration: 560, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  )
  const finish = () => {
    clone.remove()
    bump()
  }
  animation.onfinish = finish
  animation.oncancel = finish
}
