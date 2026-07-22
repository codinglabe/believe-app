import React, { useEffect, useState } from 'react'
import { Head, Link, router, useForm, usePage } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Archive, Columns3, Loader2, Plus, Search, Star, Trash2 } from 'lucide-react'
import { showErrorToast, showSuccessToast } from '@/lib/toast'
import { boardBackgrounds, pm } from './theme'
import type { BoardIndexItem, CanFlags } from './types'

interface Props {
  boards: BoardIndexItem[]
  organization: { id: number; name: string }
  filters: { view: string; search: string }
  backgrounds: string[]
  can: CanFlags
}

export default function ProjectsIndex({ boards, organization, filters, backgrounds, can }: Props) {
  const { props } = usePage<{ success?: string; error?: string }>()
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteBoard, setDeleteBoard] = useState<BoardIndexItem | null>(null)
  const [busy, setBusy] = useState<null | { id: number; action: 'restore' | 'delete' }>(null)
  const form = useForm({
    name: '',
    description: '',
    background: backgrounds[0] ?? 'purple-blue',
  })

  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  const setView = (view: string) =>
    router.get('/organization/projects', { ...filters, view }, {
      preserveState: true,
      replace: true,
      showProgress: false,
    })

  const onSearch = (search: string) =>
    router.get('/organization/projects', { ...filters, search }, {
      preserveState: true,
      replace: true,
      showProgress: false,
    })

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault()
    form.post('/organization/projects', {
      showProgress: false,
      // Stay in the SPA: server returns Show in the same response (no redirect reload).
      onSuccess: (page) => {
        setCreateOpen(false)
        form.reset()
        const boardId = (page.props as { board?: { id?: number } }).board?.id
        if (boardId) {
          window.history.replaceState(window.history.state, '', `/organization/projects/${boardId}`)
        }
      },
    })
  }

  const toggleStar = (id: number) => {
    if (!can.update) return
    router.post(`/organization/projects/${id}/star`, {}, {
      preserveScroll: true,
      showProgress: false,
    })
  }

  return (
    <AppLayout>
      <Head title="Project Management" />
      <div className="w-full max-w-none space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className={`text-3xl font-bold tracking-tight ${pm.titleGradient}`}>
              Project Management
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Boards for {organization.name} — plan work with lists, cards, and your team.
            </p>
          </div>
          {can.create && (
            <Button className={pm.btn} onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New board
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filters.view !== 'archived' ? 'default' : 'outline'}
              className={filters.view !== 'archived' ? pm.tabActive : undefined}
              onClick={() => setView('active')}
            >
              Active
            </Button>
            <Button
              size="sm"
              variant={filters.view === 'archived' ? 'default' : 'outline'}
              className={filters.view === 'archived' ? pm.tabActive : undefined}
              onClick={() => setView('archived')}
            >
              <Archive className="mr-1.5 h-3.5 w-3.5" />
              Archived
            </Button>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search boards…"
              defaultValue={filters.search}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch((e.target as HTMLInputElement).value)
              }}
            />
          </div>
        </div>

        {boards.length === 0 ? (
          <div className={`rounded-2xl p-12 text-center ${pm.surfaceSoft}`}>
            <Columns3 className={`mx-auto mb-3 h-10 w-10 ${pm.text}`} />
            <h2 className="text-lg font-semibold">No boards yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a board to start organizing projects with a Kanban workflow.
            </p>
            {can.create && (
              <Button className={`mt-4 ${pm.btn}`} onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first board
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {boards.map((board) => (
              <div
                key={board.id}
                className="group relative overflow-hidden rounded-xl border border-white/10 shadow-sm transition hover:shadow-md"
              >
                <Link href={`/organization/projects/${board.id}`} className="block">
                  <div
                    className={`flex h-28 flex-col justify-between p-4 text-white ${
                      boardBackgrounds[board.background] ?? boardBackgrounds['purple-blue']
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 text-lg font-semibold drop-shadow-sm">{board.name}</h3>
                    </div>
                    <p className="text-xs text-white/80">
                      {board.lists_count} lists · {board.cards_count} cards
                    </p>
                  </div>
                  {board.description ? (
                    <div className="bg-background p-3 text-xs text-muted-foreground line-clamp-2">
                      {board.description}
                    </div>
                  ) : (
                    <div className="bg-background p-3 text-xs text-muted-foreground/60">No description</div>
                  )}
                </Link>
                {can.update && filters.view !== 'archived' && (
                  <button
                    type="button"
                    className="absolute top-3 right-3 rounded-full bg-black/25 p-1.5 text-white backdrop-blur hover:bg-black/40"
                    onClick={(e) => {
                      e.preventDefault()
                      toggleStar(board.id)
                    }}
                    aria-label={board.is_starred ? 'Unstar board' : 'Star board'}
                  >
                    <Star
                      className={`h-4 w-4 ${board.is_starred ? 'fill-amber-300 text-amber-300' : ''}`}
                    />
                  </button>
                )}
                {filters.view === 'archived' && (can.update || can.delete) && (
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    {can.update && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs"
                        disabled={busy?.id === board.id}
                        onClick={() => {
                          setBusy({ id: board.id, action: 'restore' })
                          router.post(`/organization/projects/${board.id}/restore`, {}, {
                            preserveScroll: true,
                            showProgress: false,
                            onFinish: () => setBusy(null),
                          })
                        }}
                      >
                        {busy?.id === board.id && busy.action === 'restore' ? (
                          <>
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            Restoring…
                          </>
                        ) : (
                          'Restore'
                        )}
                      </Button>
                    )}
                    {can.delete && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={busy?.id === board.id}
                        onClick={() => setDeleteBoard(board)}
                      >
                        {busy?.id === board.id && busy.action === 'delete' ? (
                          <>
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            Deleting…
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Delete
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog
        open={deleteBoard != null}
        onOpenChange={(open) => {
          if (!open && busy?.action !== 'delete') setDeleteBoard(null)
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete board?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete “{deleteBoard?.name}” and all of its lists, cards, and
              attachments? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy?.action === 'delete'}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={busy?.action === 'delete'}
              onClick={(e) => {
                e.preventDefault()
                if (!deleteBoard || busy?.action === 'delete') return
                const id = deleteBoard.id
                setBusy({ id, action: 'delete' })
                router.delete(`/organization/projects/${id}`, {
                  preserveScroll: true,
                  showProgress: false,
                  onFinish: () => {
                    setBusy(null)
                    setDeleteBoard(null)
                  },
                })
              }}
            >
              {busy?.action === 'delete' ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete forever'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create board</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitCreate} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input
                value={form.data.name}
                onChange={(e) => form.setData('name', e.target.value)}
                placeholder="Q3 Fundraising push"
                required
              />
              {form.errors.name && <p className="mt-1 text-xs text-red-500">{form.errors.name}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <Textarea
                value={form.data.description}
                onChange={(e) => form.setData('description', e.target.value)}
                rows={3}
                placeholder="Optional context for your team"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Background</label>
              <div className="flex flex-wrap gap-2">
                {backgrounds.map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    className={`h-10 w-14 rounded-md ${boardBackgrounds[bg] ?? ''} ${
                      form.data.background === bg ? 'ring-2 ring-offset-2 ring-purple-500' : ''
                    }`}
                    onClick={() => form.setData('background', bg)}
                    aria-label={bg}
                  />
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className={pm.btn} disabled={form.processing}>
                Create board
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
