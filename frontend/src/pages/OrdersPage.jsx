import { useEffect, useState, useCallback } from 'react'
import { Plus, Eye, Trash2, ShoppingCart, X } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ── helpers ─────────────────────────────────────────────────────────────────

const STATUS_META = {
  draft:     { label: 'Draft',     variant: 'secondary' },
  confirmed: { label: 'Confirmed', variant: 'default'   },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  delivered: { label: 'Delivered', variant: 'outline'   },
}

const TRANSITIONS = {
  draft:     ['confirmed', 'cancelled'],
  confirmed: ['delivered', 'cancelled'],
  cancelled: [],
  delivered: [],
}

const TRANSITION_LABELS = {
  confirmed: 'Confirm',
  cancelled: 'Cancel order',
  delivered: 'Mark delivered',
}

const TRANSITION_VARIANTS = {
  confirmed: 'default',
  cancelled: 'destructive',
  delivered: 'outline',
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? { label: status, variant: 'secondary' }
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}

const fmtCurrency = (n) => '$' + Number(n).toFixed(2)
const fmtDate = (d) => new Date(d).toLocaleDateString('en', { dateStyle: 'medium' })

// ── New Order Sheet ──────────────────────────────────────────────────────────

function NewOrderSheet({ open, onOpenChange, onCreated }) {
  const [clients, setClients]     = useState([])
  const [clientId, setClientId]   = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    if (open) {
      setClientId('')
      setError('')
      api.get('/clients').then(r => setClients(r.data))
    }
  }, [open])

  const handleCreate = async () => {
    if (!clientId) { setError('Please select a client.'); return }
    setSaving(true)
    setError('')
    try {
      const { data } = await api.post('/orders', { clientId: parseInt(clientId) })
      toast.success('Order created.')
      onOpenChange(false)
      onCreated(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={v => { if (!saving) onOpenChange(v) }}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>New order</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-5 px-4 py-6">
          <div className="flex flex-col gap-2">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.full_name} — {c.phone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <SheetFooter className="px-4 pb-6 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="flex-1">Cancel</Button>
          <Button onClick={handleCreate} disabled={saving} className="flex-1">
            {saving ? 'Creating…' : 'Create draft'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ── Order Detail Sheet ───────────────────────────────────────────────────────

function OrderDetailSheet({ orderId, open, onOpenChange, onChanged }) {
  const [order, setOrder]         = useState(null)
  const [loading, setLoading]     = useState(false)
  const [products, setProducts]   = useState([])
  const [itemForm, setItemForm]   = useState({ productId: '', quantity: '1', unitPrice: '' })
  const [itemError, setItemError] = useState('')
  const [addingItem, setAddingItem]     = useState(false)
  const [removingItem, setRemovingItem] = useState(null)
  const [transitioning, setTransitioning] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null) // { status, label }

  const fetchOrder = useCallback(() => {
    if (!orderId) return
    setLoading(true)
    api.get(`/orders/${orderId}`)
      .then(r => setOrder(r.data))
      .catch(() => toast.error('Failed to load order.'))
      .finally(() => setLoading(false))
  }, [orderId])

  useEffect(() => {
    if (open && orderId) {
      fetchOrder()
      api.get('/products', { params: { limit: 100 } }).then(r => setProducts(r.data.data))
    }
  }, [open, orderId])

  // auto-fill unit price when product is selected
  const handleProductChange = (pid) => {
    const p = products.find(p => String(p.id) === pid)
    setItemForm(f => ({ ...f, productId: pid, unitPrice: p ? String(p.price) : '' }))
  }

  const handleAddItem = async () => {
    if (!itemForm.productId) { setItemError('Select a product.'); return }
    if (!itemForm.quantity || parseInt(itemForm.quantity) < 1) { setItemError('Quantity must be at least 1.'); return }
    if (!itemForm.unitPrice) { setItemError('Unit price is required.'); return }
    setAddingItem(true)
    setItemError('')
    try {
      await api.post(`/orders/${orderId}/items`, {
        productId: parseInt(itemForm.productId),
        quantity:  parseInt(itemForm.quantity),
        unitPrice: parseFloat(itemForm.unitPrice),
      })
      setItemForm({ productId: '', quantity: '1', unitPrice: '' })
      fetchOrder()
    } catch (err) {
      setItemError(err.response?.data?.error || 'Failed to add item.')
    } finally {
      setAddingItem(false)
    }
  }

  const handleRemoveItem = async (itemId) => {
    setRemovingItem(itemId)
    try {
      await api.delete(`/orders/${orderId}/items/${itemId}`)
      fetchOrder()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove item.')
    } finally {
      setRemovingItem(null)
    }
  }

  const handleTransition = async () => {
    if (!confirmAction) return
    setTransitioning(true)
    try {
      await api.patch(`/orders/${orderId}/status`, { status: confirmAction.status })
      toast.success(`Order ${confirmAction.status}.`)
      setConfirmAction(null)
      fetchOrder()
      onChanged()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status.')
    } finally {
      setTransitioning(false)
    }
  }

  const isDraft = order?.status === 'draft'
  const actions = TRANSITIONS[order?.status] ?? []

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle>
              Order #{orderId}
              {order && <StatusBadge status={order.status} />}
            </SheetTitle>
          </SheetHeader>

          {loading || !order
            ? (
              <div className="px-4 py-6 flex flex-col gap-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
              </div>
            )
            : (
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6">
                {/* Meta */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{order.client_name}</span>
                  <span className="text-muted-foreground">Created by</span>
                  <span>{order.created_by_name}</span>
                  <span className="text-muted-foreground">Date</span>
                  <span>{fmtDate(order.created_at)}</span>
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-base">{fmtCurrency(order.total_amount)}</span>
                </div>

                <Separator />

                {/* Items */}
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium">Items ({order.items?.length ?? 0})</p>
                  {order.items?.length === 0
                    ? <p className="text-sm text-muted-foreground">No items yet.</p>
                    : (
                      <div className="rounded-md border divide-y text-sm">
                        {order.items.map(item => (
                          <div key={item.id} className="flex items-center justify-between px-3 py-2 gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{item.product_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="tabular-nums">{item.quantity} × {fmtCurrency(item.unit_price)}</p>
                              <p className="text-xs font-medium text-primary tabular-nums">{fmtCurrency(item.subtotal)}</p>
                            </div>
                            {isDraft && (
                              <Button
                                variant="ghost" size="icon"
                                className="text-destructive hover:text-destructive shrink-0 size-7"
                                disabled={removingItem === item.id}
                                onClick={() => handleRemoveItem(item.id)}
                              >
                                <X className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  }

                  {/* Add item form — draft only */}
                  {isDraft && (
                    <div className="rounded-md border p-3 flex flex-col gap-3 bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Add item</p>
                      <Select value={itemForm.productId} onValueChange={handleProductChange}>
                        <SelectTrigger><SelectValue placeholder="Select a product" /></SelectTrigger>
                        <SelectContent>
                          {products.map(p => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.name} <span className="text-muted-foreground">({p.stock_quantity} in stock)</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs">Quantity</Label>
                          <Input type="number" min="1" value={itemForm.quantity}
                            onChange={e => setItemForm(f => ({ ...f, quantity: e.target.value }))} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs">Unit price ($)</Label>
                          <Input type="number" min="0" step="0.01" value={itemForm.unitPrice}
                            onChange={e => setItemForm(f => ({ ...f, unitPrice: e.target.value }))} />
                        </div>
                      </div>
                      {itemError && <p className="text-xs text-destructive">{itemError}</p>}
                      <Button size="sm" onClick={handleAddItem} disabled={addingItem}>
                        {addingItem ? 'Adding…' : 'Add item'}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Status transitions */}
                {actions.length > 0 && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-medium">Actions</p>
                      <div className="flex gap-2 flex-wrap">
                        {actions.map(status => (
                          <Button
                            key={status}
                            variant={TRANSITION_VARIANTS[status]}
                            size="sm"
                            onClick={() => setConfirmAction({ status, label: TRANSITION_LABELS[status] })}
                          >
                            {TRANSITION_LABELS[status]}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          }
        </SheetContent>
      </Sheet>

      {/* Confirm transition */}
      <AlertDialog open={!!confirmAction} onOpenChange={open => { if (!open && !transitioning) setConfirmAction(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.status === 'confirmed' &&
                'This will lock the order items and decrement stock for each product. Make sure stock is sufficient.'}
              {confirmAction?.status === 'cancelled' &&
                'This will cancel the order. If already confirmed, stock will be restored.'}
              {confirmAction?.status === 'delivered' &&
                'Mark this order as delivered. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={transitioning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransition}
              disabled={transitioning}
              className={confirmAction?.status === 'cancelled' ? 'bg-destructive text-white hover:bg-destructive/90' : ''}
            >
              {transitioning ? 'Processing…' : confirmAction?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [orders, setOrders]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter]     = useState('')

  const [newOrderOpen, setNewOrderOpen]   = useState(false)
  const [detailOrderId, setDetailOrderId] = useState(null)

  const fetchOrders = useCallback(() => {
    setLoading(true)
    const params = {}
    if (statusFilter !== 'all') params.status = statusFilter
    if (dateFilter) params.date = dateFilter
    api.get('/orders', { params })
      .then(r => setOrders(r.data))
      .catch(() => toast.error('Failed to load orders.'))
      .finally(() => setLoading(false))
  }, [statusFilter, dateFilter])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleOrderCreated = (order) => {
    fetchOrders()
    setDetailOrderId(order.id)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {loading ? '—' : `${orders.length} order${orders.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={() => setNewOrderOpen(true)}>
          <Plus className="size-4" /> New order
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_META).map(([val, meta]) => (
              <SelectItem key={val} value={val}>{meta.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          className="w-44"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
        />
        {(statusFilter !== 'all' || dateFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter('all'); setDateFilter('') }}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">#</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created by</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : orders.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                        <div className="flex flex-col items-center gap-2">
                          <ShoppingCart className="size-8 opacity-30" />
                          No orders found.
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                : orders.map(o => (
                    <TableRow
                      key={o.id}
                      className="cursor-pointer"
                      onClick={() => setDetailOrderId(o.id)}
                    >
                      <TableCell className="font-mono text-muted-foreground">#{o.id}</TableCell>
                      <TableCell className="font-medium">{o.client_name}</TableCell>
                      <TableCell><StatusBadge status={o.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.created_by_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(o.created_at)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{fmtCurrency(o.total_amount)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setDetailOrderId(o.id) }}>
                          <Eye className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
            }
          </TableBody>
        </Table>
      </div>

      {/* New order sheet */}
      <NewOrderSheet
        open={newOrderOpen}
        onOpenChange={setNewOrderOpen}
        onCreated={handleOrderCreated}
      />

      {/* Order detail sheet */}
      <OrderDetailSheet
        orderId={detailOrderId}
        open={!!detailOrderId}
        onOpenChange={open => { if (!open) setDetailOrderId(null) }}
        onChanged={fetchOrders}
      />
    </div>
  )
}
