import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import AppLayout from '@/components/layout/AppLayout'

import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import ProductsPage from '@/pages/ProductsPage'
import CategoriesPage from '@/pages/CategoriesPage'
import ClientsPage from '@/pages/ClientsPage'
import OrdersPage from '@/pages/OrdersPage'
import StockPage from '@/pages/StockPage'

export default function App() {
  const { user, login, logout } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to="/" replace /> : <LoginPage onLogin={login} />
      } />
      <Route element={<AppLayout user={user} onLogout={logout} />}>
        <Route path="/"           element={<DashboardPage />} />
        <Route path="/products"   element={<ProductsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/clients"    element={<ClientsPage />} />
        <Route path="/orders"     element={<OrdersPage />} />
        <Route path="/stock"      element={<StockPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
