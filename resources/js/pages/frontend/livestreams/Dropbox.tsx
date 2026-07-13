"use client"

import { useMemo, useState, useEffect, useRef, useCallback } from "react"
import UnityMeetLayout from "@/layouts/UnityMeetLayout"
import { Head, Link, router, usePage } from "@inertiajs/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Cloud,
  MoreHorizontal,
  MoreVertical,
  Download,
  Pencil,
  Trash2,
  Video,
  FileVideo,
  HardDrive,
  Search,
  Loader2,
  Link2Off,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Play,
  Filter,
  ChevronDown,
  Check,
  Youtube,
  X,
  ExternalLink,
  AlertCircle,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "react-hot-toast"
import { PageHead } from "@/components/frontend/PageHead"
import RecordingsListPagination from "@/components/livestreams/RecordingsListPagination"
import YoutubeUploadProgressDialog from "@/components/livestreams/YoutubeUploadProgressDialog"
import { cn } from "@/lib/utils"

const BRAND = {
  from: "#9333ea",
  to: "#2563eb",
  fromMuted: "rgba(147,51,234,0.15)",
  toMuted: "rgba(37,99,235,0.1)",
}

interface DropboxFile {
  name: string
  path_display: string
  size: number
  client_modified: string | null
}

interface MeetingTitleHint {
  roomName: string
  title: string | null
}

export interface RecordingYoutubeUpload {
  dropbox_path: string
  status: "pending" | "uploading" | "published" | "failed" | string
  title?: string | null
  privacy_status?: string
  youtube_video_id?: string | null
  youtube_watch_url?: string | null
  error_message?: string | null
  progress_stage?: string | null
  progress_percent?: number
  published_at?: string | null
}

interface RecordingsListMeta {
  q: string
  filter: RecordingTypeFilter
  page: number
  perPage: number
  total: number
  lastPage: number
  from: number
  to: number
}

interface Props {
  dropboxLinked: boolean
  dropboxRedirectUri?: string | null
  dropboxFolderName: string
  dropboxFolderPath: string
  dropboxFiles: DropboxFile[]
  /** Server-side search, filter, and pagination (Unity Meet recordings). */
  recordingsList?: RecordingsListMeta
  backUrl?: string
  /** Unity Meet sidebar: only this user’s meetings (personal Dropbox or org folder filtered by room name). */
  unityMeetRecordings?: boolean
  /** False when using organization Dropbox so we don’t offer “disconnect” for the whole org from this page. */
  recordingsDisconnectAvailable?: boolean
  recordingsBackedByOrganization?: boolean
  /** When true, only files matching this user's Unity Meet room names are listed. */
  recordingsRestrictedToUserMeetings?: boolean
  meetingTitleHints?: MeetingTitleHint[]
  youtubeConnected?: boolean
  youtubeCanUpload?: boolean
  youtubeIntegrationsUrl: string
  youtubeReconnectUrl?: string
  youtubeUploads?: RecordingYoutubeUpload[]
}

function isVideoFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  return ["webm", "mp4", "mkv", "mov", "avi", "m4v"].includes(ext)
}

function displayNameWithoutExtension(name: string): string {
  const lastDot = name.lastIndexOf(".")
  return lastDot > 0 ? name.slice(0, lastDot) : name
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { dateStyle: "short" }) + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  } catch {
    return iso
  }
}

function formatRecordingDateTime(iso: string | null): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "—"
    const datePart = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    const timePart = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    return `${datePart} · ${timePart}`
  } catch {
    return "—"
  }
}

function fileModifiedTimestamp(iso: string | null): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? 0 : t
}

function sortFilesByModifiedDesc(files: DropboxFile[]): DropboxFile[] {
  return [...files].sort(
    (a, b) => fileModifiedTimestamp(b.client_modified) - fileModifiedTimestamp(a.client_modified),
  )
}

function meetingTitleFromFilename(name: string, hintMap: Map<string, string>): string {
  const lower = name.toLowerCase()
  for (const [roomLower, title] of hintMap.entries()) {
    if (lower.includes(roomLower)) return title
  }
  return displayNameWithoutExtension(name)
}

type RecordingTypeFilter = "all" | "video" | "other"

function fileMatchesTypeFilter(file: DropboxFile, filter: RecordingTypeFilter): boolean {
  if (filter === "all") return true
  const video = isVideoFile(file.name)
  return filter === "video" ? video : !video
}

function fileMatchesSearchQuery(file: DropboxFile, query: string, hintMap: Map<string, string>): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const title = meetingTitleFromFilename(file.name, hintMap).toLowerCase()
  const name = file.name.toLowerCase()
  const path = file.path_display.toLowerCase()
  const modifiedLabel = file.client_modified
    ? formatRecordingDateTime(file.client_modified).toLowerCase()
    : ""
  return (
    name.includes(q) ||
    title.includes(q) ||
    path.includes(q) ||
    modifiedLabel.includes(q)
  )
}

const TYPE_FILTER_LABELS: Record<RecordingTypeFilter, string> = {
  all: "All recordings",
  video: "Videos only",
  other: "Other files",
}

function RecordingsTypeFilterMenu({
  value,
  onChange,
}: {
  value: RecordingTypeFilter
  onChange: (value: RecordingTypeFilter) => void
}) {
  const filterActive = value !== "all"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("h-10 shrink-0 gap-2", filterActive && "border-primary/60 bg-primary/5")}
        >
          <Filter className="h-4 w-4" />
          Filter
          {filterActive ? (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">1</span>
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {(Object.keys(TYPE_FILTER_LABELS) as RecordingTypeFilter[]).map((key) => (
          <DropdownMenuItem
            key={key}
            className="gap-2"
            onClick={() => onChange(key)}
          >
            {value === key ? (
              <Check className="h-4 w-4 text-primary" />
            ) : (
              <span className="h-4 w-4" />
            )}
            {TYPE_FILTER_LABELS[key]}
          </DropdownMenuItem>
        ))}
        {filterActive ? (
          <>
            <DropdownMenuItem className="text-muted-foreground" onClick={() => onChange("all")}>
              Clear filter
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function recordingsListQueryParams(meta: {
  q?: string
  filter?: RecordingTypeFilter
  page?: number
}): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  const q = (meta.q ?? "").trim()
  if (q) params.q = q
  if (meta.filter && meta.filter !== "all") params.filter = meta.filter
  if (meta.page && meta.page > 1) params.page = meta.page
  return params
}

export default function SupporterDropbox({
  dropboxLinked,
  dropboxRedirectUri,
  dropboxFolderPath = "",
  dropboxFiles = [],
  recordingsList,
  backUrl = "/livestreams/supporter",
  unityMeetRecordings = false,
  recordingsDisconnectAvailable = true,
  recordingsBackedByOrganization = false,
  recordingsRestrictedToUserMeetings = false,
  meetingTitleHints = [],
  youtubeConnected = false,
  youtubeCanUpload = true,
  youtubeIntegrationsUrl,
  youtubeReconnectUrl,
  youtubeUploads = [],
}: Props) {
  const youtubeNeedsReconnect = youtubeConnected && !youtubeCanUpload
  const PER_PAGE = recordingsList?.perPage ?? 10
  const serverList = unityMeetRecordings
  const listMeta: RecordingsListMeta = recordingsList ?? {
    q: "",
    filter: "all",
    page: 1,
    perPage: PER_PAGE,
    total: dropboxFiles.length,
    lastPage: Math.max(1, Math.ceil(dropboxFiles.length / PER_PAGE) || 1),
    from: dropboxFiles.length === 0 ? 0 : 1,
    to: dropboxFiles.length,
  }

  const [tab, setTab] = useState<"cloud" | "local">("cloud")
  const [searchInput, setSearchInput] = useState(listMeta.q)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<RecordingTypeFilter>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [listLoading, setListLoading] = useState(false)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [renameTarget, setRenameTarget] = useState<DropboxFile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DropboxFile | null>(null)
  const [newName, setNewName] = useState("")
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [publishTarget, setPublishTarget] = useState<DropboxFile | null>(null)
  const [publishTitle, setPublishTitle] = useState("")
  const [publishDescription, setPublishDescription] = useState("")
  const [publishPrivacy, setPublishPrivacy] = useState<"unlisted" | "private" | "public">("unlisted")
  const [publishing, setPublishing] = useState(false)
  const [youtubeProgressPath, setYoutubeProgressPath] = useState<string | null>(null)
  const [youtubeProgressTitle, setYoutubeProgressTitle] = useState("")
  const [youtubeProgressFileName, setYoutubeProgressFileName] = useState("")

  const page = usePage<{ flash?: { youtube_upload_path?: string } }>()
  const youtubeUploadByPath = useMemo(() => {
    const map = new Map<string, RecordingYoutubeUpload>()
    for (const row of youtubeUploads) {
      map.set(row.dropbox_path, row)
    }
    return map
  }, [youtubeUploads])

  const hasActiveYoutubeUpload = youtubeUploads.some(
    (u) => u.status === "pending" || u.status === "uploading",
  )

  const trackedYoutubeUpload = youtubeProgressPath
    ? youtubeUploadByPath.get(youtubeProgressPath)
    : undefined

  useEffect(() => {
    if (!youtubeProgressPath || !unityMeetRecordings) return

    const upload = youtubeUploadByPath.get(youtubeProgressPath)
    if (upload?.status === "published") {
      toast.success("Recording published to YouTube.")
      const t = window.setTimeout(() => setYoutubeProgressPath(null), 2500)
      return () => window.clearTimeout(t)
    }

    if (upload?.status === "failed") {
      return
    }

    const interval = window.setInterval(() => {
      router.reload({
        only: ["youtubeUploads", "dropboxFiles", "recordingsList"],
        preserveScroll: true,
      })
    }, 2500)

    return () => window.clearInterval(interval)
  }, [youtubeProgressPath, unityMeetRecordings, youtubeUploadByPath, trackedYoutubeUpload?.status])

  const visitRecordingsList = useCallback(
    (overrides: { q?: string; filter?: RecordingTypeFilter; page?: number }) => {
      if (!unityMeetRecordings) return
      setListLoading(true)
      router.get(
        route("livestreams.supporter.recordings"),
        recordingsListQueryParams({
          q: overrides.q ?? listMeta.q,
          filter: overrides.filter ?? listMeta.filter,
          page: overrides.page ?? 1,
        }),
        {
          preserveState: true,
          preserveScroll: true,
          only: ["dropboxFiles", "recordingsList", "youtubeUploads"],
          onFinish: () => setListLoading(false),
        },
      )
    },
    [unityMeetRecordings, listMeta.q, listMeta.filter],
  )

  useEffect(() => {
    if (!serverList) return
    setSearchInput(listMeta.q)
  }, [serverList, listMeta.q])

  useEffect(() => {
    if (!serverList) return
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      const q = searchInput.trim()
      if (q === listMeta.q) return
      visitRecordingsList({ q: searchInput, filter: listMeta.filter, page: 1 })
      searchDebounceRef.current = null
    }, 400)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [searchInput, serverList, listMeta.q, listMeta.filter, visitRecordingsList])

  useEffect(() => {
    if (!unityMeetRecordings || !hasActiveYoutubeUpload) {
      return
    }
    const interval = window.setInterval(() => {
      if (serverList) {
        visitRecordingsList({ q: listMeta.q, filter: listMeta.filter, page: listMeta.page })
      } else {
        router.reload({ only: ["youtubeUploads", "dropboxFiles"] })
      }
    }, 8000)
    return () => window.clearInterval(interval)
  }, [unityMeetRecordings, hasActiveYoutubeUpload, serverList, listMeta.q, listMeta.filter, listMeta.page, visitRecordingsList])

  const hintMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const h of meetingTitleHints) {
      const room = (h.roomName ?? "").trim()
      const title = (h.title ?? "").trim()
      if (room && title) {
        map.set(room.toLowerCase(), title)
      }
    }
    return map
  }, [meetingTitleHints])

  useEffect(() => {
    const path = page.props.flash?.youtube_upload_path
    if (!path) return
    setYoutubeProgressPath(path)
    const file = dropboxFiles.find((f) => f.path_display === path)
    setYoutubeProgressFileName(file?.name ?? path.split("/").pop() ?? path)
    setYoutubeProgressTitle(
      file ? meetingTitleFromFilename(file.name, hintMap) : path.split("/").pop() ?? "Recording",
    )
  }, [page.props.flash?.youtube_upload_path, dropboxFiles, hintMap])

  const sortedDropboxFiles = useMemo(() => sortFilesByModifiedDesc(dropboxFiles), [dropboxFiles])

  const clientFilesToShow = useMemo(() => {
    let list = sortedDropboxFiles
    const q = searchQuery.trim()
    if (q) {
      list = list.filter((file) => fileMatchesSearchQuery(file, q, hintMap))
    }
    if (typeFilter !== "all") {
      list = list.filter((file) => fileMatchesTypeFilter(file, typeFilter))
    }
    return list
  }, [sortedDropboxFiles, searchQuery, hintMap, typeFilter])

  const activeFilter = serverList ? listMeta.filter : typeFilter
  const filterActive = activeFilter !== "all"
  const activeSearchQ = serverList ? listMeta.q : searchQuery.trim()
  const searchActive = activeSearchQ !== ""

  const totalItems = serverList ? listMeta.total : clientFilesToShow.length
  const totalPages = serverList
    ? Math.max(1, listMeta.lastPage)
    : clientFilesToShow.length === 0
      ? 0
      : Math.ceil(clientFilesToShow.length / PER_PAGE)
  const startItem = serverList ? listMeta.from : clientFilesToShow.length === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1
  const endItem = serverList ? listMeta.to : clientFilesToShow.length === 0 ? 0 : Math.min(currentPage * PER_PAGE, clientFilesToShow.length)
  const listPage = serverList ? listMeta.page : currentPage
  const displayFiles = serverList
    ? dropboxFiles
    : clientFilesToShow.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)

  useEffect(() => {
    if (serverList) return
    setCurrentPage(1)
  }, [searchQuery, typeFilter, clientFilesToShow.length, serverList])

  useEffect(() => {
    if (serverList) return
    if (currentPage > totalPages && totalPages >= 1) setCurrentPage(totalPages)
  }, [currentPage, totalPages, serverList])

  const getMeetingTitleFromFilename = (name: string): string =>
    meetingTitleFromFilename(name, hintMap)

  const handleFilterChange = (filter: RecordingTypeFilter) => {
    if (serverList) {
      visitRecordingsList({ q: searchInput, filter, page: 1 })
      return
    }
    setTypeFilter(filter)
  }

  const clearSearch = () => {
    if (serverList) {
      setSearchInput("")
      visitRecordingsList({ q: "", filter: listMeta.filter, page: 1 })
      return
    }
    setSearchQuery("")
  }

  const goToPage = (page: number) => {
    if (serverList) {
      visitRecordingsList({ q: listMeta.q, filter: listMeta.filter, page })
      return
    }
    setCurrentPage(page)
  }

  const recordingsListRequestExtras = (): Record<string, string | number> =>
    serverList
      ? recordingsListQueryParams({
          q: listMeta.q,
          filter: listMeta.filter,
          page: listMeta.page,
        })
      : {}

  const openPublishDialog = (file: DropboxFile) => {
    setPublishTarget(file)
    setPublishTitle(getMeetingTitleFromFilename(file.name))
    setPublishDescription("")
    setPublishPrivacy("unlisted")
  }

  const beginYoutubeProgress = (file: DropboxFile, displayTitle: string) => {
    setYoutubeProgressPath(file.path_display)
    setYoutubeProgressTitle(displayTitle)
    setYoutubeProgressFileName(file.name)
  }

  const submitYoutubeUpload = (
    path: string,
    file: DropboxFile,
    payload: { title: string; description?: string; privacy: "unlisted" | "private" | "public" },
  ) => {
    beginYoutubeProgress(file, payload.title)
    setPublishing(true)
    router.post(
      route("livestreams.supporter.recordings.youtube.publish"),
      {
        path,
        title: payload.title.trim() || undefined,
        description: payload.description?.trim() || undefined,
        privacy_status: payload.privacy,
        ...recordingsListRequestExtras(),
      },
      {
        preserveScroll: true,
        onFinish: () => setPublishing(false),
        onSuccess: () => {
          setPublishTarget(null)
        },
        onError: () => {
          toast.error("Could not start YouTube upload.")
          setYoutubeProgressPath(null)
        },
      },
    )
  }

  const handlePublishToYoutube = () => {
    if (!publishTarget) return
    submitYoutubeUpload(publishTarget.path_display, publishTarget, {
      title: publishTitle,
      description: publishDescription,
      privacy: publishPrivacy,
    })
  }

  const handleRetryYoutubeUpload = (file: DropboxFile) => {
    const existing = youtubeUploadByPath.get(file.path_display)
    submitYoutubeUpload(file.path_display, file, {
      title: existing?.title ?? getMeetingTitleFromFilename(file.name),
      privacy: (existing?.privacy_status as "unlisted" | "private" | "public") ?? "unlisted",
    })
  }

  const handleRename = () => {
    if (!renameTarget) return
    const trimmed = newName.trim()
    if (!trimmed || trimmed === renameTarget.name) {
      setRenameTarget(null)
      return
    }
    setRenaming(true)
    router.put(
      unityMeetRecordings ? route("livestreams.supporter.recordings.file.rename") : route("integrations.dropbox.file.rename"),
      { path: renameTarget.path_display, new_name: trimmed, ...recordingsListRequestExtras() },
      {
        preserveScroll: true,
        onFinish: () => setRenaming(false),
        onSuccess: () => {
          toast.success("File renamed.")
          setRenameTarget(null)
        },
        onError: () => toast.error("Could not rename file."),
      },
    )
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    setDeleting(true)
    router.delete(unityMeetRecordings ? route("livestreams.supporter.recordings.file.delete") : route("integrations.dropbox.file.delete"), {
      data: { path: deleteTarget.path_display, ...recordingsListRequestExtras() },
      preserveScroll: true,
      onFinish: () => setDeleting(false),
      onSuccess: () => {
        toast.success("File deleted.")
        setDeleteTarget(null)
      },
      onError: () => toast.error("Could not delete file."),
    })
  }

  return (
    <UnityMeetLayout
      breadcrumbs={[
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Unity Meet Communications', href: '/livestreams/supporter' },
        { title: unityMeetRecordings ? 'Recordings' : 'Dropbox recordings', href: '#' },
      ]}
    >
      <PageHead title={unityMeetRecordings ? "Recordings" : "Dropbox recordings"} description="View and manage your meeting recordings saved to Dropbox." />
      <Head title={unityMeetRecordings ? "Recordings" : "Dropbox recordings"} />

      <div className="min-h-screen bg-background">
        {unityMeetRecordings ? (
          <>
            <div
              className="relative overflow-hidden border-b border-purple-200 dark:border-purple-500/20"
              style={{
                background: `linear-gradient(135deg, ${BRAND.fromMuted} 0%, rgba(147,51,234,0.2) 50%, ${BRAND.toMuted} 100%)`,
              }}
            >
              <div className="relative w-full px-4 py-8 md:px-6 lg:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 ring-1 ring-purple-500/20">
                      <HardDrive className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="space-y-1">
                      <h1 className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
                        Recordings
                      </h1>
                      <p className="text-sm text-muted-foreground">
                        Cloud meeting recordings from Dropbox — search, filter, and manage your files.
                      </p>
                    </div>
                  </div>
                  {dropboxLinked && totalItems > 0 ? (
                    <div className="shrink-0 rounded-full border border-purple-500/20 bg-card/80 px-4 py-2 text-sm shadow-sm backdrop-blur-sm">
                      <span className="font-semibold text-foreground">{totalItems}</span>
                      <span className="text-muted-foreground"> recording{totalItems === 1 ? "" : "s"}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="w-full space-y-4 px-4 py-8 md:px-6 lg:px-8">
              {youtubeNeedsReconnect ? (
                <div className="rounded-xl border border-amber-300/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100">
                  YouTube is connected but <strong>upload permission</strong> is missing. Open{" "}
                  <a href={youtubeIntegrationsUrl} className="font-medium underline">
                    Unity Meet Settings
                  </a>
                  , disconnect YouTube, then{" "}
                  <a href={youtubeReconnectUrl ?? youtubeIntegrationsUrl} className="font-medium underline">
                    reconnect
                  </a>{" "}
                  and allow all requested Google access (including upload videos).
                </div>
              ) : null}
              <Tabs value={tab} onValueChange={(v) => setTab(v as "cloud" | "local")} className="w-full">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <TabsList className="h-auto w-full shrink-0 justify-start gap-1 rounded-lg bg-muted/40 p-1 sm:w-auto">
                    <TabsTrigger
                      value="cloud"
                      className="rounded-md px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
                    >
                      Cloud Recordings
                    </TabsTrigger>
                    <TabsTrigger value="local" className="rounded-md px-4 py-2">
                      Local Recordings
                    </TabsTrigger>
                  </TabsList>

                  {tab === "cloud" ? (
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
                      <div className="relative min-w-0 flex-1 sm:w-64 md:w-72 lg:w-80">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="search"
                          placeholder="Search recordings…"
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          className="h-10 w-full border-purple-500/15 bg-card pl-9 pr-9 focus-visible:ring-purple-500/30"
                          aria-label="Search recordings"
                        />
                        {listLoading ? (
                          <Loader2 className="absolute right-9 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-purple-600 dark:text-purple-400" />
                        ) : null}
                        {searchActive || searchInput.trim() !== "" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                            onClick={clearSearch}
                            aria-label="Clear search"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                      <RecordingsTypeFilterMenu value={activeFilter} onChange={handleFilterChange} />
                    </div>
                  ) : null}
                </div>

                {tab === "cloud" && dropboxLinked ? (
                  <p className="text-sm text-muted-foreground">
                    {searchActive || filterActive
                      ? `${totalItems} result${totalItems === 1 ? "" : "s"}`
                        + (searchActive ? ` for “${activeSearchQ}”` : "")
                        + (filterActive ? ` · ${TYPE_FILTER_LABELS[activeFilter]}` : "")
                      : totalItems > 0
                        ? `${totalItems} recording${totalItems === 1 ? "" : "s"} · newest first · ${PER_PAGE} per page`
                        : "No recordings in your folder yet."}
                  </p>
                ) : null}

                <TabsContent value="cloud" className="mt-4">
                  <Card className="overflow-hidden border-border shadow-sm">
                    <CardContent className="p-0">
                    {!dropboxLinked ? (
                      <div className="px-6 py-14 text-center text-sm text-muted-foreground">
                        Connect Dropbox to see your cloud recordings.
                      </div>
                    ) : displayFiles.length === 0 ? (
                      <div className="px-6 py-14 text-center text-sm text-muted-foreground">
                        {listLoading ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading recordings…
                          </span>
                        ) : searchActive || filterActive ? (
                          "No recordings match your search or filter."
                        ) : (
                          "No recordings found."
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                                <TableHead className="pl-6 font-semibold">Meeting</TableHead>
                                <TableHead className="font-semibold whitespace-nowrap">Date &amp; time</TableHead>
                                <TableHead className="font-semibold">Size</TableHead>
                                <TableHead className="font-semibold">YouTube</TableHead>
                                <TableHead className="pr-6 text-right font-semibold">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {displayFiles.map((file) => {
                                const title = getMeetingTitleFromFilename(file.name)
                                const when = formatRecordingDateTime(file.client_modified)
                                const size = formatFileSize(file.size)
                                const downloadUrl = route("livestreams.supporter.recordings.download", { path: file.path_display })
                                const brandedDownloadUrl = isVideoFile(file.name)
                                  ? route("livestreams.supporter.recordings.branded-download", { path: file.path_display })
                                  : null
                                const playUrl = isVideoFile(file.name) ? downloadUrl : null
                                const yt = youtubeUploadByPath.get(file.path_display)
                                const canYoutube =
                                  unityMeetRecordings && isVideoFile(file.name) && youtubeConnected && youtubeCanUpload
                                const isVideo = isVideoFile(file.name)
                                return (
                                  <TableRow
                                    key={file.path_display}
                                    className="border-b border-border/80 transition-colors hover:bg-purple-500/5"
                                  >
                                    <TableCell className="pl-6">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div
                                          className={cn(
                                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                                            isVideo
                                              ? "bg-gradient-to-br from-purple-600/15 to-blue-600/15 text-purple-600 dark:text-purple-400"
                                              : "bg-muted text-muted-foreground",
                                          )}
                                        >
                                          {isVideo ? (
                                            <FileVideo className="h-4 w-4" />
                                          ) : (
                                            <HardDrive className="h-4 w-4" />
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="truncate font-medium text-foreground">{title}</p>
                                          <p className="truncate text-xs text-muted-foreground">{file.name}</p>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-muted-foreground">
                                      <span className="inline-flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 shrink-0 opacity-60" />
                                        {when}
                                      </span>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-muted-foreground">{size}</TableCell>
                                    <TableCell>
                                      {yt?.status === "published" && yt.youtube_watch_url ? (
                                        <a
                                          href={yt.youtube_watch_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-500/20 dark:text-green-400"
                                        >
                                          <Youtube className="h-3.5 w-3.5" />
                                          Published
                                        </a>
                                      ) : yt?.status === "uploading" || yt?.status === "pending" ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          Uploading…
                                        </span>
                                      ) : yt?.status === "failed" ? (
                                        <span
                                          className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive"
                                          title={yt.error_message ?? undefined}
                                        >
                                          <AlertCircle className="h-3.5 w-3.5" />
                                          Failed
                                        </span>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="pr-6">
                                      <div className="flex flex-wrap items-center justify-end gap-2">
                                        <Button asChild variant="outline" size="sm" className="h-9 gap-2">
                                          <a href={playUrl ?? downloadUrl} target="_blank" rel="noopener noreferrer">
                                            <Play className="h-4 w-4" />
                                            Play
                                          </a>
                                        </Button>
                                        <Button asChild variant="outline" size="sm" className="h-9 gap-2">
                                          <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                                            <Download className="h-4 w-4" />
                                            Download
                                          </a>
                                        </Button>
                                        {canYoutube && yt?.status !== "published" && yt?.status !== "uploading" && yt?.status !== "pending" ? (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-9 gap-2 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:text-red-300"
                                            onClick={() =>
                                              yt?.status === "failed"
                                                ? handleRetryYoutubeUpload(file)
                                                : openPublishDialog(file)
                                            }
                                          >
                                            <Youtube className="h-4 w-4" />
                                            {yt?.status === "failed" ? "Retry YouTube" : "YouTube"}
                                          </Button>
                                        ) : null}
                                        {unityMeetRecordings && isVideoFile(file.name) && (!youtubeConnected || youtubeNeedsReconnect) ? (
                                          <Button asChild variant="outline" size="sm" className="h-9 gap-2">
                                            <a href={youtubeNeedsReconnect && youtubeReconnectUrl ? youtubeReconnectUrl : youtubeIntegrationsUrl}>
                                              <Youtube className="h-4 w-4" />
                                              {youtubeNeedsReconnect ? "Reconnect YouTube" : "Connect YouTube"}
                                            </a>
                                          </Button>
                                        ) : null}
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="icon" className="h-9 w-9" aria-label="More">
                                              <MoreVertical className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="w-44">
                                            {canYoutube && yt?.status !== "published" ? (
                                              <DropdownMenuItem onClick={() => openPublishDialog(file)}>
                                                <Youtube className="h-4 w-4" />
                                                Upload to YouTube
                                              </DropdownMenuItem>
                                            ) : null}
                                            <DropdownMenuItem onClick={() => window.open(downloadUrl, "_blank")}>Open</DropdownMenuItem>
                                            {brandedDownloadUrl ? (
                                              <DropdownMenuItem onClick={() => window.open(brandedDownloadUrl, "_blank")}>
                                                <Download className="h-4 w-4" />
                                                Download with overlay
                                              </DropdownMenuItem>
                                            ) : null}
                                            <DropdownMenuItem
                                              onClick={() => {
                                                setNewName(file.name)
                                                setRenameTarget(file)
                                              }}
                                            >
                                              <Pencil className="h-4 w-4" />
                                              Rename
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              className="text-destructive focus:text-destructive"
                                              onClick={() => setDeleteTarget(file)}
                                              disabled={deleting}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    )}

                    {totalItems > 0 ? (
                      <RecordingsListPagination
                        page={listPage}
                        lastPage={totalPages}
                        total={totalItems}
                        from={startItem}
                        to={endItem}
                        perPage={PER_PAGE}
                        loading={listLoading}
                        onPageChange={goToPage}
                      />
                    ) : null}

                    <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Rename file</DialogTitle>
                              <DialogDescription>Enter a new name for this recording file.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-2 py-2">
                              <Label htmlFor="rename-input">File name</Label>
                              <Input
                                id="rename-input"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="recording.webm"
                              />
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setRenameTarget(null)}>
                                Cancel
                              </Button>
                              <Button onClick={handleRename} disabled={renaming || !newName.trim()}>
                                {renaming ? "Renaming…" : "Rename"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete file?</DialogTitle>
                              <DialogDescription>
                                Delete &quot;{deleteTarget?.name}&quot;? This cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                                Cancel
                              </Button>
                              <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-2">
                                <Trash2 className="h-4 w-4 shrink-0" />
                                {deleting ? "Deleting…" : "Delete"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Dialog open={!!publishTarget} onOpenChange={(open) => !open && setPublishTarget(null)}>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Upload to YouTube</DialogTitle>
                              <DialogDescription>
                                The recording will be downloaded from Dropbox and published to your connected YouTube
                                channel in the background. Large files may take several minutes.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-2">
                              <div className="grid gap-2">
                                <Label htmlFor="yt-title">Title</Label>
                                <Input
                                  id="yt-title"
                                  value={publishTitle}
                                  onChange={(e) => setPublishTitle(e.target.value)}
                                  maxLength={100}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="yt-description">Description (optional)</Label>
                                <Input
                                  id="yt-description"
                                  value={publishDescription}
                                  onChange={(e) => setPublishDescription(e.target.value)}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Visibility</Label>
                                <Select
                                  value={publishPrivacy}
                                  onValueChange={(v) => setPublishPrivacy(v as "unlisted" | "private" | "public")}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unlisted">Unlisted</SelectItem>
                                    <SelectItem value="private">Private</SelectItem>
                                    <SelectItem value="public">Public</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setPublishTarget(null)}>
                                Cancel
                              </Button>
                              <Button
                                onClick={handlePublishToYoutube}
                                disabled={publishing || !publishTitle.trim()}
                                className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                              >
                                {publishing ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Starting…
                                  </>
                                ) : (
                                  <>
                                    <Youtube className="h-4 w-4" />
                                    Upload to YouTube
                                  </>
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <YoutubeUploadProgressDialog
                          open={youtubeProgressPath !== null}
                          fileName={youtubeProgressFileName}
                          title={youtubeProgressTitle}
                          upload={trackedYoutubeUpload}
                          polling={trackedYoutubeUpload?.status === "pending" || trackedYoutubeUpload?.status === "uploading"}
                          onClose={() => setYoutubeProgressPath(null)}
                          onRetry={
                            youtubeProgressPath
                              ? () => {
                                  const file = dropboxFiles.find((f) => f.path_display === youtubeProgressPath)
                                  if (file) handleRetryYoutubeUpload(file)
                                }
                              : undefined
                          }
                          retrying={publishing}
                        />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="local" className="mt-4">
                  <Card className="border-dashed border-purple-500/25 bg-muted/20 shadow-sm">
                    <CardContent className="px-6 py-14 text-center text-sm text-muted-foreground">
                      Local recordings are saved to your device when you stop recording in a meeting.
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : null}

        {!unityMeetRecordings ? (
          <>
            {/* Hero header – match supporter livestream index */}
            <div
          className="relative overflow-hidden border-b border-purple-200 dark:border-purple-500/20"
          style={{
            background: `linear-gradient(135deg, ${BRAND.fromMuted} 0%, rgba(147,51,234,0.25) 30%, rgba(37,99,235,0.2) 70%, ${BRAND.toMuted} 100%)`,
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(147,51,234,0.15),transparent)]" />
          <div className="relative w-full px-4 py-10 sm:py-12 md:px-6 lg:px-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href={backUrl}
                  className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Link>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg shrink-0"
                    style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
                  >
                    <Cloud className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Dropbox recordings</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {dropboxLinked
                        ? unityMeetRecordings
                          ? "Only recordings tied to your Unity Meet meetings appear here."
                          : "Recordings saved to your Dropbox. View, download, or manage below."
                        : "Connect Dropbox to save meeting recordings to your account."}
                    </p>
                    {dropboxLinked && unityMeetRecordings && recordingsBackedByOrganization ? (
                      <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                        {recordingsRestrictedToUserMeetings
                          ? "Your organization shares one Dropbox folder. We only list files whose names include your meeting ID (room name)."
                          : "Showing recordings from your organization’s Dropbox folder (same as Integrations → Dropbox)."}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
              {dropboxLinked && recordingsDisconnectAvailable ? (
                <div className="shrink-0">
                  <DisconnectButton />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {dropboxLinked ? (
            <>
              <section className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Your recordings</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {dropboxFolderPath ? (
                        <>Saved in <code className="bg-muted/80 px-1.5 py-0.5 rounded text-xs font-mono">{dropboxFolderPath}</code></>
                      ) : (
                        "Recordings from your meetings appear here."
                      )}
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <div className="relative w-full sm:w-72">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search by title, filename, or date…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 border-border bg-muted/50 pl-9 pr-9 focus-visible:ring-2 focus-visible:ring-purple-500/50"
                        aria-label="Search recordings"
                      />
                      {searchActive ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setSearchQuery("")}
                          aria-label="Clear search"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                    <RecordingsTypeFilterMenu value={typeFilter} onChange={setTypeFilter} />
                  </div>
                </div>
                {dropboxLinked && sortedDropboxFiles.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {searchActive || filterActive
                      ? `${totalItems} result${totalItems === 1 ? "" : "s"}`
                        + (searchActive ? ` for “${searchQuery.trim()}”` : "")
                        + (filterActive ? ` · ${TYPE_FILTER_LABELS[typeFilter]}` : "")
                      : totalPages > 1
                        ? `${sortedDropboxFiles.length} file${sortedDropboxFiles.length === 1 ? "" : "s"} · newest first · ${PER_PAGE} per page · Page ${currentPage} of ${totalPages}`
                        : `${sortedDropboxFiles.length} file${sortedDropboxFiles.length === 1 ? "" : "s"} · newest first · ${PER_PAGE} per page`}
                  </p>
                ) : null}

                {displayFiles.length === 0 ? (
                  <div className="py-20 text-center rounded-2xl border-2 border-dashed border-purple-200 dark:border-purple-500/20 bg-muted/20" style={{ background: `linear-gradient(135deg, ${BRAND.fromMuted}, ${BRAND.toMuted})` }}>
                    {searchActive || filterActive ? (
                      <>
                        <Search className="mx-auto h-14 w-14 text-purple-600/50 dark:text-purple-400/50 mb-4" />
                        <p className="text-base font-medium text-foreground">No matching recordings</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Try a different search or filter.
                          {searchActive ? ` Nothing matched “${searchQuery.trim()}”.` : ""}
                          {filterActive ? ` Active filter: ${TYPE_FILTER_LABELS[typeFilter]}.` : ""}
                        </p>
                      </>
                    ) : (
                      <>
                        <Video className="mx-auto h-14 w-14 text-purple-600/50 dark:text-purple-400/50 mb-4" />
                        <p className="text-base font-medium text-foreground">No recordings yet</p>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                          Record a meeting and it will appear here automatically.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                      {displayFiles.map((file) => (
                        <FileCard key={file.path_display} file={file} unityMeetRecordings={unityMeetRecordings} />
                      ))}
                    </div>
                    {totalPages > 1 && (
                      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-6">
                        <p className="text-sm text-muted-foreground order-2 sm:order-1">
                          Showing {startItem}–{endItem} of {totalItems}
                        </p>
                        <div className="flex items-center gap-1 order-1 sm:order-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1 border-purple-200 dark:border-purple-500/30"
                            onClick={() => goToPage(Math.max(1, listPage - 1))}
                            disabled={listPage <= 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Prev
                          </Button>
                          <div className="flex items-center gap-0.5 mx-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                              .filter((p) => {
                                if (totalPages <= 7) return true
                                if (p === 1 || p === totalPages) return true
                                if (p >= listPage - 1 && p <= listPage + 1) return true
                                return false
                              })
                              .map((p, i, arr) => {
                                const showEllipsisBefore = i > 0 && p - arr[i - 1] > 1
                                return (
                                  <span key={p} className="flex items-center gap-0.5">
                                    {showEllipsisBefore && <span className="px-1.5 text-muted-foreground">…</span>}
                                    <Button
                                      variant={listPage === p ? "default" : "ghost"}
                                      size="sm"
                                      className={`h-9 w-9 min-w-9 p-0 ${listPage === p ? "bg-linear-to-r from-purple-600 to-blue-600 text-white" : ""}`}
                                      onClick={() => goToPage(p)}
                                    >
                                      {p}
                                    </Button>
                                  </span>
                                )
                              })}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1 border-purple-200 dark:border-purple-500/30"
                            onClick={() => goToPage(Math.min(totalPages, listPage + 1))}
                            disabled={listPage >= totalPages}
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            </>
          ) : (
            <section className="mx-auto max-w-md">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl dark:bg-card/95">
                <div className="p-8 sm:p-10 flex flex-col items-center text-center">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg mb-6 ring-4 ring-white/20 dark:ring-black/10"
                    style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
                  >
                    <Cloud className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">Connect Dropbox</h2>
                  <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
                    Save meeting recordings to your Dropbox automatically. After connecting, you can view, download, rename, and delete files from this page.
                  </p>
                  <a
                    href={route("integrations.dropbox.redirect")}
                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-w-[200px] h-12 px-6 rounded-xl text-white font-semibold shadow-lg transition-all duration-200 hover:shadow-[0_8px_30px_rgba(147,51,234,0.4)] hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
                  >
                    <Cloud className="w-5 h-5" />
                    Connect with Dropbox
                  </a>
                </div>
              </div>
            </section>
          )}
        </main>
          </>
        ) : null}
      </div>
    </UnityMeetLayout>
  )
}

function FileCard({ file, unityMeetRecordings = false }: { file: DropboxFile; unityMeetRecordings?: boolean }) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [newName, setNewName] = useState(file.name)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const downloadUrl = unityMeetRecordings
    ? route("livestreams.supporter.recordings.download", { path: file.path_display })
    : route("integrations.dropbox.download", { path: file.path_display })
  const showVideo = isVideoFile(file.name)

  const handleRename = () => {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === file.name) {
      setRenameOpen(false)
      return
    }
    setRenaming(true)
    router.put(
      unityMeetRecordings ? route("livestreams.supporter.recordings.file.rename") : route("integrations.dropbox.file.rename"),
      { path: file.path_display, new_name: trimmed },
      {
        preserveScroll: true,
        onFinish: () => {
          setRenaming(false)
          setRenameOpen(false)
        },
        onSuccess: () => toast.success("File renamed."),
        onError: () => toast.error("Could not rename file."),
      },
    )
  }

  const handleDelete = () => {
    setDeleteConfirmOpen(false)
    setDeleting(true)
    router.delete(unityMeetRecordings ? route("livestreams.supporter.recordings.file.delete") : route("integrations.dropbox.file.delete"), {
      data: { path: file.path_display },
      preserveScroll: true,
      onFinish: () => setDeleting(false),
      onSuccess: () => toast.success("File deleted."),
      onError: () => toast.error("Could not delete file."),
    })
  }

  return (
    <>
      <div className="group rounded-2xl overflow-hidden bg-card shadow-lg ring-1 ring-border transition-all duration-200 hover:border-purple-400 hover:shadow-md dark:hover:border-purple-500/30">
        <div className="relative aspect-video overflow-hidden bg-muted/30 flex items-center justify-center">
          {showVideo ? (
            <>
              <video
                src={downloadUrl}
                preload="metadata"
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
                onLoadedData={() => setVideoLoaded(true)}
              />
              {!videoLoaded && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${BRAND.fromMuted}, ${BRAND.toMuted})` }}>
                  <FileVideo className="h-10 w-10 text-purple-600/60 dark:text-purple-400/60 animate-pulse" strokeWidth={1.5} />
                </div>
              )}
            </>
          ) : (
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-200 dark:border-purple-500/20 shadow-inner" style={{ background: `linear-gradient(135deg, ${BRAND.fromMuted}, ${BRAND.toMuted})` }}>
              <FileVideo className="h-8 w-8 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
            </div>
          )}
          <span className="absolute top-3 left-3 rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/90 backdrop-blur-sm">
            Recording
          </span>
        </div>

        <Card className="rounded-none border-0 shadow-none bg-transparent">
          <CardContent className="p-4 pt-4 px-4 pb-3">
            <h3 className="text-sm font-semibold leading-tight text-foreground truncate pr-8 mb-3" title={file.name}>
              {displayNameWithoutExtension(file.name)}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 shrink-0 opacity-70" />
                {formatFileSize(file.size)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" />
                {file.client_modified ? formatDate(file.client_modified) : "—"}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Button asChild size="sm" variant="secondary" className="h-8 flex-1 gap-1.5 text-xs font-medium">
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">More actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => { setNewName(file.name); setRenameOpen(true) }}>
                    <Pencil className="h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteConfirmOpen(true)} disabled={deleting}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
            <DialogDescription>Enter a new name for this file.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="rename-input">File name</Label>
            <Input
              id="rename-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="recording.webm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={handleRename} disabled={renaming || !newName.trim() || newName.trim() === file.name}>
              {renaming ? "Renaming…" : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete file?</DialogTitle>
            <DialogDescription>
              Delete &quot;{file.name}&quot;? This cannot be undone. The file will be removed from your Dropbox.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-2">
              <Trash2 className="h-4 w-4 shrink-0" />
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function DisconnectButton() {
  const [disconnecting, setDisconnecting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleDisconnect = () => {
    setConfirmOpen(false)
    setDisconnecting(true)
    router.post(route("integrations.dropbox.disconnect"), {}, {
      preserveScroll: true,
      onFinish: () => setDisconnecting(false),
      onSuccess: () => toast.success("Dropbox disconnected."),
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2 rounded-lg border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
        onClick={() => setConfirmOpen(true)}
        disabled={disconnecting}
      >
        <Link2Off className="h-4 w-4 shrink-0" />
        {disconnecting ? "Disconnecting…" : "Disconnect"}
      </Button>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Dropbox?</DialogTitle>
            <DialogDescription>
              New recordings will no longer be saved to your Dropbox. Your existing files in Dropbox will not be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDisconnect} disabled={disconnecting} className="gap-2">
              <Link2Off className="h-4 w-4 shrink-0" />
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
