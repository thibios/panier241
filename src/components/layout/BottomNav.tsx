import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useOrders } from '../../context/OrdersContext'
import { ShoppingBasket, Package, User, Home } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Accueil', icon: Home, end: true },
  { to: '/commandes', label: 'Commandes', icon: Package, end: false },
  { to: '/panier', label: 'Panier', icon: ShoppingBasket, end: false },
  { to: '/profil', label: 'Profil', icon: User, end: false },
]

export default function BottomNav() {
  const { itemCount } = useCart()
  const { unseenCount } = useOrders()
  const [hidden, setHidden] = useState(false)

  // La barre s'efface quand on descend dans la page et revient dès qu'on remonte.
  useEffect(() => {
    let lastY = window.scrollY
    function onScroll() {
      const y = window.scrollY
      if (Math.abs(y - lastY) < 8) return
      setHidden(y > lastY && y > 80)
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const badgeCount: Record<string, number> = {
    '/panier': itemCount,
    '/commandes': unseenCount,
  }

  return (
    <nav
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
                `relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-all duration-200 ${
                  isActive ? '-translate-y-0.5 text-brand' : 'text-brand-dark/50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute top-0.5 h-1 rounded-full bg-brand transition-all duration-300 ${
                      isActive ? 'w-6 opacity-100' : 'w-0 opacity-0'
                    }`}
                  />
                  <span className="relative leading-none">
                    <tab.icon className="h-5 w-5" />
                    {badgeCount[tab.to] > 0 && (
                      <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-category-poisson px-1 text-[10px] font-bold text-white">
                        {badgeCount[tab.to]}
                      </span>
                    )}
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
