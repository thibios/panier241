import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Search, ReceiptText, User } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useOrders } from '../../context/OrdersContext'
import CartIcon from '../ui/CartIcon'
import CartBadge from '../ui/CartBadge'
import { CART_ADDED_EVENT } from '../../lib/flyToCart'

const tabs = [
  { to: '/', label: 'Accueil', icon: Home, end: true },
  { to: '/recherche', label: 'Recherche', icon: Search, end: false },
  { to: '/panier', label: 'Panier', icon: null, end: false },
  { to: '/commandes', label: 'Commandes', icon: ReceiptText, end: false },
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
      className={`fixed inset-x-0 bottom-0 z-30 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] transition-transform duration-300 ease-out ${
        hidden ? 'translate-y-full' : 'translate-y-0'
      }`}
    >
      <ul className="mx-auto flex h-16 max-w-md items-center justify-around rounded-full border border-line bg-card/85 px-2 shadow-float backdrop-blur-md">
        {tabs.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-full py-1 transition-colors duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  isActive ? 'text-brand' : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative leading-none">
                    {tab.icon ? (
                      <tab.icon className="h-6 w-6" strokeWidth={isActive ? 2.4 : 1.8} aria-hidden="true" />
                    ) : (
                      <CartIcon className="h-6 w-6" filled={isActive} />
                    )}
                    {tab.to === '/panier' && <CartBadge count={itemCount} label="articles dans le panier" />}
                    {tab.to === '/commandes' && <CartBadge count={unseenCount} label="commandes mises à jour" />}
                  </span>
                  <span className="text-[10px] font-semibold">{tab.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
