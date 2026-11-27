import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CartProvider } from '@/contexts/CartContext'
import { WishlistProvider } from '@/contexts/WishlistContext'
import AdminLayout from '@/components/admin/AdminLayout'
import { AdminRoute } from '@/components/layout/AdminRoute'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import AdminMembersPage from '@/pages/admin/AdminMembersPage'
import AdminOrderLookupPage from '@/pages/admin/AdminOrderLookupPage'
import AdminOrdersPage from '@/pages/admin/AdminOrdersPage'
import AdminProductsPage from '@/pages/admin/AdminProductsPage'
import AdminShippingPage from '@/pages/admin/AdminShippingPage'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import ProductDetailPage from '@/pages/ProductDetailPage'
import ShopCategoryPage from '@/pages/ShopCategoryPage'
import BagPage from '@/pages/BagPage'
import WishlistPage from '@/pages/WishlistPage'
import CheckoutPage from '@/pages/CheckoutPage'
import MyOrdersPage from '@/pages/MyOrdersPage'
import SignUpPage from '@/pages/SignUpPage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <CartProvider>
      <WishlistProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop/:category" element={<ShopCategoryPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/bag" element={<BagPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders" element={<MyOrdersPage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="shipping" element={<AdminShippingPage />} />
          <Route path="order-lookup" element={<AdminOrderLookupPage />} />
          <Route path="members" element={<AdminMembersPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
      </Routes>
      </WishlistProvider>
      </CartProvider>
    </BrowserRouter>
  )
}

export default App