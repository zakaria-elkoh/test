import { useEffect, useState, useCallback } from 'react'
import { Plus, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const EMPTY = { productId: '', type: '', quantity: '1', reason: '' }

const TYPE_META = {
  IN:  { label: 'IN',  icon: ArrowDownCircle, className: 'text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30' },
  OUT: { label: 'OUT', icon: ArrowUpCircle,   className: 'text-red-600   border-red-200   bg-red-50   dark:bg-red-950/30'   },
}

function TypeBadge({ type }) {
  const meta = TYPE_META[type]
  if (!meta) return null
  const Icon = meta.icon
  return (
    <Badge variant="outline" className={`gap-1 ${meta.className}`}>
      <Icon className="size-3" />
      {meta.label}
    </Badge>
  )
}

const fmtDate = (d) => new Date(d).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })

export default function StockPage() {
  const [movements, setMovements]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [products, setProducts]     = useState([])
  const [productFilter, setProductFilter] = useState('all')

  // sheet
  const [sheetOpen, setSheetOpen]   = useState(false)
  const [form, setForm]             = useState(EMPTY)
  const [formError, setFormError]   = useState('')
  const [saving, setSaving]         = useState(false)

  const fetchMovements = useCallback(() => {
    setLoading(true)
    const params = productFilter !== 'all' ? { productId: productFilter } : {}
    api.get('/stock-movements', { params })
      .then(r => setMovements(r.data))
      .catch(() => toast.error('Failed to load stock movements.'))
      .finally(() => setLoading(false))
  }, [productFilter])

  useEffect(() => { fetchMovements() }, [fetchMovements])

  useEffect(() => {
    api.get('/products', { params: { limit: 100 } })
      .then(r => setProducts(r.data.data))
  }, [])

  const openSheet = () => {
    setForm(EMPTY)
    setFormError('')
    setSheetOpen(true)
  }

  // auto-fill product filter when product selected in form
  const handleProductChange = (pid) => {
    setForm(f => ({ ...f, productId: pid }))
  }

  const handleSave = async () => {
    if (!form.productId) { setFormError('Select a product.');      return }
    if (!form.type)       { setFormError('Select a type (IN/OUT).'); return }
    if (!form.quantity || parseInt(form.quantity) < 1) {
      setFormError('Quantity must be at least 1.')
      return
    }

    setSaving(true)
    setFormError('')
    try {
      await api.post('/stock-movements', {
        productId: parseInt(form.productId),
        type:      form.type,
        quantity:  parseInt(form.quantity),
        reason:    form.reason.trim() || undefined,
      })
      toast.success(`Stock ${form.type} recorded.`)
      setSheetOpen(false)
      fetchMovements()
    } catch (err) {
      setFormError(err.response?.data?.error || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const selectedProduct = products.find(p => String(p.id) === form.productId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Movements</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {loading ? '—' : `${movements.length} movement${movements.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={openSheet}>
          <Plus className="size-4" /> Add movement
        </Button>
      </div>

      {/* Product filter */}
      <div className="flex gap-3 items-center">
        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All products" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All products</SelectItem>
            {products.map(p => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name} <span className="text-muted-foreground font-mono text-xs">({p.sku})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {productFilter !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setProductFilter('all')}>
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>By</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : movements.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                        <div className="flex flex-col items-center gap-2">
                          <ArrowLeftRight className="size-8 opacity-30" />
                          No stock movements yet.
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                : movements.map(m => (
                    <TableRow key={m.id}>
                      <TableCell><TypeBadge type={m.type} /></TableCell>
                      <TableCell className="font-medium">{m.product_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">{m.sku}</Badge>
                      </TableCell>
                      <TableCell className={`text-right tabular-nums font-semibold ${m.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                        {m.type === 'IN' ? '+' : '-'}{m.quantity}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                        {m.reason || <span className="opacity-40">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.created_by_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(m.created_at)}</TableCell>
                    </TableRow>
                  ))
            }
          </TableBody>
        </Table>
      </div>

      {/* Sheet — add movement */}
      <Sheet open={sheetOpen} onOpenChange={open => { if (!saving) setSheetOpen(open) }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New stock movement</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-5 px-4 py-6 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-2">
              <Label>Product</Label>
              <Select value={form.productId} onValueChange={handleProductChange}>
                <SelectTrigger><SelectValue placeholder="Select a product" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      <span>{p.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">({p.stock_quantity} in stock)</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProduct && (
                <p className="text-xs text-muted-foreground">
                  Current stock: <span className="font-medium text-foreground">{selectedProduct.stock_quantity}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue placeholder="IN or OUT" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">
                    <span className="flex items-center gap-2 text-green-600">
                      <ArrowDownCircle className="size-4" /> IN — add stock
                    </span>
                  </SelectItem>
                  <SelectItem value="OUT">
                    <span className="flex items-center gap-2 text-red-600">
                      <ArrowUpCircle className="size-4" /> OUT — remove stock
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="sm-qty">Quantity</Label>
              <Input
                id="sm-qty"
                type="number"
                min="1"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              />
              {form.type === 'OUT' && selectedProduct && (
                <p className="text-xs text-muted-foreground">
                  Max available: <span className="font-medium text-foreground">{selectedProduct.stock_quantity}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="sm-reason">
                Reason <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="sm-reason"
                placeholder="e.g. Supplier restock, Damaged goods…"
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              />
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>

          <SheetFooter className="px-4 pb-6 gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? 'Saving…' : 'Record movement'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
