import React, { useEffect, useMemo, useState } from 'react'
import { Head, Link, router, useForm, usePage } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Archive,
  ArrowLeft,
  Calendar,
  CheckSquare,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  Star,
  Trash2,
  Loader2,
} from 'lucide-react'
import { showErrorToast, showSuccessToast } from '@/lib/toast'
import CardModal from './components/CardModal'
import { boardBackgrounds, labelColors, pm } from './theme'
import type {
  CanFlags,
  ProjectBoard,
  ProjectCardDetail,
  ProjectCardSummary,
  ProjectList,
  ProjectMember,
} from './types'
import { boardPartial, cardPartial } from './visitOptions'

interface Props {
  board: ProjectBoard
  organization: { id: number; name: string }
  assignableUsers: ProjectMember[]
  filters: { member?: string | number | null; label?: string | number | null; due?: string | null }
  backgrounds: string[]
  activeCard: ProjectCardDetail | null
  can: CanFlags
}

function KanbanCardView({
  card,
  onOpen,
  dragHandleProps,
  style,
  isDragging,
}: {
  card: ProjectCardSummary
  onOpen: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  style?: React.CSSProperties
  isDragging?: boolean
}) {
  return (
    <div
      ref={undefined}
      style={style}
      className={`cursor-pointer rounded-lg border bg-background p-3 shadow-sm transition hover:shadow-md ${
        isDragging ? 'opacity-50 ring-2 ring-purple-400' : ''
      }`}
      {...dragHandleProps}
      onClick={onOpen}
    >
      {card.cover_color && (
        <div className={`mb-2 -mx-3 -mt-3 h-8 rounded-t-lg ${labelColors[card.cover_color] ?? ''}`} />
      )}
      {card.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {card.labels.map((l) => (
            <span
              key={l.id}
              className={`h-2 w-10 rounded-full ${labelColors[l.color] ?? 'bg-purple-500'}`}
              title={l.name}
            />
          ))}
        </div>
      )}
      <p className="text-sm font-medium leading-snug">{card.title}</p>
      {(card.due_at ||
        card.checklist_progress.total > 0 ||
        card.comment_count > 0 ||
        card.attachment_count > 0 ||
        card.members.length > 0) && (
        <div className="mt-2 flex items-end justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            {card.due_at && (
              <span
                className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 ${
                  card.is_overdue ? 'bg-red-500/15 text-red-600' : 'bg-muted'
                }`}
              >
                <Calendar className="h-3 w-3" />
                {new Date(card.due_at).toLocaleDateString()}
              </span>
            )}
            {card.checklist_progress.total > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <CheckSquare className="h-3 w-3" />
                {card.checklist_progress.complete}/{card.checklist_progress.total}
              </span>
            )}
            {card.comment_count > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <MessageSquare className="h-3 w-3" />
                {card.comment_count}
              </span>
            )}
            {card.attachment_count > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <Paperclip className="h-3 w-3" />
                {card.attachment_count}
              </span>
            )}
          </div>
          {card.members.length > 0 && (
            <div className="flex shrink-0 -space-x-1.5">
              {card.members.slice(0, 4).map((m) => (
                <span
                  key={m.id}
                  title={m.name}
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-purple-600 to-blue-600 text-[10px] font-bold text-white"
                >
                  {m.name.slice(0, 1).toUpperCase()}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SortableCard({
  card,
  onOpen,
}: {
  card: ProjectCardSummary
  onOpen: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card-${card.id}`,
    data: { type: 'card', card },
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <KanbanCardView
        card={card}
        onOpen={onOpen}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

function SortableList({
  boardId,
  list,
  can,
  onOpenCard,
  onAddCard,
  onRequestArchive,
}: {
  boardId: number
  list: ProjectList
  can: CanFlags
  onOpenCard: (cardId: number) => void
  onAddCard: (listId: number, title: string) => void
  onRequestArchive: (list: ProjectList) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `list-${list.id}`,
    data: { type: 'list', list },
  })
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [listName, setListName] = useState(list.name)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setListName(list.name)
  }, [list.name])

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const saveListName = () => {
    const next = listName.trim()
    if (!next || next === list.name) {
      setListName(list.name)
      setEditingName(false)
      return
    }
    setEditingName(false)
    router.put(
      `/organization/projects/${boardId}/lists/${list.id}`,
      { name: next },
      boardPartial,
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex w-72 shrink-0 flex-col rounded-xl bg-black/20 p-2 backdrop-blur-sm dark:bg-black/40"
    >
      <div
        className="relative mb-2 flex cursor-grab items-center gap-1 rounded px-0.5 py-0.5 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        {editingName && can.update ? (
          <Input
            autoFocus
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            onBlur={saveListName}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                saveListName()
              }
              if (e.key === 'Escape') {
                setListName(list.name)
                setEditingName(false)
              }
            }}
            className="h-8 flex-1 border-white/20 bg-black/40 text-sm font-semibold text-white placeholder:text-white/50 focus-visible:border-purple-400/60 focus-visible:ring-purple-500/40"
          />
        ) : (
          <h3
            className="min-w-0 flex-1 truncate px-1.5 py-1 text-sm font-semibold text-white drop-shadow"
            title={can.update ? 'Drag to move · double-click to rename' : list.name}
            onDoubleClick={(e) => {
              if (!can.update) return
              e.stopPropagation()
              setListName(list.name)
              setEditingName(true)
              setMenuOpen(false)
            }}
          >
            {list.name}
          </h3>
        )}

        <span className="shrink-0 text-xs text-white/70">{list.cards.length}</span>

        {(can.update || can.delete) && (
          <div className="relative" onPointerDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="List actions"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-20 cursor-default"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-lg">
                  {can.update && (
                    <button
                      type="button"
                      className="flex w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setMenuOpen(false)
                        setListName(list.name)
                        setEditingName(true)
                      }}
                    >
                      Rename list
                    </button>
                  )}
                  {can.delete && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-muted"
                      onClick={() => {
                        setMenuOpen(false)
                        onRequestArchive(list)
                      }}
                    >
                      <Archive className="h-3.5 w-3.5" />
                      Archive list
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <SortableContext items={list.cards.map((c) => `card-${c.id}`)} strategy={verticalListSortingStrategy}>
        <div className="flex max-h-[calc(100vh-16rem)] flex-col gap-2 overflow-y-auto px-0.5 pb-1">
          {list.cards.map((card) => (
            <SortableCard key={card.id} card={card} onOpen={() => onOpenCard(card.id)} />
          ))}
        </div>
      </SortableContext>
      {can.create && (
        <div className="mt-2">
          {adding ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!draft.trim()) return
                onAddCard(list.id, draft.trim())
                setDraft('')
                setAdding(false)
              }}
              className="space-y-2"
            >
              <Input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Enter a title for this card…"
                className="bg-background"
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" className={pm.btnSm}>
                  Add card
                </Button>
                <Button type="button" size="sm" variant="ghost" className="text-white" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-white/90 hover:bg-white/10 hover:text-white"
              onClick={() => setAdding(true)}
            >
              <Plus className="mr-1 h-4 w-4" /> Add a card
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProjectsShow({
  board,
  assignableUsers,
  filters,
  activeCard,
  can,
}: Props) {
  const { props } = usePage<{ success?: string; error?: string }>()
  const [lists, setLists] = useState<ProjectList[]>(board.lists)
  const [activeDragCard, setActiveDragCard] = useState<ProjectCardSummary | null>(null)
  const [newListName, setNewListName] = useState('')
  const [addingList, setAddingList] = useState(false)
  const [editingBoardName, setEditingBoardName] = useState(false)
  const [boardNameDraft, setBoardNameDraft] = useState(board.name)
  const [archiveTarget, setArchiveTarget] = useState<
    null | { type: 'board' } | { type: 'list'; listId: number; listName: string }
  >(null)
  const [deleteBoardOpen, setDeleteBoardOpen] = useState(false)
  const [deletingBoard, setDeletingBoard] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const renameForm = useForm({ name: board.name, description: board.description ?? '', background: board.background })

  useEffect(() => {
    setLists(board.lists)
  }, [board.lists])

  useEffect(() => {
    setBoardNameDraft(board.name)
    renameForm.setData('name', board.name)
  }, [board.name])

  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const listIds = useMemo(() => lists.map((l) => `list-${l.id}`), [lists])

  const findListByCardId = (cardId: number) =>
    lists.find((l) => l.cards.some((c) => c.id === cardId))

  const openCard = (cardId: number) => {
    router.get(
      `/organization/projects/${board.id}`,
      { ...filters, card: cardId },
      { ...cardPartial, replace: true },
    )
  }

  const closeCard = () => {
    router.get(
      `/organization/projects/${board.id}`,
      { member: filters.member || undefined, label: filters.label || undefined, due: filters.due || undefined },
      { ...cardPartial, replace: true },
    )
  }

  const applyFilters = (next: Partial<Props['filters']>) => {
    router.get(
      `/organization/projects/${board.id}`,
      {
        member: next.member === 'all' || next.member === '' ? undefined : (next.member ?? filters.member) || undefined,
        label: next.label === 'all' || next.label === '' ? undefined : (next.label ?? filters.label) || undefined,
        due: next.due === 'all' || next.due === '' ? undefined : (next.due ?? filters.due) || undefined,
      },
      { ...boardPartial, replace: true },
    )
  }

  const onAddCard = (listId: number, title: string) => {
    router.post(`/organization/projects/${board.id}/cards`, { list_id: listId, title }, boardPartial)
  }

  const onDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current
    if (data?.type === 'card') {
      setActiveDragCard(data.card as ProjectCardSummary)
    }
  }

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over || !can.update) return

    const activeId = String(active.id)
    const overId = String(over.id)
    if (!activeId.startsWith('card-')) return

    const activeCardId = Number(activeId.replace('card-', ''))
    const activeList = findListByCardId(activeCardId)
    if (!activeList) return

    let overList: ProjectList | undefined
    if (overId.startsWith('list-')) {
      overList = lists.find((l) => l.id === Number(overId.replace('list-', '')))
    } else if (overId.startsWith('card-')) {
      overList = findListByCardId(Number(overId.replace('card-', '')))
    }
    if (!overList || activeList.id === overList.id) return

    setLists((prev) => {
      const next = prev.map((l) => ({ ...l, cards: [...l.cards] }))
      const from = next.find((l) => l.id === activeList.id)!
      const to = next.find((l) => l.id === overList!.id)!
      const cardIndex = from.cards.findIndex((c) => c.id === activeCardId)
      if (cardIndex < 0) return prev
      const [moved] = from.cards.splice(cardIndex, 1)
      moved.list_id = to.id
      let toIndex = to.cards.length
      if (overId.startsWith('card-')) {
        const overCardId = Number(overId.replace('card-', ''))
        const idx = to.cards.findIndex((c) => c.id === overCardId)
        if (idx >= 0) toIndex = idx
      }
      to.cards.splice(toIndex, 0, moved)
      return next
    })
  }

  const onDragEnd = (event: DragEndEvent) => {
    setActiveDragCard(null)
    const { active, over } = event
    if (!over || !can.update) return

    const activeId = String(active.id)
    const overId = String(over.id)

    if (activeId.startsWith('list-') && overId.startsWith('list-')) {
      const oldIndex = lists.findIndex((l) => `list-${l.id}` === activeId)
      const newIndex = lists.findIndex((l) => `list-${l.id}` === overId)
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return
      const reordered = arrayMove(lists, oldIndex, newIndex)
      setLists(reordered)
      router.put(
        `/organization/projects/${board.id}/lists/reorder`,
        { ordered_ids: reordered.map((l) => l.id) },
        boardPartial,
      )
      return
    }

    if (!activeId.startsWith('card-')) return

    const cardId = Number(activeId.replace('card-', ''))

    setLists((prev) => {
      let working = prev.map((l) => ({ ...l, cards: [...l.cards] }))

      const fromList = working.find((l) => l.cards.some((c) => c.id === cardId))
      if (!fromList) return prev

      if (overId.startsWith('card-')) {
        const overCardId = Number(overId.replace('card-', ''))
        const toList = working.find((l) => l.cards.some((c) => c.id === overCardId)) ?? fromList
        if (fromList.id === toList.id) {
          const oldIndex = fromList.cards.findIndex((c) => c.id === cardId)
          const newIndex = fromList.cards.findIndex((c) => c.id === overCardId)
          if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
            fromList.cards = arrayMove(fromList.cards, oldIndex, newIndex)
          }
        }
      }

      const finalList = working.find((l) => l.cards.some((c) => c.id === cardId))
      if (finalList) {
        const position = finalList.cards.findIndex((c) => c.id === cardId)
        router.post(
          `/organization/projects/${board.id}/cards/${cardId}/move`,
          { list_id: finalList.id, position: Math.max(0, position) },
          boardPartial,
        )
      }

      return working
    })
  }

  const bgClass = boardBackgrounds[board.background] ?? boardBackgrounds['purple-blue']

  return (
    <AppLayout>
      <Head title={board.name} />
      <div className={`relative min-h-[calc(100vh-4rem)] ${bgClass}`}>
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/organization/projects"
              className="rounded-md bg-black/25 p-2 text-white hover:bg-black/40"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              {editingBoardName && can.update ? (
                <Input
                  autoFocus
                  value={boardNameDraft}
                  onChange={(e) => setBoardNameDraft(e.target.value)}
                  onBlur={() => {
                    const next = boardNameDraft.trim()
                    if (!next || next === board.name) {
                      setBoardNameDraft(board.name)
                      setEditingBoardName(false)
                      return
                    }
                    setEditingBoardName(false)
                    renameForm.setData('name', next)
                    renameForm.put(`/organization/projects/${board.id}`, boardPartial)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      ;(e.target as HTMLInputElement).blur()
                    }
                    if (e.key === 'Escape') {
                      setBoardNameDraft(board.name)
                      setEditingBoardName(false)
                    }
                  }}
                  className="h-9 max-w-xs border-white/20 bg-black/40 text-lg font-bold text-white placeholder:text-white/50 focus-visible:border-purple-400/60 focus-visible:ring-purple-500/40"
                />
              ) : (
                <button
                  type="button"
                  className="block max-w-full truncate rounded px-1 text-left text-xl font-bold text-white drop-shadow hover:bg-white/10"
                  title={can.update ? 'Click to rename board' : board.name}
                  onClick={() => {
                    if (!can.update) return
                    setBoardNameDraft(board.name)
                    setEditingBoardName(true)
                  }}
                >
                  {board.name}
                </button>
              )}
              {board.description && (
                <p className="truncate text-xs text-white/80">{board.description}</p>
              )}
            </div>
            {can.update && (
              <button
                type="button"
                className="rounded-full bg-black/25 p-1.5 text-white hover:bg-black/40"
                onClick={() =>
                  router.post(`/organization/projects/${board.id}/star`, {}, boardPartial)
                }
              >
                <Star className={`h-4 w-4 ${board.is_starred ? 'fill-amber-300 text-amber-300' : ''}`} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filters.member ? String(filters.member) : 'all'}
              onValueChange={(v) => applyFilters({ member: v })}
            >
              <SelectTrigger className="h-8 w-[160px] overflow-hidden border-white/20 bg-black/25 text-white [&>span]:min-w-0 [&>span]:truncate">
                <SelectValue placeholder="Member" />
              </SelectTrigger>
              <SelectContent className="max-w-[280px]">
                <SelectItem value="all">All members</SelectItem>
                {assignableUsers.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)} className="truncate">
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.label ? String(filters.label) : 'all'}
              onValueChange={(v) => applyFilters({ label: v })}
            >
              <SelectTrigger className="h-8 w-[160px] overflow-hidden border-white/20 bg-black/25 text-white [&>span]:min-w-0 [&>span]:truncate">
                <SelectValue placeholder="Label" />
              </SelectTrigger>
              <SelectContent className="max-w-[280px]">
                <SelectItem value="all">All labels</SelectItem>
                {board.labels.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)} className="truncate">
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.due || 'all'}
              onValueChange={(v) => applyFilters({ due: v })}
            >
              <SelectTrigger className="h-8 w-[140px] overflow-hidden border-white/20 bg-black/25 text-white [&>span]:min-w-0 [&>span]:truncate">
                <SelectValue placeholder="Due" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any due date</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="week">Due in 7 days</SelectItem>
                <SelectItem value="none">No due date</SelectItem>
              </SelectContent>
            </Select>
            {can.delete && !board.archived_at && (
              <Button
                size="sm"
                variant="secondary"
                className="bg-black/25 text-white hover:bg-black/40"
                disabled={archiving || deletingBoard}
                onClick={() => setArchiveTarget({ type: 'board' })}
              >
                {archiving && archiveTarget?.type === 'board' ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Archive className="mr-1 h-3.5 w-3.5" />
                )}
                {archiving && archiveTarget?.type === 'board' ? 'Archiving…' : 'Archive'}
              </Button>
            )}
            {can.delete && (
              <Button
                size="sm"
                variant="secondary"
                className="bg-black/25 text-white hover:bg-red-600/80"
                disabled={deletingBoard}
                onClick={() => setDeleteBoardOpen(true)}
              >
                {deletingBoard ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                )}
                {deletingBoard ? 'Deleting…' : 'Delete'}
              </Button>
            )}
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="flex items-start gap-3 overflow-x-auto px-4 pb-8 sm:px-6">
            <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
              {lists.map((list) => (
                <SortableList
                  key={list.id}
                  boardId={board.id}
                  list={list}
                  can={can}
                  onOpenCard={openCard}
                  onAddCard={onAddCard}
                  onRequestArchive={(l) =>
                    setArchiveTarget({ type: 'list', listId: l.id, listName: l.name })
                  }
                />
              ))}
            </SortableContext>

            {can.create && (
              <div className="w-72 shrink-0">
                {addingList ? (
                  <form
                    className="rounded-xl bg-black/25 p-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!newListName.trim()) return
                      router.post(
                        `/organization/projects/${board.id}/lists`,
                        { name: newListName.trim() },
                        {
                          ...boardPartial,
                          onSuccess: () => {
                            setNewListName('')
                            setAddingList(false)
                          },
                        },
                      )
                    }}
                  >
                    <Input
                      autoFocus
                      className="mb-2 bg-background"
                      placeholder="Enter list title…"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" className={pm.btnSm}>
                        Add list
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-white"
                        onClick={() => setAddingList(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button
                    className="w-full justify-start bg-black/25 text-white hover:bg-black/40"
                    onClick={() => setAddingList(true)}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Add another list
                  </Button>
                )}
              </div>
            )}
          </div>

          <DragOverlay>
            {activeDragCard ? (
              <div className="w-72">
                <KanbanCardView card={activeDragCard} onOpen={() => {}} isDragging />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <CardModal
        boardId={board.id}
        card={activeCard}
        boardLabels={board.labels}
        assignableUsers={assignableUsers}
        can={can}
        onClose={closeCard}
      />

      <AlertDialog
        open={archiveTarget != null}
        onOpenChange={(open) => {
          if (!open && !archiving) setArchiveTarget(null)
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {archiveTarget?.type === 'list' ? 'Archive list?' : 'Archive board?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget?.type === 'list'
                ? `Archive “${archiveTarget.listName}”? Cards in this list will be hidden from the board.`
                : `Archive “${board.name}”? You can restore it later from archived boards.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={archiving}
              onClick={(e) => {
                e.preventDefault()
                if (!archiveTarget || archiving) return
                setArchiving(true)
                if (archiveTarget.type === 'list') {
                  router.post(
                    `/organization/projects/${board.id}/lists/${archiveTarget.listId}/archive`,
                    {},
                    {
                      ...boardPartial,
                      onFinish: () => {
                        setArchiving(false)
                        setArchiveTarget(null)
                      },
                    },
                  )
                } else {
                  router.post(`/organization/projects/${board.id}/archive`, {}, {
                    showProgress: false,
                    onFinish: () => {
                      setArchiving(false)
                      setArchiveTarget(null)
                    },
                  })
                }
              }}
            >
              {archiving ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Archiving…
                </>
              ) : (
                'Archive'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteBoardOpen}
        onOpenChange={(open) => {
          if (!open && !deletingBoard) setDeleteBoardOpen(false)
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete board?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete “{board.name}” and all of its lists, cards, comments, and
              attachments? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBoard}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deletingBoard}
              onClick={(e) => {
                e.preventDefault()
                if (deletingBoard) return
                setDeletingBoard(true)
                router.delete(`/organization/projects/${board.id}`, {
                  showProgress: false,
                  onFinish: () => setDeletingBoard(false),
                })
              }}
            >
              {deletingBoard ? (
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
    </AppLayout>
  )
}
