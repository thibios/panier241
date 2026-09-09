import { BrowserRouter, Routes, Route } from 'react-router-dom'
import BottomNav from './components/layout/BottomNav'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CatalogProvider } from './context/CatalogContext'
import { CartProvider } from './context/CartContext'
import { OrdersProvider } from './context/OrdersContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { AddressesProvider } from './context/AddressesContext'
import { PexelsProvider } from './context/PexelsContext'
import AuthPage from './pages/Auth'
import Home from './pages/Home'
import MarketDetail from './pages/MarketDetail'
import MerchantDetail from './pages/MerchantDetail'
import DeliverySlot from './pages/DeliverySlot'
import Cart from './pages/Cart'
import Orders from './pages/Orders'
import Profile from './pages/Profile'
import BecomeMerchant from './pages/BecomeMerchant'
import MerchantSpace from './pages/MerchantSpace'
import BecomeCourier from './pages/BecomeCourier'
import CourierSpace from './pages/CourierSpace'
import AdminSpace from './pages/AdminSpace'
import Help from './pages/Help'
import Contact from './pages/Contact'

function AuthenticatedApp() {
  return (
    <PexelsProvider>
      <CatalogProvider>
        <FavoritesProvider>
          <AddressesProvider>
            <CartProvider>
              <OrdersProvider>
                <BrowserRouter>
                  <div className="min-h-screen bg-surface">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/marche/:marketId" element={<MarketDetail />} />
                      <Route path="/marchand/:merchantId" element={<MerchantDetail />} />
                      <Route path="/creneau" element={<DeliverySlot />} />
                      <Route path="/panier" element={<Cart />} />
                      <Route path="/commandes" element={<Orders />} />
                      <Route path="/profil" element={<Profile />} />
                      <Route path="/devenir-marchand" element={<BecomeMerchant />} />
                      <Route path="/marchand-espace" element={<MerchantSpace />} />
                      <Route path="/devenir-livreur" element={<BecomeCourier />} />
                      <Route path="/livreur-espace" element={<CourierSpace />} />
                      <Route path="/admin" element={<AdminSpace />} />
                      <Route path="/aide" element={<Help />} />
                      <Route path="/contact" element={<Contact />} />
                    </Routes>
                    <BottomNav />
                  </div>
                </BrowserRouter>
              </OrdersProvider>
            </CartProvider>
          </AddressesProvider>
        </FavoritesProvider>
      </CatalogProvider>
    </PexelsProvider>
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
