import { useEffect, useState } from 'react'
import { Package, Users, ShoppingCart, DollarSign, TrendingUp } from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

function StatCard({ title, value, icon: Icon, loading }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription className="text-sm font-medium">{title}</CardDescription>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading
          ? <Skeleton className="h-9 w-28" />
          : <p className="text-3xl font-bold tabular-nums">{value}</p>
        }
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/dashboard')
      .then(r => setStats(r.data))
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false))
  }, [])

  const fmt = (n) => Number(n).toLocaleString()
  const fmtCurrency = (n) => '$' + Number(n).toLocaleString('en', { minimumFractionDigits: 2 })

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your store.</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <section>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
          Store overview
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Products" value={fmt(stats?.total_products ?? 0)} icon={Package} loading={loading} />
          <StatCard title="Total Clients"  value={fmt(stats?.total_clients  ?? 0)} icon={Users}   loading={loading} />
          <StatCard title="Orders Today"   value={fmt(stats?.orders_today   ?? 0)} icon={ShoppingCart} loading={loading} />
          <StatCard title="Total Revenue"  value={fmtCurrency(stats?.total_revenue ?? 0)} icon={DollarSign} loading={loading} />
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="size-4 text-muted-foreground" />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Top 5 best-selling products
          </p>
        </div>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Qty Sold</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                : stats?.top_products?.length
                  ? stats.top_products.map((p, i) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">{p.sku}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(p.total_sold)}</TableCell>
                      </TableRow>
                    ))
                  : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No sales data yet.
                        </TableCell>
                      </TableRow>
                    )
              }
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  )
}
