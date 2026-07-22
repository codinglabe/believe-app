import React, { useMemo, useRef, useState } from 'react'
import { Check, Plus, Search, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { labelColors, pm } from '../theme'
import type { ProjectLabel, ProjectMember } from '../types'

const scrollCls =
  '[scrollbar-width:thin] [scrollbar-color:rgb(147_51_234_/_0.45)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-500/70 [&::-webkit-scrollbar-thumb]:to-blue-500/70'

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function PopoverChrome({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col">
      <div className="relative flex items-center justify-center border-b border-border px-3 py-2.5">
        <h4 className="text-sm font-semibold">{title}</h4>
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

type MembersPopoverProps = {
  assignableUsers: ProjectMember[]
  selected: ProjectMember[]
  disabled?: boolean
  onToggle: (user: ProjectMember) => void
  trigger: React.ReactNode
}

export function MembersPopover({
  assignableUsers,
  selected,
  disabled,
  onToggle,
  trigger,
}: MembersPopoverProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return assignableUsers
    return assignableUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(needle) ||
        (u.email ?? '').toLowerCase().includes(needle),
    )
  }, [assignableUsers, q])

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQ('')
      }}
    >
      <PopoverTrigger asChild disabled={disabled}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-[304px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <PopoverChrome title="Members" onClose={() => setOpen(false)}>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search members"
              className="h-9 pl-8 text-sm"
            />
          </div>
          <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Board members
          </p>
          <div className={`max-h-56 space-y-0.5 overflow-y-auto ${scrollCls}`}>
            {filtered.length === 0 ? (
              <p className="px-1 py-3 text-center text-xs text-muted-foreground">No members found</p>
            ) : (
              filtered.map((u) => {
                const on = selected.some((m) => m.id === u.id)
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => onToggle(u)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-[11px] font-bold text-white">
                      {initials(u.name)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{u.name}</span>
                    {on && <Check className="h-4 w-4 shrink-0 text-emerald-500" />}
                  </button>
                )
              })
            )}
          </div>
        </PopoverChrome>
      </PopoverContent>
    </Popover>
  )
}

type LabelsPopoverProps = {
  boardLabels: ProjectLabel[]
  selected: ProjectLabel[]
  canCreate?: boolean
  disabled?: boolean
  onToggle: (label: ProjectLabel) => void
  onCreate: (name: string, color: string) => void
  trigger: React.ReactNode
}

export function LabelsPopover({
  boardLabels,
  selected,
  canCreate,
  disabled,
  onToggle,
  onCreate,
  trigger,
}: LabelsPopoverProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('purple')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return boardLabels
    return boardLabels.filter((l) => l.name.toLowerCase().includes(needle))
  }, [boardLabels, q])

  const reset = () => {
    setQ('')
    setCreating(false)
    setName('')
    setColor('purple')
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <PopoverTrigger asChild disabled={disabled}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-[304px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <PopoverChrome
          title={creating ? 'Create label' : 'Labels'}
          onClose={() => {
            if (creating) setCreating(false)
            else setOpen(false)
          }}
        >
          {!creating ? (
            <>
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search labels"
                  className="h-9 pl-8 text-sm"
                />
              </div>
              <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Labels
              </p>
              <div className={`mb-3 max-h-52 space-y-1 overflow-y-auto ${scrollCls}`}>
                {filtered.length === 0 ? (
                  <p className="px-1 py-3 text-center text-xs text-muted-foreground">No labels</p>
                ) : (
                  filtered.map((label) => {
                    const on = selected.some((l) => l.id === label.id)
                    return (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => onToggle(label)}
                        className="flex w-full items-center gap-2 rounded-md p-1 text-left hover:bg-muted/60"
                      >
                        <span
                          className={`flex h-8 min-w-0 flex-1 items-center truncate rounded-md px-2.5 text-xs font-semibold text-white ${
                            labelColors[label.color] ?? 'bg-purple-500'
                          }`}
                          title={label.name}
                        >
                          {label.name}
                        </span>
                        <span className="flex h-6 w-6 items-center justify-center">
                          {on && <Check className="h-4 w-4 text-foreground" />}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
              {canCreate && (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 w-full text-xs"
                  onClick={() => setCreating(true)}
                >
                  Create a new label
                </Button>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div
                className={`flex h-10 items-center justify-center truncate rounded-md px-3 text-sm font-semibold text-white ${
                  labelColors[color] ?? 'bg-purple-500'
                }`}
              >
                <span className="truncate">{name.trim() || 'Label preview'}</span>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Title
                </label>
                <Input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Label name"
                  className="h-9 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && name.trim()) {
                      onCreate(name.trim(), color)
                      setCreating(false)
                      setName('')
                    }
                  }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Select a color
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {Object.keys(labelColors).map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`h-8 rounded-md ${labelColors[c]} ${
                        color === c ? 'ring-2 ring-ring ring-offset-1 ring-offset-popover' : ''
                      }`}
                      onClick={() => setColor(c)}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className={pm.btnSm}
                  disabled={!name.trim()}
                  onClick={() => {
                    if (!name.trim()) return
                    onCreate(name.trim(), color)
                    setCreating(false)
                    setName('')
                    setColor('purple')
                  }}
                >
                  Create
                </Button>
              </div>
            </div>
          )}
        </PopoverChrome>
      </PopoverContent>
    </Popover>
  )
}

type ChecklistPopoverProps = {
  disabled?: boolean
  canCreate?: boolean
  checklists?: Array<{
    id: number
    title: string
    items: Array<{ id: number; title: string; is_complete: boolean }>
  }>
  onAdd: (title: string) => void
  onAddItem?: (checklistId: number, title: string) => void
  onToggleItem?: (checklistId: number, itemId: number, checked: boolean) => void
  trigger: React.ReactNode
}

export function ChecklistPopover({
  disabled,
  canCreate = true,
  checklists = [],
  onAdd,
  onAddItem,
  onToggleItem,
  trigger,
}: ChecklistPopoverProps) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [addingItemFor, setAddingItemFor] = useState<number | null>(null)
  const [itemTitle, setItemTitle] = useState('')

  const submitChecklist = () => {
    const t = title.trim()
    if (!t) return
    onAdd(t)
    setTitle('')
    setCreating(false)
  }

  const submitItem = (checklistId: number) => {
    const t = itemTitle.trim()
    if (!t || !onAddItem) return
    onAddItem(checklistId, t)
    setItemTitle('')
    setAddingItemFor(null)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setTitle('')
          setCreating(false)
          setAddingItemFor(null)
          setItemTitle('')
        }
      }}
    >
      <PopoverTrigger asChild disabled={disabled}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <PopoverChrome title="Checklist" onClose={() => setOpen(false)}>
          <div className={`mb-3 max-h-64 space-y-3 overflow-y-auto ${scrollCls}`}>
            {checklists.length === 0 && !creating ? (
              <p className="py-2 text-center text-xs text-muted-foreground">No checklists yet</p>
            ) : (
              checklists.map((cl) => {
                const done = cl.items.filter((i) => i.is_complete).length
                const total = cl.items.length
                return (
                  <div key={cl.id} className="rounded-md border border-border bg-muted/30 p-2">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold">{cl.title}</p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {done}/{total}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {cl.items.map((item) => (
                        <li key={item.id} className="flex items-start gap-2 text-xs">
                          <button
                            type="button"
                            disabled={!onToggleItem}
                            onClick={() =>
                              onToggleItem?.(cl.id, item.id, !item.is_complete)
                            }
                            className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border ${
                              item.is_complete
                                ? 'border-purple-500 bg-gradient-to-br from-purple-600 to-blue-600 text-white'
                                : 'border-muted-foreground/40'
                            }`}
                          >
                            {item.is_complete && <Check className="h-2.5 w-2.5" />}
                          </button>
                          <span
                            className={
                              item.is_complete ? 'text-muted-foreground line-through' : ''
                            }
                          >
                            {item.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {onAddItem && (
                      <div className="mt-1.5">
                        {addingItemFor === cl.id ? (
                          <form
                            className="flex gap-1"
                            onSubmit={(e) => {
                              e.preventDefault()
                              submitItem(cl.id)
                            }}
                          >
                            <Input
                              autoFocus
                              value={itemTitle}
                              onChange={(e) => setItemTitle(e.target.value)}
                              placeholder="Add an item"
                              className="h-7 text-xs"
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setAddingItemFor(null)
                                  setItemTitle('')
                                }
                              }}
                            />
                            <Button type="submit" size="icon" className={`h-7 w-7 shrink-0 ${pm.btnSm}`}>
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setAddingItemFor(cl.id)
                              setItemTitle('')
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Add item"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {canCreate &&
            (creating ? (
              <div className="space-y-2 border-t border-border pt-3">
                <Input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Checklist title"
                  className="h-9 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      submitChecklist()
                    }
                    if (e.key === 'Escape') {
                      setCreating(false)
                      setTitle('')
                    }
                  }}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setCreating(false)
                      setTitle('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className={pm.btnSm}
                    disabled={!title.trim()}
                    onClick={submitChecklist}
                  >
                    Add
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Add checklist"
              >
                <Plus className="h-4 w-4" />
                Add checklist
              </button>
            ))}
        </PopoverChrome>
      </PopoverContent>
    </Popover>
  )
}

type DatesPopoverProps = {
  value: string
  disabled?: boolean
  onChange: (value: string) => void
  onRemove: () => void
  trigger: React.ReactNode
}

export function DatesPopover({ value, disabled, onChange, onRemove, trigger }: DatesPopoverProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setDraft(value)
      }}
    >
      <PopoverTrigger asChild disabled={disabled}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-[304px] p-0" align="start">
        <PopoverChrome title="Dates" onClose={() => setOpen(false)}>
          <label className="mb-1 block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Due date
          </label>
          <Input
            type="datetime-local"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="mb-3 h-9 text-sm"
          />
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="sm"
              className={`w-full ${pm.btnSm}`}
              disabled={!draft}
              onClick={() => {
                if (!draft) return
                onChange(draft)
                setOpen(false)
              }}
            >
              Save
            </Button>
            {value && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => {
                  onRemove()
                  setDraft('')
                  setOpen(false)
                }}
              >
                Remove
              </Button>
            )}
          </div>
        </PopoverChrome>
      </PopoverContent>
    </Popover>
  )
}

function isImageAttachment(mime: string | null, name: string) {
  if (mime?.startsWith('image/')) return true
  return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(name)
}

export { isImageAttachment }

/** Compact square tile for attachment grids; click opens preview popover. */
export function AttachmentPreviewThumb({
  url,
  name,
  mime,
  onDelete,
}: {
  url: string
  name: string
  mime: string | null
  onDelete?: () => void
}) {
  const [open, setOpen] = useState(false)
  const isImage = isImageAttachment(mime, name)
  const ext = name.split('.').pop()?.slice(0, 4) ?? 'FILE'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="group relative h-full w-full overflow-hidden rounded-md bg-muted">
        <PopoverTrigger asChild>
          <button
            type="button"
            className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500/50"
            aria-label={`Preview ${name}`}
          >
            {isImage ? (
              <img src={url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center gap-0.5 px-0.5 text-center">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  {ext}
                </span>
              </span>
            )}
          </button>
        </PopoverTrigger>
        {onDelete && (
          <button
            type="button"
            className="absolute right-0.5 top-0.5 z-10 flex h-5 w-5 items-center justify-center rounded bg-black/55 text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-600"
            aria-label={`Delete ${name}`}
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <PopoverContent className="w-[min(90vw,320px)] p-0" align="start">
        <PopoverChrome title={name} onClose={() => setOpen(false)}>
          {isImage ? (
            <div className="overflow-hidden rounded-md bg-muted/40">
              <img
                src={url}
                alt={name}
                className="max-h-52 w-full object-contain"
              />
            </div>
          ) : (
            <p className="py-2 text-center text-xs text-muted-foreground">
              {ext.toUpperCase()} file
            </p>
          )}
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block text-center text-xs font-medium text-purple-600 hover:underline dark:text-purple-400"
          >
            Open full size
          </a>
        </PopoverChrome>
      </PopoverContent>
    </Popover>
  )
}

type AttachmentPopoverProps = {
  disabled?: boolean
  uploading?: boolean
  onPickFile: (file: File) => void
  trigger: React.ReactNode
}

export function AttachmentPopover({
  disabled,
  uploading,
  onPickFile,
  trigger,
}: AttachmentPopoverProps) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-[304px] p-0" align="start">
        <PopoverChrome title="Attach" onClose={() => setOpen(false)}>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              onPickFile(file)
              e.target.value = ''
              setOpen(false)
            }}
          />
          <Button
            type="button"
            variant="secondary"
            className="h-9 w-full text-sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? 'Uploading…' : 'Choose a file'}
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Tip: you can also paste or drop files onto cards later.
          </p>
        </PopoverChrome>
      </PopoverContent>
    </Popover>
  )
}

type CoverPopoverProps = {
  current: string | null
  colors: readonly string[]
  colorClass: Record<string, string>
  disabled?: boolean
  onSelect: (color: string) => void
  onRemove: () => void
  trigger: React.ReactNode
}

export function CoverPopover({
  current,
  colors,
  colorClass,
  disabled,
  onSelect,
  onRemove,
  trigger,
}: CoverPopoverProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-[304px] p-0" align="start">
        <PopoverChrome title="Cover" onClose={() => setOpen(false)}>
          <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Colors
          </p>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                className={`h-12 rounded-md ${colorClass[c] ?? ''} ${
                  current === c ? 'ring-2 ring-ring ring-offset-1 ring-offset-popover' : ''
                }`}
                onClick={() => {
                  onSelect(c)
                  setOpen(false)
                }}
                aria-label={c}
              />
            ))}
          </div>
          {current && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => {
                onRemove()
                setOpen(false)
              }}
            >
              Remove cover
            </Button>
          )}
        </PopoverChrome>
      </PopoverContent>
    </Popover>
  )
}
