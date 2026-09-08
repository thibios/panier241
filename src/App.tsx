import { BrowserRouter, Routes, Route } from 'react-router-dom'
import BottomNav from './components/layout/BottomNav'
import { CartProvider } from './context/CartContext'
import { OrdersProvider } from './context/OrdersContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { AddressesProvider } from './context/AddressesContext'
import Home from './pages/Home'
import MerchantDetail from './pages/MerchantDetail'
import DeliverySlot from './pages/DeliverySlot'
import Cart from './pages/Cart'
import Orders from './pages/Orders'
import Profile from './pages/Profile'

export default function App() {
  return (
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
                </Routes>
                <BottomNav />
              </div>
            </BrowserRouter>
          </OrdersProvider>
        </CartProvider>
      </AddressesProvider>
    </FavoritesProvider>
  )
}
