import React, { useEffect, useRef, useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlignLeft,
  Archive,
  Calendar,
  CheckSquare,
  CreditCard,
  Heart,
  Image as ImageIcon,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  Tag,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import { coverColors, labelColors, pm } from '../theme'
import type {
  CanFlags,
  Checklist,
  ProjectActivity,
  ProjectCardDetail,
  ProjectComment,
  ProjectLabel,
  ProjectMember,
} from '../types'
import { boardPartial, cardPartial } from '../visitOptions'
import { ActivityMessage } from '../activityFormat'
import {
  LabelsPopover,
  MembersPopover,
  ChecklistPopover,
  DatesPopover,
  AttachmentPopover,
  AttachmentPreviewThumb,
  CoverPopover,
} from './MembersLabelsPopovers'

type Props = {
  boardId: number
  card: ProjectCardDetail | null
  boardLabels: ProjectLabel[]
  assignableUsers: ProjectMember[]
  can: CanFlags
  onClose: () => void
}

/** Brand scrollbar (purple → blue), used on feed + sidebar panels. */
const pmScroll =
  '[scrollbar-width:thin] [scrollbar-color:rgb(147_51_234_/_0.45)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-500/70 [&::-webkit-scrollbar-thumb]:to-blue-500/70 [&::-webkit-scrollbar-thumb:hover]:from-purple-500 [&::-webkit-scrollbar-thumb:hover]:to-blue-600'

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md bg-muted px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-muted/80 disabled:opacity-40"
    >
      <Icon className="h-4 w-4 shrink-0 opacity-80" />
      {label}
    </button>
  )
}

export default function CardModal({
  boardId,
  card: serverCard,
  boardLabels,
  assignableUsers,
  can,
  onClose,
}: Props) {
  const { auth } = usePage<{ auth?: { user?: { id: number; name: string } } }>().props
  const [local, setLocal] = useState<ProjectCardDetail | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [editingDesc, setEditingDesc] = useState(false)
  const [dueAt, setDueAt] = useState('')
  const [comment, setComment] = useState('')
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editBody, setEditBody] = useState('')
  const [deleteCommentId, setDeleteCommentId] = useState<number | null>(null)
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
  const [itemDrafts, setItemDrafts] = useState<Record<number, string>>({})
  const [uploadingFile, setUploadingFile] = useState(false)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!serverCard) {
      setLocal(null)
      return
    }
    setLocal(serverCard)
    setTitle(serverCard.title)
    setDescription(serverCard.description ?? '')
    setDueAt(serverCard.due_at ? serverCard.due_at.slice(0, 16) : '')
    setEditingDesc(false)
  }, [serverCard?.id])

  // Keep local in sync when server pushes updates for same card
  useEffect(() => {
    if (!serverCard || !local || serverCard.id !== local.id) return
    setLocal(serverCard)
    // Don't clobber in-progress title/desc edits unless values match remote
    if (document.activeElement !== titleRef.current) {
      setTitle(serverCard.title)
    }
    if (!editingDesc && document.activeElement !== descRef.current) {
      setDescription(serverCard.description ?? '')
    }
    if (document.activeElement?.getAttribute('type') !== 'datetime-local') {
      setDueAt(serverCard.due_at ? serverCard.due_at.slice(0, 16) : '')
    }
  }, [serverCard])

  if (!local) return null

  const card = local
  const base = `/organization/projects/${boardId}/cards/${card.id}`

  const pushActivity = (
    action: string,
    meta: Record<string, unknown> | null = null,
  ) => {
    const activity: ProjectActivity = {
      id: -Date.now(),
      action,
      meta,
      created_at: new Date().toISOString(),
      user: auth?.user
        ? { id: auth.user.id, name: auth.user.name }
        : null,
    }
    setLocal((c) =>
      c ? { ...c, activities: [activity, ...(c.activities ?? [])] } : c,
    )
  }

  const quiet = {
    ...cardPartial,
    onSuccess: (page: { props: Record<string, unknown> }) => {
      const next = page.props.activeCard as ProjectCardDetail | null | undefined
      if (next && next.id === (serverCard?.id ?? local?.id)) {
        setLocal(next)
        if (document.activeElement !== titleRef.current) {
          setTitle(next.title)
        }
        if (!editingDesc && document.activeElement !== descRef.current) {
          setDescription(next.description ?? '')
        }
        if (document.activeElement?.getAttribute('type') !== 'datetime-local') {
          setDueAt(next.due_at ? next.due_at.slice(0, 16) : '')
        }
      }
    },
    onError: () => {
      if (serverCard) setLocal(serverCard)
    },
  }

  const saveField = (data: Record<string, unknown>, optimistic?: Partial<ProjectCardDetail>) => {
    if (!can.update) return
    if (optimistic) {
      setLocal((c) => (c ? { ...c, ...optimistic } : c))
    }
    router.put(base, data, quiet)
  }

  const toggleLabel = (label: ProjectLabel) => {
    if (!can.update) return
    const has = card.labels.some((l) => l.id === label.id)
    const nextLabels = has
      ? card.labels.filter((l) => l.id !== label.id)
      : [...card.labels, label]
    setLocal((c) => (c ? { ...c, labels: nextLabels } : c))
    pushActivity('card.labels_updated', {
      labels: nextLabels.map((l) => l.name),
    })
    router.post(
      `${base}/labels`,
      { label_ids: nextLabels.map((l) => l.id) },
      quiet,
    )
  }

  const toggleMember = (user: ProjectMember) => {
    if (!can.update) return
    const has = card.members.some((m) => m.id === user.id)
    const nextMembers = has
      ? card.members.filter((m) => m.id !== user.id)
      : [...card.members, user]
    setLocal((c) => (c ? { ...c, members: nextMembers } : c))
    pushActivity('card.members_updated', {
      members: nextMembers.map((m) => m.name),
    })
    router.post(
      `${base}/members`,
      { user_ids: nextMembers.map((m) => m.id) },
      quiet,
    )
  }

  const toggleItem = (checklistId: number, itemId: number, checked: boolean) => {
    if (!can.update) return
    const checklist = card.checklists.find((cl) => cl.id === checklistId)
    const item = checklist?.items.find((it) => it.id === itemId)
    setLocal((c) => {
      if (!c) return c
      return {
        ...c,
        checklists: c.checklists.map((cl) =>
          cl.id !== checklistId
            ? cl
            : {
                ...cl,
                items: cl.items.map((it) =>
                  it.id === itemId ? { ...it, is_complete: checked } : it,
                ),
              },
        ),
      }
    })
    if (item) {
      pushActivity(
        checked ? 'checklist.item_completed' : 'checklist.item_uncompleted',
        { checklist: checklist?.title, title: item.title },
      )
    }
    router.put(
      `${base}/checklists/${checklistId}/items/${itemId}`,
      { is_complete: checked },
      quiet,
    )
  }

  const addChecklistItem = (checklistId: number, text: string) => {
    if (!can.create || !text.trim()) return
    const tempId = -Date.now()
    const checklist = card.checklists.find((cl) => cl.id === checklistId)
    setLocal((c) => {
      if (!c) return c
      return {
        ...c,
        checklists: c.checklists.map((cl) =>
          cl.id !== checklistId
            ? cl
            : {
                ...cl,
                items: [
                  ...cl.items,
                  {
                    id: tempId,
                    title: text.trim(),
                    is_complete: false,
                    position: cl.items.length,
                  },
                ],
              },
        ),
      }
    })
    setItemDrafts((d) => ({ ...d, [checklistId]: '' }))
    pushActivity('checklist.item_added', {
      checklist: checklist?.title,
      title: text.trim(),
    })
    router.post(`${base}/checklists/${checklistId}/items`, { title: text.trim() }, quiet)
  }

  const removeChecklist = (checklistId: number) => {
    if (!can.delete) return
    const removed = card.checklists.find((cl) => cl.id === checklistId)
    setLocal((c) =>
      c ? { ...c, checklists: c.checklists.filter((cl) => cl.id !== checklistId) } : c,
    )
    if (removed) {
      pushActivity('checklist.deleted', { title: removed.title })
    }
    router.delete(`${base}/checklists/${checklistId}`, quiet)
  }

  const removeItem = (checklistId: number, itemId: number) => {
    if (!can.delete) return
    const checklist = card.checklists.find((cl) => cl.id === checklistId)
    const item = checklist?.items.find((it) => it.id === itemId)
    setLocal((c) => {
      if (!c) return c
      return {
        ...c,
        checklists: c.checklists.map((cl) =>
          cl.id !== checklistId
            ? cl
            : { ...cl, items: cl.items.filter((it) => it.id !== itemId) },
        ),
      }
    })
    if (item) {
      pushActivity('checklist.item_removed', {
        checklist: checklist?.title,
        title: item.title,
      })
    }
    if (itemId > 0) {
      router.delete(`${base}/checklists/${checklistId}/items/${itemId}`, quiet)
    }
  }

  const postComment = (parentId?: number | null) => {
    const body = parentId ? replyBody.trim() : comment.trim()
    if (!can.create || !body) return
    const tempId = -Date.now()
    const newComment: ProjectComment = {
      id: tempId,
      parent_id: parentId ?? null,
      body,
      created_at: new Date().toISOString(),
      likes_count: 0,
      liked_by_me: false,
      replies: [],
      user: auth?.user
        ? { id: auth.user.id, name: auth.user.name, email: '' }
        : null,
    }

    setLocal((c) => {
      if (!c) return c
      if (parentId) {
        return {
          ...c,
          comments: c.comments.map((cm) =>
            cm.id === parentId
              ? { ...cm, replies: [...(cm.replies ?? []), newComment] }
              : cm,
          ),
          comment_count: c.comment_count + 1,
        }
      }
      return {
        ...c,
        comments: [newComment, ...c.comments],
        comment_count: c.comment_count + 1,
      }
    })

    if (parentId) {
      setReplyBody('')
      setReplyTo(null)
      router.post(`${base}/comments`, { body, parent_id: parentId }, quiet)
    } else {
      setComment('')
      router.post(`${base}/comments`, { body }, quiet)
    }
  }

  const toggleLike = (commentId: number) => {
    setLocal((c) => {
      if (!c) return c
      const bump = (cm: ProjectComment): ProjectComment => {
        if (cm.id === commentId) {
          const liked = !cm.liked_by_me
          return {
            ...cm,
            liked_by_me: liked,
            likes_count: Math.max(0, (cm.likes_count ?? 0) + (liked ? 1 : -1)),
          }
        }
        return {
          ...cm,
          replies: (cm.replies ?? []).map(bump),
        }
      }
      return { ...c, comments: c.comments.map(bump) }
    })
    router.post(`${base}/comments/${commentId}/like`, {}, quiet)
  }

  const startEdit = (cm: ProjectComment) => {
    setEditingId(cm.id)
    setEditBody(cm.body)
    setReplyTo(null)
  }

  const saveEdit = (commentId: number) => {
    const body = editBody.trim()
    if (!body) return
    setLocal((c) => {
      if (!c) return c
      const patch = (cm: ProjectComment): ProjectComment => {
        if (cm.id === commentId) return { ...cm, body }
        return { ...cm, replies: (cm.replies ?? []).map(patch) }
      }
      return { ...c, comments: c.comments.map(patch) }
    })
    setEditingId(null)
    setEditBody('')
    router.put(`${base}/comments/${commentId}`, { body }, quiet)
  }

  const requestDeleteComment = (commentId: number) => {
    setDeleteCommentId(commentId)
  }

  const confirmDeleteComment = () => {
    if (deleteCommentId == null) return
    const commentId = deleteCommentId
    setDeleteCommentId(null)
    setLocal((c) => {
      if (!c) return c
      return {
        ...c,
        comments: c.comments
          .filter((cm) => cm.id !== commentId)
          .map((cm) => ({
            ...cm,
            replies: (cm.replies ?? []).filter((r) => r.id !== commentId),
          })),
        comment_count: Math.max(0, c.comment_count - 1),
      }
    })
    router.delete(`${base}/comments/${commentId}`, quiet)
  }

  const isMine = (cm: ProjectComment) =>
    !!auth?.user?.id && cm.user?.id === auth.user.id

  const setCover = (color: string | null) => {
    if (!can.update) return
    if (color) {
      saveField({ cover_color: color }, { cover_color: color })
    } else {
      saveField({ clear_cover_color: true }, { cover_color: null })
    }
  }

  const saveDue = (value: string) => {
    setDueAt(value)
    if (!can.update) return
    if (value) {
      saveField({ due_at: value }, { due_at: new Date(value).toISOString(), is_overdue: new Date(value) < new Date() })
    } else {
      saveField({ clear_due_at: true }, { due_at: null, is_overdue: false })
    }
  }

  return (
    <>
    <Dialog open={!!serverCard} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex max-h-[92vh] w-[calc(100%-1.5rem)] max-w-[920px] flex-col gap-0 overflow-hidden p-0 shadow-2xl sm:max-w-[920px] sm:rounded-xl [&>button.absolute]:hidden"
      >
        <DialogTitle className="sr-only">{card.title}</DialogTitle>

        {/* Cover */}
        {card.cover_color && (
          <div className={`relative h-28 w-full shrink-0 ${labelColors[card.cover_color] ?? 'bg-purple-500'}`}>
            <button
              type="button"
              className="absolute top-3 right-3 rounded-md bg-black/40 p-1.5 text-white hover:bg-black/55"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className={`shrink-0 px-5 pt-4 pb-2 ${card.cover_color ? '' : 'pr-12'}`}>
            {!card.cover_color && (
              <button
                type="button"
                className="absolute top-3 right-3 z-10 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <div className="flex items-start gap-3">
              <CreditCard className="mt-2.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <textarea
                  ref={titleRef}
                  rows={1}
                  value={title}
                  disabled={!can.update}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height = `${e.target.scrollHeight}px`
                  }}
                  onBlur={() => {
                    const next = title.trim()
                    if (next && next !== card.title) {
                      saveField({ title: next }, { title: next })
                    } else if (!next) {
                      setTitle(card.title)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      ;(e.target as HTMLTextAreaElement).blur()
                    }
                  }}
                  className="w-full resize-none bg-transparent text-xl font-semibold leading-snug text-foreground outline-none focus:rounded-md focus:bg-muted/50 focus:ring-2 focus:ring-purple-500/40"
                />
                <p className="mt-0.5 text-sm text-muted-foreground">
                  in list{' '}
                  <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">
                    {card.list_name ?? 'List'}
                  </span>
                </p>
              </div>
            </div>

            {/* Quick facts under title (Trello style) */}
            <div className="mt-4 ml-8 flex flex-wrap gap-6">
              {(can.update || card.members.length > 0) && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Members
                  </p>
                  <div className="flex items-center gap-1">
                    {card.members.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        title={`${m.name} — click to remove`}
                        disabled={!can.update}
                        onClick={() => toggleMember(m)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-[11px] font-bold text-white ring-2 ring-background transition hover:brightness-110"
                      >
                        {initials(m.name)}
                      </button>
                    ))}
                    {can.update && (
                      <MembersPopover
                        assignableUsers={assignableUsers}
                        selected={card.members}
                        onToggle={toggleMember}
                        trigger={
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                            aria-label="Add members"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        }
                      />
                    )}
                  </div>
                </div>
              )}

              {(can.update || card.labels.length > 0 || boardLabels.length > 0) && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Labels
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {card.labels.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        disabled={!can.update}
                        onClick={() => toggleLabel(l)}
                        title="Click to remove"
                        className={`inline-flex h-8 max-w-[14rem] min-w-[48px] items-center truncate rounded-md px-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 ${
                          labelColors[l.color] ?? 'bg-purple-500'
                        }`}
                      >
                        {l.name}
                      </button>
                    ))}
                    {can.update && (
                      <LabelsPopover
                        boardLabels={boardLabels}
                        selected={card.labels}
                        canCreate={can.create}
                        onToggle={toggleLabel}
                        onCreate={(name, color) => {
                          router.post(
                            `/organization/projects/${boardId}/labels`,
                            { name, color, card: card.id },
                            boardPartial,
                          )
                        }}
                        trigger={
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-muted/80"
                            aria-label="Add labels"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        }
                      />
                    )}
                  </div>
                </div>
              )}

              {(can.update || card.due_at) && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Due date
                  </p>
                  <DatesPopover
                    value={dueAt}
                    disabled={!can.update}
                    onChange={(v) => saveDue(v)}
                    onRemove={() => saveDue('')}
                    trigger={
                      card.due_at ? (
                        <button
                          type="button"
                          disabled={!can.update}
                          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                            card.is_overdue
                              ? 'bg-red-500/20 text-red-600 dark:text-red-300'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(card.due_at).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!can.update}
                          className="flex h-8 items-center gap-1 rounded-md bg-muted px-2 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </button>
                      )
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[1fr_248px]">
            <div className={`min-h-0 space-y-6 overflow-y-auto px-5 py-4 lg:pl-5 lg:pr-3 ${pmScroll}`}>
              {/* Description */}
              <section>
                <div className="mb-2 flex items-center gap-2">
                  <AlignLeft className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Description</h3>
                </div>
                <div className="ml-6">
                  {editingDesc || (!card.description && can.update) ? (
                    <div className="space-y-2">
                      <Textarea
                        ref={descRef}
                        autoFocus={editingDesc}
                        rows={5}
                        value={description}
                        disabled={!can.update}
                        placeholder="Add a more detailed description…"
                        className="min-h-[120px] resize-y text-sm"
                        onChange={(e) => setDescription(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setDescription(card.description ?? '')
                            setEditingDesc(false)
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className={pm.btnSm}
                          onClick={() => {
                            setEditingDesc(false)
                            if (description !== (card.description ?? '')) {
                              saveField({ description }, { description })
                            }
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!can.update}
                      onClick={() => can.update && setEditingDesc(true)}
                      className={`w-full rounded-lg px-3 py-3 text-left text-sm whitespace-pre-wrap transition ${
                        card.description
                          ? 'hover:bg-muted/50'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {card.description || 'Add a more detailed description…'}
                    </button>
                  )}
                </div>
              </section>

              {/* Checklists */}
              {(card.checklists ?? []).map((cl: Checklist) => {
                const done = cl.items.filter((i) => i.is_complete).length
                const total = cl.items.length
                const pct = total ? Math.round((done / total) * 100) : 0
                return (
                  <section key={cl.id}>
                    <div className="mb-2 flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-muted-foreground" />
                      <h3 className="flex-1 text-sm font-semibold">{cl.title}</h3>
                      {can.delete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground"
                          onClick={() => removeChecklist(cl.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                    <div className="ml-6 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-8 text-[11px] text-muted-foreground">{pct}%</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full transition-all duration-300 ${pm.progress}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <ul className="space-y-0.5">
                        {cl.items.map((item) => (
                          <li
                            key={item.id}
                            className="group flex items-start gap-2 rounded-md px-1 py-1.5 hover:bg-muted/50"
                          >
                            <Checkbox
                              checked={item.is_complete}
                              disabled={!can.update}
                              className="mt-0.5"
                              onCheckedChange={(checked) =>
                                toggleItem(cl.id, item.id, !!checked)
                              }
                            />
                            <span
                              className={`flex-1 text-sm leading-snug ${
                                item.is_complete
                                  ? 'text-muted-foreground line-through'
                                  : ''
                              }`}
                            >
                              {item.title}
                            </span>
                            {can.delete && (
                              <button
                                type="button"
                                className="opacity-0 transition group-hover:opacity-100"
                                onClick={() => removeItem(cl.id, item.id)}
                              >
                                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-red-400" />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                      {can.create && (
                        <div className="pt-0.5">
                          {itemDrafts[cl.id] !== undefined ? (
                            <form
                              className="flex items-center gap-1.5"
                              onSubmit={(e) => {
                                e.preventDefault()
                                addChecklistItem(cl.id, itemDrafts[cl.id] ?? '')
                                setItemDrafts((d) => {
                                  const next = { ...d }
                                  delete next[cl.id]
                                  return next
                                })
                              }}
                            >
                              <Input
                                autoFocus
                                className="h-8 text-sm"
                                placeholder="Add an item"
                                value={itemDrafts[cl.id] ?? ''}
                                onChange={(e) =>
                                  setItemDrafts((d) => ({ ...d, [cl.id]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setItemDrafts((d) => {
                                      const next = { ...d }
                                      delete next[cl.id]
                                      return next
                                    })
                                  }
                                }}
                                onBlur={() => {
                                  if (!(itemDrafts[cl.id] ?? '').trim()) {
                                    setItemDrafts((d) => {
                                      const next = { ...d }
                                      delete next[cl.id]
                                      return next
                                    })
                                  }
                                }}
                              />
                              <Button
                                type="submit"
                                size="icon"
                                className={`h-8 w-8 shrink-0 ${pm.btnSm}`}
                                aria-label="Add item"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </form>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setItemDrafts((d) => ({ ...d, [cl.id]: '' }))}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                              aria-label="Add checklist item"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </section>
                )
              })}

              {/* Attachments — compact image grid */}
              {(card.attachments?.length ?? 0) > 0 && (
                <section>
                  <div className="mb-2 flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">Attachments</h3>
                    <span className="text-xs text-muted-foreground">
                      {card.attachments.length}
                    </span>
                  </div>
                  <div className="ml-6 flex flex-wrap gap-1.5">
                    {card.attachments.map((att) => (
                      <div key={att.id} className="h-14 w-14 shrink-0">
                        <AttachmentPreviewThumb
                          url={att.url}
                          name={att.original_name}
                          mime={att.mime}
                          onDelete={
                            can.delete
                              ? () => {
                                  setLocal((c) =>
                                    c
                                      ? {
                                          ...c,
                                          attachments: c.attachments.filter(
                                            (a) => a.id !== att.id,
                                          ),
                                          attachment_count: Math.max(
                                            0,
                                            c.attachment_count - 1,
                                          ),
                                        }
                                      : c,
                                  )
                                  pushActivity('card.attachment_removed', {
                                    name: att.original_name,
                                  })
                                  router.delete(
                                    `${base}/attachments/${att.id}`,
                                    quiet,
                                  )
                                }
                              : undefined
                          }
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Comments & activity — single feed */}
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Comments and activity</h3>
                </div>
                <div className="ml-6 space-y-4">
                  {can.create && (
                    <div className="flex gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-[11px] font-bold text-white">
                        {initials(auth?.user?.name ?? 'U')}
                      </span>
                      <div className="flex-1 space-y-2">
                        <Textarea
                          rows={2}
                          placeholder="Write a comment…"
                          value={comment}
                          className="text-sm"
                          onChange={(e) => setComment(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault()
                              postComment()
                            }
                          }}
                        />
                        {comment.trim() && (
                          <div className="flex justify-end">
                            <Button size="sm" className={pm.btnSm} onClick={() => postComment()}>
                              Save
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={`max-h-[220px] space-y-3 overflow-y-auto overscroll-contain pr-1 ${pmScroll}`}>
                    {[
                      ...card.comments.map((c) => ({
                        kind: 'comment' as const,
                        id: `c-${c.id}`,
                        at: c.created_at,
                        comment: c,
                      })),
                      ...(card.activities ?? [])
                        .filter((a) => a.action !== 'card.commented')
                        .map((a) => ({
                          kind: 'activity' as const,
                          id: `a-${a.id}`,
                          at: a.created_at,
                          userName: a.user?.name ?? 'System',
                          action: a.action,
                          meta: a.meta,
                        })),
                    ]
                      .sort((a, b) => {
                        const ta = a.at ? new Date(a.at).getTime() : 0
                        const tb = b.at ? new Date(b.at).getTime() : 0
                        return tb - ta
                      })
                      .map((entry) =>
                        entry.kind === 'comment' ? (
                          <div key={entry.id} className="space-y-2">
                            <div className="flex gap-2">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-[11px] font-bold text-white">
                                {initials(entry.comment.user?.name ?? 'U')}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-baseline gap-2">
                                  <span className="text-sm font-semibold">
                                    {entry.comment.user?.name ?? 'User'}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {entry.at ? new Date(entry.at).toLocaleString() : ''}
                                  </span>
                                </div>
                                {editingId === entry.comment.id ? (
                                  <div className="mt-1 space-y-2">
                                    <Textarea
                                      rows={2}
                                      autoFocus
                                      value={editBody}
                                      className="text-sm"
                                      onChange={(e) => setEditBody(e.target.value)}
                                    />
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingId(null)
                                          setEditBody('')
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        className={pm.btnSm}
                                        disabled={!editBody.trim()}
                                        onClick={() => saveEdit(entry.comment.id)}
                                      >
                                        Save
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap">
                                    {entry.comment.body}
                                  </div>
                                )}
                                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
                                  <button
                                    type="button"
                                    className={`inline-flex items-center gap-1 transition ${
                                      entry.comment.liked_by_me
                                        ? 'font-medium text-pink-500'
                                        : 'text-muted-foreground hover:text-pink-500'
                                    }`}
                                    onClick={() => toggleLike(entry.comment.id)}
                                  >
                                    <Heart
                                      className={`h-3.5 w-3.5 ${
                                        entry.comment.liked_by_me ? 'fill-pink-500' : ''
                                      }`}
                                    />
                                    {entry.comment.likes_count > 0
                                      ? entry.comment.likes_count
                                      : 'Like'}
                                  </button>
                                  {can.create && entry.comment.id > 0 && (
                                    <button
                                      type="button"
                                      className="text-muted-foreground hover:text-foreground"
                                      onClick={() => {
                                        setReplyTo(
                                          replyTo === entry.comment.id ? null : entry.comment.id,
                                        )
                                        setReplyBody('')
                                        setEditingId(null)
                                      }}
                                    >
                                      Reply
                                    </button>
                                  )}
                                  {isMine(entry.comment) && entry.comment.id > 0 && editingId !== entry.comment.id && (
                                    <>
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                        onClick={() => startEdit(entry.comment)}
                                      >
                                        <Pencil className="h-3 w-3" />
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-red-500"
                                        onClick={() => requestDeleteComment(entry.comment.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>

                                {(entry.comment.replies?.length ?? 0) > 0 && (
                                  <div className="mt-2 space-y-2 border-l-2 border-border pl-3">
                                    {entry.comment.replies!.map((reply) => (
                                      <div key={reply.id} className="flex gap-2">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                                          {initials(reply.user?.name ?? 'U')}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex flex-wrap items-baseline gap-2">
                                            <span className="text-xs font-semibold">
                                              {reply.user?.name ?? 'User'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                              {reply.created_at
                                                ? new Date(reply.created_at).toLocaleString()
                                                : ''}
                                            </span>
                                          </div>
                                          {editingId === reply.id ? (
                                            <div className="mt-1 space-y-2">
                                              <Textarea
                                                rows={2}
                                                autoFocus
                                                value={editBody}
                                                className="text-xs"
                                                onChange={(e) => setEditBody(e.target.value)}
                                              />
                                              <div className="flex justify-end gap-2">
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-7 text-xs"
                                                  onClick={() => {
                                                    setEditingId(null)
                                                    setEditBody('')
                                                  }}
                                                >
                                                  Cancel
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  className={`h-7 text-xs ${pm.btnSm}`}
                                                  disabled={!editBody.trim()}
                                                  onClick={() => saveEdit(reply.id)}
                                                >
                                                  Save
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="mt-0.5 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs whitespace-pre-wrap">
                                              {reply.body}
                                            </div>
                                          )}
                                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                                            <button
                                              type="button"
                                              className={`inline-flex items-center gap-1 ${
                                                reply.liked_by_me
                                                  ? 'font-medium text-pink-500'
                                                  : 'text-muted-foreground hover:text-pink-500'
                                              }`}
                                              onClick={() => toggleLike(reply.id)}
                                            >
                                              <Heart
                                                className={`h-3 w-3 ${
                                                  reply.liked_by_me ? 'fill-pink-500' : ''
                                                }`}
                                              />
                                              {reply.likes_count > 0 ? reply.likes_count : 'Like'}
                                            </button>
                                            {isMine(reply) && reply.id > 0 && editingId !== reply.id && (
                                              <>
                                                <button
                                                  type="button"
                                                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                                  onClick={() => startEdit(reply)}
                                                >
                                                  <Pencil className="h-3 w-3" />
                                                  Edit
                                                </button>
                                                <button
                                                  type="button"
                                                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-red-500"
                                                  onClick={() => requestDeleteComment(reply.id)}
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                  Delete
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {replyTo === entry.comment.id && can.create && (
                                  <div className="mt-2 space-y-2">
                                    <Textarea
                                      rows={2}
                                      autoFocus
                                      placeholder={`Reply to ${entry.comment.user?.name ?? 'comment'}…`}
                                      value={replyBody}
                                      className="text-sm"
                                      onChange={(e) => setReplyBody(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                          e.preventDefault()
                                          postComment(entry.comment.id)
                                        }
                                      }}
                                    />
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setReplyTo(null)
                                          setReplyBody('')
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        className={pm.btnSm}
                                        disabled={!replyBody.trim()}
                                        onClick={() => postComment(entry.comment.id)}
                                      >
                                        Reply
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div key={entry.id} className="flex gap-2">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                              {initials(entry.userName)}
                            </span>
                            <p className="pt-1.5 text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">{entry.userName}</span>{' '}
                              <ActivityMessage action={entry.action} meta={entry.meta} />
                              {entry.at ? (
                                <span className="text-muted-foreground/80">
                                  {' '}
                                  · {new Date(entry.at).toLocaleString()}
                                </span>
                              ) : null}
                            </p>
                          </div>
                        ),
                      )}
                  </div>
                </div>
              </section>
            </div>

            {/* Right actions — Trello style */}
            <aside className={`shrink-0 space-y-3 overflow-y-auto border-t border-border px-4 py-4 lg:border-t-0 lg:border-l lg:border-border ${pmScroll}`}>
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Add to card
              </p>
              <div className="space-y-1.5">
                <LabelsPopover
                  boardLabels={boardLabels}
                  selected={card.labels}
                  canCreate={can.create}
                  disabled={!can.update && !can.create}
                  onToggle={toggleLabel}
                  onCreate={(name, color) => {
                    router.post(
                      `/organization/projects/${boardId}/labels`,
                      { name, color, card: card.id },
                      boardPartial,
                    )
                  }}
                  trigger={
                    <button
                      type="button"
                      disabled={!can.update && !can.create}
                      className="flex w-full items-center gap-2 rounded-md bg-muted px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-muted/80 disabled:opacity-40"
                    >
                      <Tag className="h-4 w-4 shrink-0 opacity-80" />
                      Labels
                    </button>
                  }
                />

                <MembersPopover
                  assignableUsers={assignableUsers}
                  selected={card.members}
                  disabled={!can.update}
                  onToggle={toggleMember}
                  trigger={
                    <button
                      type="button"
                      disabled={!can.update}
                      className="flex w-full items-center gap-2 rounded-md bg-muted px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-muted/80 disabled:opacity-40"
                    >
                      <UserPlus className="h-4 w-4 shrink-0 opacity-80" />
                      Members
                    </button>
                  }
                />

                <ChecklistPopover
                  disabled={!can.create && !can.update}
                  canCreate={can.create}
                  checklists={card.checklists.map((cl) => ({
                    id: cl.id,
                    title: cl.title,
                    items: cl.items.map((it) => ({
                      id: it.id,
                      title: it.title,
                      is_complete: it.is_complete,
                    })),
                  }))}
                  onAdd={(title) => {
                    const tempId = -Date.now()
                    setLocal((c) =>
                      c
                        ? {
                            ...c,
                            checklists: [
                              ...c.checklists,
                              {
                                id: tempId,
                                title,
                                position: c.checklists.length,
                                items: [],
                              },
                            ],
                          }
                        : c,
                    )
                    pushActivity('checklist.created', { title })
                    router.post(`${base}/checklists`, { title }, quiet)
                  }}
                  onAddItem={
                    can.create
                      ? (checklistId, title) => addChecklistItem(checklistId, title)
                      : undefined
                  }
                  onToggleItem={
                    can.update
                      ? (checklistId, itemId, checked) =>
                          toggleItem(checklistId, itemId, checked)
                      : undefined
                  }
                  trigger={
                    <button
                      type="button"
                      disabled={!can.create && !can.update}
                      className="flex w-full items-center gap-2 rounded-md bg-muted px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-muted/80 disabled:opacity-40"
                    >
                      <CheckSquare className="h-4 w-4 shrink-0 opacity-80" />
                      Checklist
                    </button>
                  }
                />

                <DatesPopover
                  value={dueAt}
                  disabled={!can.update}
                  onChange={(v) => saveDue(v)}
                  onRemove={() => saveDue('')}
                  trigger={
                    <button
                      type="button"
                      disabled={!can.update}
                      className="flex w-full items-center gap-2 rounded-md bg-muted px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-muted/80 disabled:opacity-40"
                    >
                      <Calendar className="h-4 w-4 shrink-0 opacity-80" />
                      Dates
                    </button>
                  }
                />

                <AttachmentPopover
                  disabled={!can.create}
                  uploading={uploadingFile}
                  onPickFile={(file) => {
                    setUploadingFile(true)
                    const tempId = -Date.now()
                    const previewUrl = URL.createObjectURL(file)
                    setLocal((c) =>
                      c
                        ? {
                            ...c,
                            attachments: [
                              {
                                id: tempId,
                                original_name: file.name,
                                mime: file.type || null,
                                size: file.size,
                                url: previewUrl,
                                created_at: new Date().toISOString(),
                                user: auth?.user
                                  ? { id: auth.user.id, name: auth.user.name }
                                  : null,
                              },
                              ...c.attachments,
                            ],
                            attachment_count: c.attachment_count + 1,
                          }
                        : c,
                    )
                    pushActivity('card.attachment_added', { name: file.name })
                    router.post(
                      `${base}/attachments`,
                      { file },
                      {
                        forceFormData: true,
                        ...quiet,
                        onFinish: () => setUploadingFile(false),
                      },
                    )
                  }}
                  trigger={
                    <button
                      type="button"
                      disabled={!can.create}
                      className="flex w-full items-center gap-2 rounded-md bg-muted px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-muted/80 disabled:opacity-40"
                    >
                      <Paperclip className="h-4 w-4 shrink-0 opacity-80" />
                      Attachment
                    </button>
                  }
                />

                <CoverPopover
                  current={card.cover_color}
                  colors={coverColors}
                  colorClass={labelColors}
                  disabled={!can.update}
                  onSelect={(c) => setCover(c)}
                  onRemove={() => setCover(null)}
                  trigger={
                    <button
                      type="button"
                      disabled={!can.update}
                      className="flex w-full items-center gap-2 rounded-md bg-muted px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-muted/80 disabled:opacity-40"
                    >
                      <ImageIcon className="h-4 w-4 shrink-0 opacity-80" />
                      Cover
                    </button>
                  }
                />
              </div>

              {can.delete && (
                <div className="border-t border-border pt-3">
                  <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Actions
                  </p>
                  <ActionBtn
                    icon={Archive}
                    label="Archive"
                    onClick={() => setArchiveConfirmOpen(true)}
                  />
                </div>
              )}
            </aside>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog
      open={deleteCommentId != null}
      onOpenChange={(open) => {
        if (!open) setDeleteCommentId(null)
      }}
    >
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete comment?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove your comment. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={confirmDeleteComment}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Archive card?</AlertDialogTitle>
          <AlertDialogDescription>
            Archive “{card.title}”? You can restore it later if needed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              setArchiveConfirmOpen(false)
              router.post(`${base}/archive`, {}, {
                ...boardPartial,
                onSuccess: () => onClose(),
              })
            }}
          >
            Archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
