import { NavLink } from 'react-router-dom'
import { useCart } from '../../context/CartContext'

const tabs = [
  { to: '/', label: 'Accueil', icon: '🏠', end: true },
  { to: '/commandes', label: 'Commandes', icon: '📦', end: false },
  { to: '/panier', label: 'Panier', icon: '🧺', end: false },
  { to: '/profil', label: 'Profil', icon: '👤', end: false },
]

export default function BottomNav() {
  const { itemCount } = useCart()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-light bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {tabs.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                  isActive ? 'text-brand' : 'text-brand-dark/50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative text-xl leading-none">
                    {tab.icon}
                    {tab.to === '/panier' && itemCount > 0 && (
                      <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-category-poisson px-1 text-[10px] font-bold text-white">
                        {itemCount}
                      </span>
                    )}
                  </span>
                  <span>{tab.label}</span>
                  {isActive && <span className="absolute -top-0.5 h-1 w-6 rounded-full bg-brand" />}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
