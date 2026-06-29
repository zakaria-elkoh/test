import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Search, Package } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const EMPTY = { name: '', sku: '', price: '', categoryId: '' }
const PAGE_SIZE = 10

export default function ProductsPage() {
  const { isAdmin } = useAuth()

  const [products, setProducts]   = useState([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [categories, setCategories] = useState([])

  // sheet
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [formError, setFormError] = useState('')
  const [saving, setSaving]       = useState(false)

  // delete
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]         = useState(false)

  // debounce search → reset to page 1
  useEffect(() => {
    const t = setTimeout(() => setPage(1), 350)
    return () => clearTimeout(t)
  }, [search])

  const fetchProducts = useCallback(() => {
    setLoading(true)
    api.get('/products', { params: { search, page, limit: PAGE_SIZE } })
      .then(r => { setProducts(r.data.data); setTotal(r.data.total) })
      .catch(() => toast.error('Failed to load products.'))
      .finally(() => setLoading(false))
  }, [search, page])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => { api.get('/categories').then(r => setCategories(r.data)) }, [])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setFormError('')
    setSheetOpen(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm({
      name: p.name,
      sku: p.sku,
      price: p.price,
      categoryId: String(p.category_id),
    })
    setFormError('')
    setSheetOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim())    { setFormError('Name is required.');     return }
    if (!form.sku.trim())     { setFormError('SKU is required.');      return }
    if (!form.price)          { setFormError('Price is required.');    return }
    if (!form.categoryId)     { setFormError('Category is required.'); return }

    const payload = {
      name:       form.name.trim(),
      sku:        form.sku.trim(),
      price:      parseFloat(form.price),
      categoryId: parseInt(form.categoryId),
    }

    setSaving(true)
    setFormError('')
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, payload)
        toast.success('Product updated.')
      } else {
        await api.post('/products', payload)
        toast.success('Product created.')
      }
      setSheetOpen(false)
      fetchProducts()
    } catch (err) {
      setFormError(err.response?.data?.error || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/products/${deleteTarget.id}`)
      toast.success('Product deleted.')
      setDeleteTarget(null)
      fetchProducts()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete product.')
    } finally {
      setDeleting(false)
    }
  }

  const fmtPrice = (n) => '$' + Number(n).toFixed(2)
  const stockColor = (qty) =>
    qty === 0 ? 'text-destructive' : qty < 10 ? 'text-yellow-600' : 'text-green-600'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {loading ? '—' : `${total} product${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Add product
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or SKU…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : products.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="size-8 opacity-30" />
                          {search ? 'No products match your search.' : 'No products yet.'}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                : products.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">{p.sku}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{p.category_name}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtPrice(p.price)}</TableCell>
                      <TableCell className={`text-right tabular-nums font-medium ${stockColor(p.stock_quantity)}`}>
                        {p.stock_quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                            <Pencil className="size-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost" size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(p)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
            }
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {totalPages} — {total} products</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Sheet — add / edit */}
      <Sheet open={sheetOpen} onOpenChange={open => { if (!saving) setSheetOpen(open) }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit product' : 'New product'}</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-5 px-4 py-6 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-2">
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" placeholder="e.g. iPhone 15 Pro" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="p-sku">SKU</Label>
              <Input id="p-sku" placeholder="e.g. APL-IP15P" value={form.sku}
                onChange={e => setForm(f => ({ ...f, sku: e.target.value.toUpperCase() }))}
                className="font-mono" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="p-price">Price ($)</Label>
              <Input id="p-price" type="number" min="0" step="0.01" placeholder="0.00"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="p-cat">Category</Label>
              <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger id="p-cat">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editing && (
              <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
                Stock quantity is managed via <span className="font-medium">Stock Movements</span> — it cannot be edited directly here.
              </p>
            )}

            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>

          <SheetFooter className="px-4 pb-6 gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* AlertDialog — delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open && !deleting) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">"{deleteTarget?.name}"</span> will be permanently deleted.
              This cannot be undone and will fail if the product has existing orders or stock movements.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
