import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Package, User, Home } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useOrders } from '../../context/OrdersContext'
import CartIcon from '../ui/CartIcon'
import CartBadge from '../ui/CartBadge'
import { CART_ADDED_EVENT } from '../../lib/flyToCart'

const tabs = [
  { to: '/', label: 'Accueil', icon: Home, end: true },
  { to: '/commandes', label: 'Commandes', icon: Package, end: false },
  { to: '/panier', label: 'Panier', icon: null, end: false },
  { to: '/profil', label: 'Profil', icon: User, end: false },
] as const

export default function BottomNav() {
  const { itemCount } = useCart()
  const { unseenCount } = useOrders()
  const [hidden, setHidden] = useState(false)

  // La barre s'efface quand on descend dans la page et revient dès qu'on remonte,
  // ou dès qu'un produit est ajouté au panier.
  useEffect(() => {
    let lastY = window.scrollY
    function onScroll() {
      const y = window.scrollY
      if (Math.abs(y - lastY) < 8) return
      setHidden(y > lastY && y > 80)
      lastY = y
    }
    const show = () => setHidden(false)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener(CART_ADDED_EVENT, show)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener(CART_ADDED_EVENT, show)
    }
  }, [])

  return (
    <nav
      aria-label="Navigation principale"
      className={`fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] transition-transform duration-300 ease-out ${
        hidden ? 'translate-y-full' : 'translate-y-0'
      }`}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between rounded-[1.75rem] bg-white/95 px-2 shadow-card backdrop-blur">
        {tabs.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `relative flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-all duration-300 ease-spring active:scale-95 ${
                  isActive ? '-translate-y-0.5 text-brand' : 'text-brand-dark/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden="true"
                    className={`absolute top-0.5 h-1 rounded-full bg-accent transition-all duration-300 ease-spring ${
                      isActive ? 'w-6 opacity-100' : 'w-0 opacity-0'
                    }`}
                  />
                  <span className="relative leading-none">
                    {tab.icon ? (
                      <tab.icon className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <CartIcon className="h-6 w-6" filled={isActive} />
                    )}
                    {tab.to === '/panier' && <CartBadge count={itemCount} label="articles dans le panier" />}
                    {tab.to === '/commandes' && <CartBadge count={unseenCount} label="commandes mises à jour" />}
                  </span>
                  <span>{tab.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
