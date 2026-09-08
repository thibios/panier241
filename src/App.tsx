import { BrowserRouter, Routes, Route } from 'react-router-dom'
import BottomNav from './components/layout/BottomNav'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CatalogProvider } from './context/CatalogContext'
import { CartProvider } from './context/CartContext'
import { OrdersProvider } from './context/OrdersContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { AddressesProvider } from './context/AddressesContext'
import AuthPage from './pages/Auth'
import Home from './pages/Home'
import MerchantDetail from './pages/MerchantDetail'
import DeliverySlot from './pages/DeliverySlot'
import Cart from './pages/Cart'
import Orders from './pages/Orders'
import Profile from './pages/Profile'
import BecomeMerchant from './pages/BecomeMerchant'
import MerchantSpace from './pages/MerchantSpace'

function AuthenticatedApp() {
  return (
    <CatalogProvider>
      <FavoritesProvider>
        <AddressesProvider>
          <CartProvider>
            <OrdersProvider>
              <BrowserRouter>
                <div className="min-h-screen bg-surface">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/marchand/:merchantId" element={<MerchantDetail />} />
                    <Route path="/creneau" element={<DeliverySlot />} />
                    <Route path="/panier" element={<Cart />} />
                    <Route path="/commandes" element={<Orders />} />
                    <Route path="/profil" element={<Profile />} />
                    <Route path="/devenir-marchand" element={<BecomeMerchant />} />
                    <Route path="/marchand-espace" element={<MerchantSpace />} />
                  </Routes>
                  <BottomNav />
                </div>
              </BrowserRouter>
            </OrdersProvider>
          </CartProvider>
        </AddressesProvider>
      </FavoritesProvider>
    </CatalogProvider>
  )
}

function Gate() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-sm text-brand-dark/50">Chargement...</p>
      </div>
    )
  }

  return session ? <AuthenticatedApp /> : <AuthPage />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
