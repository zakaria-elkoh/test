import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Tags, Users, ShoppingCart,
  ArrowLeftRight, LogOut,
} from 'lucide-react'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

const adminNavItems = [
  { to: '/',           label: 'Dashboard',      icon: LayoutDashboard, end: true },
  { to: '/products',   label: 'Products',        icon: Package },
  { to: '/categories', label: 'Categories',      icon: Tags },
  { to: '/clients',    label: 'Clients',         icon: Users },
  { to: '/orders',     label: 'Orders',          icon: ShoppingCart },
  { to: '/stock',      label: 'Stock Movements', icon: ArrowLeftRight },
]

const staffNavItems = [
  { to: '/orders', label: 'Orders',          icon: ShoppingCart },
  { to: '/stock',  label: 'Stock Movements', icon: ArrowLeftRight },
]

export function AppSidebar({ user, onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [showLogout, setShowLogout] = useState(false)
  const navItems = user?.role === 'admin' ? adminNavItems : staffNavItems

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="py-4!"
                render={<NavLink to="/" />}
              >
                <span className="text-base font-bold text-primary">StockFlow</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {navItems.map(({ to, label, icon: Icon, end }) => {
                  const isActive = end
                    ? location.pathname === to
                    : location.pathname.startsWith(to)
                  return (
                    <SidebarMenuItem key={to}>
                      <SidebarMenuButton
                        isActive={isActive}
                        render={<NavLink to={to} end={end} />}
                      >
                        <Icon className="size-4" />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-3 px-2 py-2">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.fullName}</p>
                  <p className="text-xs text-muted-foreground truncate capitalize">{user?.role}</p>
                </div>
                <button
                  onClick={() => setShowLogout(true)}
                  className="cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
                  title="Logout"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <Dialog open={showLogout} onOpenChange={setShowLogout}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
            <DialogDescription className="sr-only">Logout confirmation</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowLogout(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleLogout}>
              Sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
