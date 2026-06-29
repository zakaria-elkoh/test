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

function AdminOnly({ user, children }) {
  if (!user) return null
  return user.role === 'admin' ? children : <Navigate to="/orders" replace />
}

export default function App() {
  const { user, login, logout } = useAuth()

  const home = user?.role === 'admin' ? '/' : '/orders'

  return (
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to={home} replace /> : <LoginPage onLogin={login} />
      } />
      <Route element={<AppLayout user={user} onLogout={logout} />}>
        <Route path="/" element={
          <AdminOnly user={user}><DashboardPage /></AdminOnly>
        } />
        <Route path="/products" element={
          <AdminOnly user={user}><ProductsPage /></AdminOnly>
        } />
        <Route path="/categories" element={
          <AdminOnly user={user}><CategoriesPage /></AdminOnly>
        } />
        <Route path="/clients" element={
          <AdminOnly user={user}><ClientsPage /></AdminOnly>
        } />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/stock"  element={<StockPage />} />
      </Route>
      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  )
}
