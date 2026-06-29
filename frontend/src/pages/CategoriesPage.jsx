import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, Tags } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const EMPTY = { name: '' }

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')

  // sheet
  const [sheetOpen, setSheetOpen]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState(EMPTY)
  const [formError, setFormError]   = useState('')
  const [saving, setSaving]         = useState(false)

  // delete
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]         = useState(false)

  const fetchAll = () => {
    setLoading(true)
    api.get('/categories')
      .then(r => setCategories(r.data))
      .catch(() => toast.error('Failed to load categories.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setFormError('')
    setSheetOpen(true)
  }

  const openEdit = (cat) => {
    setEditing(cat)
    setForm({ name: cat.name })
    setFormError('')
    setSheetOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Name is required.'); return }
    setSaving(true)
    setFormError('')
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, form)
        toast.success('Category updated.')
      } else {
        await api.post('/categories', form)
        toast.success('Category created.')
      }
      setSheetOpen(false)
      fetchAll()
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
      await api.delete(`/categories/${deleteTarget.id}`)
      toast.success('Category deleted.')
      setDeleteTarget(null)
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete category.')
    } finally {
      setDeleting(false)
    }
  }

  const fmtDate = (d) => new Date(d).toLocaleDateString('en', { dateStyle: 'medium' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {loading ? '—' : `${categories.length} categor${categories.length !== 1 ? 'ies' : 'y'}`}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Add category
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search categories…"
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
              <TableHead>Created</TableHead>
              <TableHead className="text-right w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              : filtered.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Tags className="size-8 opacity-30" />
                          {search ? 'No categories match your search.' : 'No categories yet. Add one to get started.'}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                : filtered.map(cat => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{fmtDate(cat.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(cat)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
            }
          </TableBody>
        </Table>
      </div>

      {/* Sheet — add / edit */}
      <Sheet open={sheetOpen} onOpenChange={open => { if (!saving) setSheetOpen(open) }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit category' : 'New category'}</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-4 py-6 flex-1">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                placeholder="e.g. Electronics"
                value={form.name}
                onChange={e => setForm({ name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
            </div>
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
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">"{deleteTarget?.name}"</span> will be permanently deleted.
              This cannot be undone. Products linked to this category will also be affected.
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
