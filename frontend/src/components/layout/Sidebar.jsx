import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, Tags, Users, ShoppingCart, ArrowLeftRight, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/',               label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/products',       label: 'Products',         icon: Package },
  { to: '/categories',     label: 'Categories',       icon: Tags },
  { to: '/clients',        label: 'Clients',          icon: Users },
  { to: '/orders',         label: 'Orders',           icon: ShoppingCart },
  { to: '/stock',          label: 'Stock Movements',  icon: ArrowLeftRight },
]

export default function Sidebar({ user, onLogout }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }

  return (
    <aside className="w-64 shrink-0 border-r bg-card flex flex-col h-screen sticky top-0">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight">StockFlow</h1>
        <p className="text-xs text-muted-foreground mt-1">Mini ERP</p>
      </div>

      <Separator />

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <Separator />

      <div className="p-4">
        <div className="mb-3 px-1">
          <p className="text-sm font-medium truncate">{user?.fullName}</p>
          <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleLogout}>
          <LogOut size={14} />
          Logout
        </Button>
      </div>
    </aside>
  )
}
