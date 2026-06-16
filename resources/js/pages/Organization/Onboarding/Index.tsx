"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { Head, Link, router, useForm, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Hash,
  IdCard,
  Landmark,
  Loader2,
  Mail,
  MapPin,
  PenLine,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  FileDown,
  Briefcase,
  User,
  Users,
} from "lucide-react"
import { toast } from "react-hot-toast"
import { cn } from "@/lib/utils"
import { ConfirmationModal } from "@/components/confirmation-modal"

const BRAND = {
  from: "#9333ea",
  to: "#2563eb",
  fromMuted: "rgba(147,51,234,0.15)",
  toMuted: "rgba(37,99,235,0.1)",
}

type OnboardingItem = {
  id: string
  label: string
  description: string
  benefit: string
  type: "upload" | "form" | "board_members"
  storage_path: string | null
  route: string
  connected: boolean
  submitted_at?: string | null
  file_name?: string | null
  board_member_count?: number | null
  board_member_minimum?: number | null
}

type OnboardingBoardMember = {
  id: number
  name: string
  email: string
  position: string
  is_active: boolean
  appointed_on: string | null
}

type PageProps = {
  items: OnboardingItem[]
  percent: number
  completed: number
  total: number
  authorizedSigner: {
    full_name?: string
    title?: string
    email?: string
    phone?: string
    address?: string
  } | null
  storageHref: string
  filingPdfUrl: string
  boardMembers: OnboardingBoardMember[]
}

const DOCUMENT_ICONS: Record<string, typeof FileText> = {
  articles_of_incorporation: Building2,
  irs_determination_letter: ShieldCheck,
  ein_letter: Hash,
  board_member_list: Users,
  bank_verification: Landmark,
  government_id_signer: IdCard,
}

function getCsrfToken(): string {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? ""
}

function uploadOnboardingDocument(
  documentType: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append("file", file)
    formData.append("document_type", documentType)

    xhr.open("POST", route("governance.onboarding.upload"))
    xhr.setRequestHeader("X-CSRF-TOKEN", getCsrfToken())
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest")
    xhr.setRequestHeader("Accept", "application/json")

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
      }
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ success: data.success ?? true, message: data.message ?? "Uploaded." })
        } else {
          resolve({ success: false, message: data.message ?? "Upload failed." })
        }
      } catch {
        reject(new Error("Invalid server response"))
      }
    }

    xhr.onerror = () => reject(new Error("Network error"))
    xhr.send(formData)
  })
}

function ChecklistItem({
  item,
  index,
  onNavigate,
}: {
  item: OnboardingItem
  index: number
  onNavigate: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.id)}
      className={cn(
        "w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
        item.connected
          ? "bg-emerald-50/80 dark:bg-emerald-950/30 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/50"
          : "hover:bg-purple-50/60 dark:hover:bg-purple-950/20"
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          item.connected
            ? "bg-emerald-500 text-white"
            : "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
        )}
      >
        {item.connected ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm font-medium leading-snug truncate",
            item.connected ? "text-emerald-800 dark:text-emerald-200" : "text-foreground"
          )}
          title={item.label}
        >
          {item.label}
        </span>
        <span className="text-xs text-muted-foreground capitalize">{item.type.replace("_", " ")}</span>
      </span>
    </button>
  )
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

/** Short label for very long upload names (full name still in title tooltip). */
function shortenFileName(name: string, maxLen = 56): string {
  if (name.length <= maxLen) return name
  const dot = name.lastIndexOf(".")
  const ext = dot > 0 ? name.slice(dot) : ""
  const base = ext ? name.slice(0, dot) : name
  const budget = maxLen - ext.length - 1
  if (budget < 12) return `${name.slice(0, maxLen - 1)}…`
  const head = Math.ceil(budget * 0.55)
  const tail = budget - head
  return `${base.slice(0, head)}…${base.slice(-tail)}${ext}`
}

const CHECKLIST_TOP_PX = 88 // below fixed app header (4rem) + small gap

/**
 * CSS sticky breaks inside app shell (overflow-x-auto on ancestors).
 * Pin only after the checklist would scroll past the header — not on page load.
 */
function StickyChecklistAside({ children }: { children: ReactNode }) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [isPinned, setIsPinned] = useState(false)
  const [dims, setDims] = useState({ left: 0, width: 300, height: 0 })

  const sync = useCallback(() => {
    const anchor = anchorRef.current
    const panel = panelRef.current
    if (!anchor || !panel) return

    if (!window.matchMedia("(min-width: 1024px)").matches) {
      setIsPinned(false)
      return
    }

    const rect = anchor.getBoundingClientRect()
    const height = panel.offsetHeight

    setDims({
      left: rect.left,
      width: rect.width,
      height,
    })

    // Pin only once the natural position would scroll under the header
    setIsPinned(rect.top <= CHECKLIST_TOP_PX)
  }, [])

  useEffect(() => {
    sync()
    window.addEventListener("resize", sync)
    window.addEventListener("scroll", sync, { passive: true })
    const anchor = anchorRef.current
    const panel = panelRef.current
    const ro = new ResizeObserver(sync)
    if (anchor) ro.observe(anchor)
    if (panel) ro.observe(panel)

    return () => {
      window.removeEventListener("resize", sync)
      window.removeEventListener("scroll", sync)
      ro.disconnect()
    }
  }, [sync, children])

  return (
    <aside
      ref={anchorRef}
      className="w-full shrink-0 lg:w-[300px] xl:w-[320px]"
      style={isPinned ? { height: dims.height } : undefined}
    >
      <div
        ref={panelRef}
        className={cn(
          "max-w-full overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm",
          isPinned && "fixed z-20 shadow-md"
        )}
        style={
          isPinned
            ? {
                top: CHECKLIST_TOP_PX,
                left: dims.left,
                width: dims.width,
              }
            : undefined
        }
      >
        {children}
      </div>
    </aside>
  )
}

function BoardMemberListCard({
  item,
  index,
  boardMembers,
  filingPdfUrl,
  onUploaded,
}: {
  item: OnboardingItem
  index: number
  boardMembers: OnboardingBoardMember[]
  filingPdfUrl: string
  onUploaded: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const count = item.board_member_count ?? 0
  const minimum = item.board_member_minimum ?? 2
  const remaining = Math.max(minimum - count, 0)
  const activeMembers = boardMembers.filter((m) => m.is_active)
  const hasUploadedDoc = Boolean(item.file_name)
  const storageLabel = item.storage_path?.replace("/Governance/", "") ?? ""

  const countLabel =
    count === 0
      ? "No active board members on file yet"
      : count < minimum
        ? `${count} active board member${count === 1 ? "" : "s"} — add ${remaining} more, or upload a board list document`
        : `${count} active board member${count === 1 ? "" : "s"} on file`

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true)
      setProgress(0)
      try {
        const result = await uploadOnboardingDocument(item.id, file, setProgress)
        if (result.success) {
          toast.success(result.message)
          onUploaded()
        } else {
          toast.error(result.message)
        }
      } catch {
        toast.error("Upload failed. Please try again.")
      } finally {
        setUploading(false)
        setProgress(0)
        setDragOver(false)
      }
    },
    [item.id, onUploaded]
  )

  const handleDelete = useCallback(() => {
    setDeleting(true)
    router.delete(route("governance.onboarding.document.destroy"), {
      data: { document_type: item.id },
      preserveScroll: true,
      onError: () => toast.error("Could not remove document. Please try again."),
      onFinish: () => setDeleting(false),
    })
  }, [item.id])

  return (
    <article
      id={item.id}
      className={cn(
        "group scroll-mt-28 min-w-0 max-w-full overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md",
        item.connected
          ? "border-emerald-200/80 dark:border-emerald-800/50"
          : "border-border"
      )}
    >
      <div className="flex min-w-0 items-stretch">
        <div
          className={cn(
            "hidden sm:flex w-1.5 shrink-0",
            item.connected ? "bg-emerald-500" : "bg-gradient-to-b from-purple-500 to-blue-500"
          )}
        />
        <div className="min-w-0 flex-1 overflow-hidden p-5 md:p-6 space-y-5">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-1 gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm",
                  item.connected
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                    : "text-white"
                )}
                style={
                  item.connected
                    ? undefined
                    : { background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }
                }
              >
                {item.connected ? <CheckCircle2 className="h-6 w-6" /> : <Users className="h-6 w-6" />}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Step {index + 1}
                  </span>
                  {item.connected && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      Complete
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-foreground mt-0.5 break-words">{item.label}</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed break-words">{item.description}</p>
                <p className="mt-2 text-sm text-muted-foreground">{countLabel}</p>
                {storageLabel && (
                  <p className="mt-2 flex max-w-full min-w-0 items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
                    <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 truncate" title={`Governance Storage / ${storageLabel}`}>
                      Governance Storage / {storageLabel}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0 self-start">
              <Link href={route("board-members.index")}>
                <Button
                  variant="outline"
                  className="gap-2 w-full sm:w-auto border-purple-200 dark:border-purple-800/50"
                >
                  <Users className="h-4 w-4" />
                  {activeMembers.length > 0 ? "Manage board" : "Add members"}
                </Button>
              </Link>
              <a
                href={filingPdfUrl}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow-md transition-all",
                  activeMembers.length > 0
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    : "bg-muted text-muted-foreground pointer-events-none opacity-60"
                )}
                aria-disabled={activeMembers.length === 0}
                title={
                  activeMembers.length > 0
                    ? "Download board listing PDF for 501(c)(3) filing"
                    : "Add at least one active board member to generate PDF"
                }
              >
                <FileDown className="h-4 w-4" />
                PDF
              </a>
            </div>
          </div>

          {boardMembers.length > 0 ? (
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-semibold">Name</th>
                    <th className="px-4 py-2.5 font-semibold hidden sm:table-cell">Position</th>
                    <th className="px-4 py-2.5 font-semibold hidden md:table-cell">Email</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {boardMembers.map((member) => (
                    <tr key={member.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{member.name}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5 shrink-0" />
                          {member.position}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell truncate max-w-[200px]">
                        {member.email}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            member.is_active
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {member.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-purple-200/70 bg-purple-50/30 px-4 py-6 text-center dark:border-purple-800/40 dark:bg-purple-950/10">
              <Users className="mx-auto h-8 w-8 text-purple-400 mb-2" />
              <p className="text-sm text-muted-foreground">No board members yet.</p>
              <Link href={route("board-members.index")} className="mt-3 inline-block">
                <Button
                  size="sm"
                  className="gap-2 text-white"
                  style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
                >
                  <Plus className="h-4 w-4" />
                  Add board members
                </Button>
              </Link>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold mb-3">Board list document</p>
            <p className="text-xs text-muted-foreground mb-3">
              Generate the PDF above and upload it here, or upload your own board member list for Governance Storage.
            </p>

            {hasUploadedDoc ? (
              <div className="flex min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-4 py-3 dark:border-emerald-800/40 dark:bg-emerald-950/20">
                <FileText className="h-5 w-5 shrink-0 text-emerald-600" />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Document on file</p>
                  {item.file_name && (
                    <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-300/80 truncate" title={item.file_name}>
                      {shortenFileName(item.file_name)}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                  disabled={deleting || uploading}
                  onClick={() => setDeleteModalOpen(true)}
                  aria-label="Remove board list document"
                  title="Remove document"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <div className="mt-1">
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  aria-label="Upload board member list"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleFile(file)
                    e.target.value = ""
                  }}
                />
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(true)
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    const file = e.dataTransfer.files?.[0]
                    if (file) void handleFile(file)
                  }}
                  onClick={() => !uploading && inputRef.current?.click()}
                  className={cn(
                    "relative cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all",
                    dragOver
                      ? "border-purple-400 bg-purple-50/80 dark:border-purple-500 dark:bg-purple-950/30"
                      : "border-purple-200/70 bg-purple-50/30 hover:border-purple-300 hover:bg-purple-50/50 dark:border-purple-800/50 dark:bg-purple-950/10 dark:hover:border-purple-600"
                  )}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                      <p className="text-sm font-medium text-foreground">Uploading… {progress}%</p>
                      <Progress value={progress} className="h-2 w-full max-w-xs" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-md"
                        style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
                      >
                        <Upload className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        Drop board list here or <span className="text-purple-600 dark:text-purple-400">browse</span>
                      </p>
                      <p className="text-xs text-muted-foreground">PDF, DOC, XLS, CSV, or image — max 50 MB</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <ConfirmationModal
              isOpen={deleteModalOpen}
              onChange={setDeleteModalOpen}
              title="Remove board list document?"
              description={
                item.file_name
                  ? `"${item.file_name}" will be removed from Governance Storage. You can upload again or rely on your board roster if it meets the minimum.`
                  : "This document will be removed from Governance Storage."
              }
              confirmLabel="Remove document"
              cancelLabel="Keep document"
              isLoading={deleting}
              onConfirm={handleDelete}
            />
          </div>
        </div>
      </div>
    </article>
  )
}

function DocumentUploadCard({
  item,
  index,
  onUploaded,
}: {
  item: OnboardingItem
  index: number
  onUploaded: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const Icon = DOCUMENT_ICONS[item.id] ?? FileText

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true)
      setProgress(0)
      try {
        const result = await uploadOnboardingDocument(item.id, file, setProgress)
        if (result.success) {
          toast.success(result.message)
          onUploaded()
        } else {
          toast.error(result.message)
        }
      } catch {
        toast.error("Upload failed. Please try again.")
      } finally {
        setUploading(false)
        setProgress(0)
        setDragOver(false)
      }
    },
    [item.id, onUploaded]
  )

  const handleDelete = useCallback(() => {
    setDeleting(true)
    router.delete(route("governance.onboarding.document.destroy"), {
      data: { document_type: item.id },
      preserveScroll: true,
      onError: () => toast.error("Could not remove document. Please try again."),
      onFinish: () => setDeleting(false),
    })
  }, [item.id])

  const storageLabel = item.storage_path?.replace("/Governance/", "") ?? ""

  return (
    <article
      id={item.id}
      className={cn(
        "group scroll-mt-28 min-w-0 max-w-full overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md",
        item.connected
          ? "border-emerald-200/80 dark:border-emerald-800/50"
          : "border-border"
      )}
    >
      <div className="flex min-w-0 items-stretch">
        <div
          className={cn(
            "hidden sm:flex w-1.5 shrink-0",
            item.connected ? "bg-emerald-500" : "bg-gradient-to-b from-purple-500 to-blue-500"
          )}
        />
        <div className="min-w-0 flex-1 overflow-hidden p-5 md:p-6">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-1 gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm",
                  item.connected
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                    : "text-white"
                )}
                style={
                  item.connected
                    ? undefined
                    : { background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }
                }
              >
                {item.connected ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Step {index + 1}
                  </span>
                  {item.connected && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      Complete
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-foreground mt-0.5 break-words">{item.label}</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed break-words">{item.description}</p>
                {storageLabel && (
                  <p className="mt-2 flex max-w-full min-w-0 items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
                    <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 truncate" title={`Governance Storage / ${storageLabel}`}>
                      Governance Storage / {storageLabel}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {item.connected ? (
            <div className="mt-5">
              <div className="flex min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-4 py-3 dark:border-emerald-800/40 dark:bg-emerald-950/20">
                <FileText className="h-5 w-5 shrink-0 text-emerald-600" />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Document on file</p>
                  {item.file_name && (
                    <p
                      className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-300/80 truncate"
                      title={item.file_name}
                    >
                      {shortenFileName(item.file_name)}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                  disabled={deleting || uploading}
                  onClick={() => setDeleteModalOpen(true)}
                  aria-label={`Remove ${item.label}`}
                  title="Remove document"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
              <ConfirmationModal
                isOpen={deleteModalOpen}
                onChange={setDeleteModalOpen}
                title={`Remove ${item.label}?`}
                description={
                  item.file_name
                    ? `"${item.file_name}" will be permanently removed from Governance Storage. This step will be marked incomplete until you upload a new file.`
                    : `This document will be permanently removed from Governance Storage. This step will be marked incomplete until you upload a new file.`
                }
                confirmLabel="Remove document"
                cancelLabel="Keep document"
                isLoading={deleting}
                onConfirm={handleDelete}
              />
            </div>
          ) : (
            <div className="mt-5">
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                aria-label={`Upload ${item.label}`}
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleFile(file)
                  e.target.value = ""
                }}
              />
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  const file = e.dataTransfer.files?.[0]
                  if (file) void handleFile(file)
                }}
                onClick={() => !uploading && inputRef.current?.click()}
                className={cn(
                  "relative cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all",
                  dragOver
                    ? "border-purple-400 bg-purple-50/80 dark:border-purple-500 dark:bg-purple-950/30"
                    : "border-purple-200/70 bg-purple-50/30 hover:border-purple-300 hover:bg-purple-50/50 dark:border-purple-800/50 dark:bg-purple-950/10 dark:hover:border-purple-600"
                )}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    <p className="text-sm font-medium text-foreground">Uploading… {progress}%</p>
                    <Progress value={progress} className="h-2 w-full max-w-xs" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-md"
                      style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
                    >
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      Drop file here or <span className="text-purple-600 dark:text-purple-400">browse</span>
                    </p>
                    <p className="text-xs text-muted-foreground">PDF, DOC, XLS, CSV, or image — max 50 MB</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export default function OrganizationOnboardingIndex({
  items,
  percent,
  completed,
  total,
  authorizedSigner,
  storageHref,
  filingPdfUrl,
  boardMembers,
}: PageProps) {
  const { flash } = usePage().props as { flash?: { success?: string; error?: string } }

  const signerForm = useForm({
    full_name: authorizedSigner?.full_name ?? "",
    title: authorizedSigner?.title ?? "",
    email: authorizedSigner?.email ?? "",
    phone: authorizedSigner?.phone ?? "",
    address: authorizedSigner?.address ?? "",
  })

  const refresh = () => {
    router.reload({ only: ["items", "percent", "completed", "total", "authorizedSigner", "boardMembers"] })
  }

  const signerItem = items.find((i) => i.id === "authorized_signer")
  const boardMemberItem = items.find((i) => i.id === "board_member_list")
  const uploadItems = items.filter((i) => i.type === "upload")
  const isComplete = percent >= 100

  const breadcrumbs = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Organization onboarding", href: route("governance.onboarding.index") },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Organization onboarding" />

      <div className="w-full min-h-screen bg-background">
        {/* Hero */}
        <div
          className="border-b border-purple-200/80 dark:border-purple-500/20"
          style={{
            background: `linear-gradient(135deg, ${BRAND.fromMuted} 0%, rgba(147,51,234,0.18) 45%, rgba(37,99,235,0.12) 100%)`,
          }}
        >
          <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 md:py-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
                >
                  <ClipboardCheck className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-purple-600 dark:text-purple-400">
                    Required onboarding
                  </p>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">
                    <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      Organization compliance
                    </span>
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
                    Submit founding documents, tax letters, board governance, and signer verification. Files are
                    filed automatically in your Governance Storage folders.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 lg:min-w-[280px]">
                <div className="rounded-2xl border border-white/60 dark:border-purple-500/20 bg-white/70 dark:bg-neutral-950/40 backdrop-blur-sm px-5 py-4 shadow-sm">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Progress</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      {percent}%
                    </span>
                  </div>
                  <Progress value={percent} className="h-2.5" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {completed} of {total} requirements complete
                  </p>
                </div>
                <Link href={storageHref} className="shrink-0">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto h-full min-h-[52px] gap-2 border-purple-200 dark:border-purple-800/50 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Governance Storage
                  </Button>
                </Link>
              </div>
            </div>

            {isComplete && (
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 dark:border-emerald-800/50 dark:bg-emerald-950/30">
                <Sparkles className="h-5 w-5 text-emerald-600 shrink-0" />
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  All required onboarding items are complete. Your organization profile is ready for review.
                </p>
              </div>
            )}
          </div>
        </div>

        <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
          {flash?.success && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
              {flash.success}
            </div>
          )}
          {flash?.error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
              {flash.error}
            </div>
          )}

          <div className="flex min-w-0 max-w-full flex-col gap-8 overflow-x-hidden lg:flex-row lg:items-start">
            <StickyChecklistAside>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-3">
                Checklist
              </h2>
              <nav className="flex flex-col gap-1">
                {items.map((item, i) => (
                  <ChecklistItem key={item.id} item={item} index={i} onNavigate={scrollToSection} />
                ))}
              </nav>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>Remaining</span>
                  <span className="font-semibold text-foreground">{total - completed}</span>
                </div>
              </div>
            </StickyChecklistAside>

            <div className="flex min-w-0 max-w-full flex-1 flex-col gap-8 overflow-hidden">
              <section className="min-w-0 max-w-full overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <h2 className="text-lg font-semibold">Required documents</h2>
                  <span className="text-sm text-muted-foreground">({uploadItems.length} uploads)</span>
                </div>
                <div className="flex min-w-0 max-w-full flex-col gap-5">
                  {uploadItems.map((item, i) => (
                    <DocumentUploadCard key={item.id} item={item} index={i} onUploaded={refresh} />
                  ))}
                </div>
              </section>

              {boardMemberItem ? (
                <section className="min-w-0 max-w-full overflow-hidden">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <h2 className="text-lg font-semibold">Board governance</h2>
                  </div>
                  <BoardMemberListCard
                    item={boardMemberItem}
                    index={uploadItems.length}
                    boardMembers={boardMembers}
                    filingPdfUrl={filingPdfUrl}
                    onUploaded={refresh}
                  />
                </section>
              ) : null}

              <section
                id="authorized_signer"
                className={cn(
                  "scroll-mt-28 overflow-hidden rounded-2xl border bg-card shadow-sm",
                  signerItem?.connected
                    ? "border-emerald-200/80 dark:border-emerald-800/50"
                    : "border-border"
                )}
              >
                <div className="border-b border-border bg-muted/30 px-5 py-4 md:px-6 flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      signerItem?.connected
                        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40"
                        : "text-white"
                    )}
                    style={
                      signerItem?.connected
                        ? undefined
                        : { background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }
                    }
                  >
                    {signerItem?.connected ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <PenLine className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Authorized signer</h2>
                    <p className="text-sm text-muted-foreground">
                      Person legally authorized to sign for your organization
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    signerForm.post(route("governance.onboarding.authorized-signer"), {
                      preserveScroll: true,
                      onSuccess: () => {
                        toast.success("Authorized signer saved.")
                        refresh()
                      },
                    })
                  }}
                  className="p-5 md:p-6 grid gap-5 sm:grid-cols-2"
                >
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      Full name
                    </Label>
                    <Input
                      id="full_name"
                      value={signerForm.data.full_name}
                      onChange={(e) => signerForm.setData("full_name", e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title / role</Label>
                    <Input
                      id="title"
                      value={signerForm.data.title}
                      onChange={(e) => signerForm.setData("title", e.target.value)}
                      className="h-11"
                      placeholder="e.g. Executive Director"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={signerForm.data.email}
                      onChange={(e) => signerForm.setData("email", e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      value={signerForm.data.phone}
                      onChange={(e) => signerForm.setData("phone", e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="address" className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      Address <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="address"
                      value={signerForm.data.address}
                      onChange={(e) => signerForm.setData("address", e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="sm:col-span-2 flex justify-end items-center gap-3">
                    {signerItem?.connected && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Saved
                      </span>
                    )}
                    <Button
                      type="submit"
                      disabled={signerForm.processing}
                      className="gap-2 text-white shadow-md hover:opacity-90"
                      style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
                    >
                      {signerForm.processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                      Save authorized signer
                    </Button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        </main>
      </div>
    </AppLayout>
  )
}
