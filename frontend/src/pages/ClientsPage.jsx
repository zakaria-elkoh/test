import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Search, Users } from 'lucide-react'
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

const EMPTY = { fullName: '', phone: '', email: '' }

export default function ClientsPage() {
  const [clients, setClients]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  // sheet
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [formError, setFormError] = useState('')
  const [saving, setSaving]       = useState(false)

  // delete
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]         = useState(false)

  const fetchAll = useCallback(() => {
    setLoading(true)
    api.get('/clients', { params: { search } })
      .then(r => setClients(r.data))
      .catch(() => toast.error('Failed to load clients.'))
      .finally(() => setLoading(false))
  }, [search])

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => fetchAll(), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { fetchAll() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setFormError('')
    setSheetOpen(true)
  }

  const openEdit = (c) => {
    setEditing(c)
    setForm({ fullName: c.full_name, phone: c.phone, email: c.email || '' })
    setFormError('')
    setSheetOpen(true)
  }

  const handleSave = async () => {
    if (!form.fullName.trim()) { setFormError('Full name is required.'); return }
    if (!form.phone.trim())    { setFormError('Phone is required.');     return }

    const payload = {
      fullName: form.fullName.trim(),
      phone:    form.phone.trim(),
      email:    form.email.trim() || undefined,
    }

    setSaving(true)
    setFormError('')
    try {
      if (editing) {
        await api.put(`/clients/${editing.id}`, payload)
        toast.success('Client updated.')
      } else {
        await api.post('/clients', payload)
        toast.success('Client created.')
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
      await api.delete(`/clients/${deleteTarget.id}`)
      toast.success('Client deleted.')
      setDeleteTarget(null)
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete client.')
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
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {loading ? '—' : `${clients.length} client${clients.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Add client
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone…"
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
              <TableHead>Full Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : clients.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="size-8 opacity-30" />
                          {search ? 'No clients match your search.' : 'No clients yet.'}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                : clients.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.full_name}</TableCell>
                      <TableCell className="text-sm">{c.phone}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.email
                          ? <a href={`mailto:${c.email}`} className="hover:text-primary transition-colors">{c.email}</a>
                          : <span className="opacity-40">—</span>
                        }
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{fmtDate(c.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(c)}
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
            <SheetTitle>{editing ? 'Edit client' : 'New client'}</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-5 px-4 py-6 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-name">Full Name</Label>
              <Input
                id="c-name"
                placeholder="e.g. Jean Dupont"
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="c-phone">Phone</Label>
              <Input
                id="c-phone"
                type="tel"
                placeholder="e.g. 0611111111"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="c-email">
                Email <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="c-email"
                type="email"
                placeholder="e.g. jean@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
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
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">"{deleteTarget?.full_name}"</span> will be permanently deleted.
              This will fail if the client has existing orders.
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
