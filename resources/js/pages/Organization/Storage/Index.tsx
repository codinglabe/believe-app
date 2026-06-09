"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import AppLayout from "@/layouts/app-layout"
import { Head, Link, router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Cloud,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Upload,
  Search,
  MoreHorizontal,
  Download,
  Pencil,
  Trash2,
  FileText,
  HardDrive,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react"
import { toast } from "react-hot-toast"
import { StorageUploadScreen } from "@/pages/Organization/Storage/UploadScreen"

const BRAND = {
  from: "#9333ea",
  to: "#2563eb",
  fromMuted: "rgba(147,51,234,0.15)",
  toMuted: "rgba(37,99,235,0.1)",
}

/** Inertia visits on this page — no top progress bar; keep URL as /governance/storage. */
const SILENT_VISIT = { showProgress: false, preserveUrl: true } as const

interface StorageFile {
  name: string
  path_display: string
  size: number
  client_modified: string | null
}

interface FolderNode {
  name: string
  path: string
  children: FolderNode[]
}

interface Props {
  dropboxConnected: boolean
  provisioned: boolean
  currentPath: string
  rootPath: string
  folderTree: FolderNode[]
  folderFileCounts: Record<string, number>
  files: StorageFile[]
  searchQuery: string
  searchResults: StorageFile[] | null
  dropboxConnectUrl: string
  integrationsDropboxUrl: string
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    return (
      d.toLocaleDateString(undefined, { dateStyle: "short" }) +
      " " +
      d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    )
  } catch {
    return iso
  }
}

function pathToBreadcrumbs(path: string, rootPath: string): { name: string; path: string }[] {
  const crumbs: { name: string; path: string }[] = []
  if (path === rootPath) {
    return [{ name: "Governance", path: rootPath }]
  }
  const parts = path.replace(rootPath, "").split("/").filter(Boolean)
  let acc = rootPath
  crumbs.push({ name: "Governance", path: rootPath })
  for (const part of parts) {
    acc = `${acc}/${part}`
    crumbs.push({ name: part, path: acc })
  }
  return crumbs
}

function collectExpandedPaths(nodes: FolderNode[], target: string, trail: string[] = []): string[] {
  for (const node of nodes) {
    const next = [...trail, node.path]
    if (node.path === target) return next
    if (target.startsWith(node.path + "/")) {
      const found = collectExpandedPaths(node.children, target, next)
      if (found.length > 0) return found
    }
  }
  return []
}

function filterFolderTree(nodes: FolderNode[], query: string): FolderNode[] {
  const q = query.trim().toLowerCase()
  if (q === "") return nodes

  const out: FolderNode[] = []
  for (const node of nodes) {
    const nameMatches = node.name.toLowerCase().includes(q)
    const filteredChildren = filterFolderTree(node.children, query)
    if (nameMatches || filteredChildren.length > 0) {
      out.push({
        ...node,
        children: nameMatches ? node.children : filteredChildren,
      })
    }
  }
  return out
}

function collectAllFolderPaths(nodes: FolderNode[], paths: Set<string>): void {
  for (const node of nodes) {
    paths.add(node.path)
    collectAllFolderPaths(node.children, paths)
  }
}

function parentFolderFromFilePath(filePath: string): string {
  const trimmed = filePath.replace(/\/+$/, "")
  const idx = trimmed.lastIndexOf("/")
  if (idx <= 0) return "/Governance"
  return trimmed.slice(0, idx)
}

function expandedForFileSearchResults(
  files: StorageFile[],
  folderTree: FolderNode[],
  rootPath: string
): Set<string> {
  const set = new Set<string>([rootPath])
  for (const file of files) {
    const folder = parentFolderFromFilePath(file.path_display)
    if (folder === rootPath) continue
    for (const ancestor of collectExpandedPaths(folderTree, folder, [rootPath])) {
      set.add(ancestor)
    }
  }
  return set
}

function highlightFolderName(name: string, query: string): ReactNode {
  const q = query.trim()
  if (q === "") return name

  const lowerName = name.toLowerCase()
  const lowerQ = q.toLowerCase()
  const idx = lowerName.indexOf(lowerQ)
  if (idx === -1) return name

  return (
    <>
      {name.slice(0, idx)}
      <mark className="rounded bg-purple-200/80 dark:bg-purple-500/30 text-foreground px-0.5">
        {name.slice(idx, idx + q.length)}
      </mark>
      {name.slice(idx + q.length)}
    </>
  )
}

/** Only the selected folder branch stays open (root + ancestors of path). */
function expandedForPath(path: string, folderTree: FolderNode[], rootPath: string): Set<string> {
  const set = new Set<string>([rootPath])
  if (path === rootPath) {
    return set
  }
  for (const ancestor of collectExpandedPaths(folderTree, path, [rootPath])) {
    set.add(ancestor)
  }
  return set
}

function FolderTreeItem({
  node,
  currentPath,
  loadingPath,
  expanded,
  onToggle,
  onSelect,
  folderSearchQuery = "",
  folderFileCounts = {},
  depth = 0,
}: {
  node: FolderNode
  currentPath: string
  loadingPath: string | null
  expanded: Set<string>
  onToggle: (path: string) => void
  onSelect: (path: string) => void
  folderSearchQuery?: string
  folderFileCounts?: Record<string, number>
  depth?: number
}) {
  const fileCount = folderFileCounts[node.path] ?? 0
  const hasChildren = node.children.length > 0
  const isExpanded = expanded.has(node.path)
  const isActive = currentPath === node.path
  const isLoading = loadingPath === node.path

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node.path)}
        disabled={isLoading}
        className={`w-full flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors cursor-pointer disabled:opacity-80 min-w-0 ${
          isActive || isLoading
            ? "bg-gradient-to-r from-purple-600/15 to-blue-600/10 text-foreground font-medium"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {hasChildren ? (
          <span
            className="shrink-0 p-0.5 rounded hover:bg-muted cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              onToggle(node.path)
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </span>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        {isLoading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-purple-600 dark:text-purple-400" />
        ) : isActive || isExpanded ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate flex-1 min-w-0">
          {highlightFolderName(node.name, folderSearchQuery)}
        </span>
        <span
          className={`ml-1 shrink-0 min-w-[1.5rem] text-right text-xs tabular-nums rounded-full px-1.5 py-0.5 ${
            fileCount > 0
              ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium"
              : "text-muted-foreground/70"
          }`}
        >
          {fileCount}
        </span>
      </button>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.path}
              node={child}
              currentPath={currentPath}
              loadingPath={loadingPath}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              folderSearchQuery={folderSearchQuery}
              folderFileCounts={folderFileCounts}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function fileTypeLabel(name: string): string {
  const ext = name.split(".").pop()?.toUpperCase() ?? "FILE"
  return ext.length > 8 ? ext.slice(0, 8) : ext
}

function FileCard({ file }: { file: StorageFile }) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [newName, setNewName] = useState(file.name)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const handleRename = () => {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === file.name) {
      setRenameOpen(false)
      return
    }
    setRenaming(true)
    router.put(
      route("governance.storage.rename"),
      { path: file.path_display, new_name: trimmed },
      {
        ...SILENT_VISIT,
        preserveScroll: true,
        onFinish: () => {
          setRenaming(false)
          setRenameOpen(false)
        },
        onSuccess: () => toast.success("File renamed."),
        onError: () => toast.error("Could not rename file."),
      }
    )
  }

  const handleDelete = () => {
    setDeleteConfirmOpen(false)
    setDeleting(true)
    router.delete(route("governance.storage.delete"), {
      ...SILENT_VISIT,
      data: { path: file.path_display },
      preserveScroll: true,
      onFinish: () => setDeleting(false),
      onSuccess: () => toast.success("File deleted."),
      onError: () => toast.error("Could not delete file."),
    })
  }

  return (
    <>
      <div className="group relative flex flex-col rounded-2xl border border-border bg-card shadow-sm overflow-hidden transition-all duration-200 hover:border-purple-300 hover:shadow-md dark:hover:border-purple-500/40">
        <div
          className="relative flex aspect-[4/3] items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${BRAND.fromMuted} 0%, rgba(147,51,234,0.12) 50%, ${BRAND.toMuted} 100%)`,
          }}
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
          >
            <FileText className="h-8 w-8" />
          </div>
          <span className="absolute top-3 left-3 rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm">
            {fileTypeLabel(file.name)}
          </span>
          <div className="absolute top-2 right-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 bg-background/80 backdrop-blur-sm shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  disabled={deleting || renaming}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a
                    href={route("governance.storage.download", { path: file.path_display })}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setNewName(file.name)
                    setRenameOpen(true)
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug" title={file.name}>
            {file.name}
          </h3>
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{formatFileSize(file.size)}</span>
            <span className="text-border">·</span>
            <span>{formatDate(file.client_modified)}</span>
          </div>
        </div>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
            <DialogDescription>Enter a new name for this file in Dropbox.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="rename-input">File name</Label>
            <Input
              id="rename-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-2"
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={renaming}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90"
            >
              {renaming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete file?</DialogTitle>
            <DialogDescription>
              &quot;{file.name}&quot; will be permanently removed from Dropbox. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function OrganizationStorageIndex({
  dropboxConnected,
  provisioned,
  currentPath,
  rootPath,
  folderTree,
  folderFileCounts = {},
  files,
  searchQuery: initialSearchQuery,
  searchResults,
  dropboxConnectUrl,
  integrationsDropboxUrl,
}: Props) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [folderSearchQuery, setFolderSearchQuery] = useState("")
  const [showUploadScreen, setShowUploadScreen] = useState(false)
  const [provisioning, setProvisioning] = useState(false)
  const [loadingPath, setLoadingPath] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentPathRef = useRef(currentPath)
  const pendingVisitRef = useRef<string | null>(null)

  useEffect(() => {
    currentPathRef.current = currentPath
  }, [currentPath])

  const folderLoadVisit = useCallback(
    (path: string, query?: Record<string, string | undefined>) => {
      const visitKey = JSON.stringify(query ?? { path })
      if (pendingVisitRef.current === visitKey) {
        return
      }
      pendingVisitRef.current = visitKey
      setLoadingPath(path)
      router.get(route("governance.storage.index"), query ?? { path }, {
        ...SILENT_VISIT,
        preserveState: true,
        preserveScroll: true,
        only: ["files", "currentPath", "searchQuery", "searchResults", "folderFileCounts"],
        onFinish: () => {
          pendingVisitRef.current = null
          setLoadingPath(null)
        },
        onError: () => {
          pendingVisitRef.current = null
          setLoadingPath(null)
        },
      })
    },
    []
  )

  const [expanded, setExpanded] = useState(() =>
    expandedForPath(currentPath, folderTree, rootPath)
  )

  useEffect(() => {
    setExpanded(expandedForPath(currentPath, folderTree, rootPath))
    setShowUploadScreen(false)
  }, [currentPath, folderTree, rootPath])

  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(window.history.state, "", route("governance.storage.index"))
    }
  }, [])

  useEffect(() => {
    const remove = router.on("before", (event) => {
      const visit = event.detail.visit
      const href = typeof visit.url === "string" ? visit.url : visit.url.pathname
      if (href.includes("governance/storage")) {
        visit.showProgress = false
      }
    })
    return remove
  }, [])

  const breadcrumbs = useMemo(() => pathToBreadcrumbs(currentPath, rootPath), [currentPath, rootPath])

  const filteredFolderTree = useMemo(() => {
    const q = folderSearchQuery.trim().toLowerCase()
    if (q === "") return folderTree
    if ("governance".includes(q)) return folderTree
    return filterFolderTree(folderTree, folderSearchQuery)
  }, [folderTree, folderSearchQuery])

  const isFileSearchMode = searchQuery.trim() !== "" && searchResults !== null

  const treeExpanded = useMemo(() => {
    if (folderSearchQuery.trim()) {
      const all = new Set<string>([rootPath])
      collectAllFolderPaths(filteredFolderTree, all)
      return all
    }
    if (isFileSearchMode && searchResults.length > 0) {
      return expandedForFileSearchResults(searchResults, folderTree, rootPath)
    }
    return expanded
  }, [
    folderSearchQuery,
    filteredFolderTree,
    expanded,
    rootPath,
    isFileSearchMode,
    searchResults,
    folderTree,
  ])

  const navigateToFolder = useCallback(
    (path: string) => {
      setExpanded(expandedForPath(path, folderTree, rootPath))
      if (path === currentPath && !searchQuery.trim()) {
        return
      }
      folderLoadVisit(path, { path, q: searchQuery.trim() || undefined })
    },
    [folderTree, rootPath, currentPath, searchQuery, folderLoadVisit]
  )

  const toggleExpanded = useCallback(
    (path: string) => {
      setExpanded((prev) => {
        if (prev.has(path)) {
          const branch = collectExpandedPaths(folderTree, path, [rootPath])
          const idx = branch.indexOf(path)
          const next = new Set(idx > 0 ? branch.slice(0, idx) : [])
          if (next.size === 0 && path !== rootPath) {
            next.add(rootPath)
          }
          return next
        }
        return expandedForPath(path, folderTree, rootPath)
      })
    },
    [folderTree, rootPath]
  )

  useEffect(() => {
    setSearchQuery(initialSearchQuery)
  }, [initialSearchQuery])

  const searchInitialized = useRef(false)

  useEffect(() => {
    if (!provisioned) return
    if (!searchInitialized.current) {
      searchInitialized.current = true
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const path = currentPathRef.current
      const q = searchQuery.trim()
      folderLoadVisit(path, { path, q: q || undefined })
      debounceRef.current = null
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery, provisioned, folderLoadVisit])

  const displayFiles = searchQuery.trim() !== "" && searchResults !== null ? searchResults : files
  const isSearchMode = searchQuery.trim() !== ""
  const isLoadingFiles = loadingPath !== null
  const currentFolderLabel =
    breadcrumbs[breadcrumbs.length - 1]?.name ?? "Governance"

  const handleProvision = () => {
    setProvisioning(true)
    router.post(route("governance.storage.provision"), {}, {
      ...SILENT_VISIT,
      preserveScroll: true,
      onFinish: () => setProvisioning(false),
      onSuccess: () => toast.success("Governance folders synced."),
      onError: () => toast.error("Could not create folders."),
    })
  }

  return (
    <AppLayout>
      <Head title="Governance Storage" />

      <div className="w-full min-h-screen bg-background">
        <div
          className="border-b border-purple-200 dark:border-purple-500/20"
          style={{
            background: `linear-gradient(135deg, ${BRAND.fromMuted} 0%, rgba(147,51,234,0.2) 40%, rgba(37,99,235,0.15) 100%)`,
          }}
        >
          <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
                >
                  <HardDrive className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">Governance Storage</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Organize bylaws, board records, compliance documents, and more in Dropbox.
                  </p>
                </div>
              </div>
              {dropboxConnected && provisioned && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleProvision}
                    disabled={provisioning}
                    className="border-purple-200 dark:border-purple-500/30"
                  >
                    {provisioning ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Sync folders
                  </Button>
                  <Link
                    href={integrationsDropboxUrl}
                    className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                  >
                    Dropbox settings
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
          {!dropboxConnected ? (
            <section className="mx-auto max-w-md">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                <div className="p-8 sm:p-10 flex flex-col items-center text-center">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg mb-6"
                    style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
                  >
                    <Cloud className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Connect Dropbox</h2>
                  <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
                    Connect your organization&apos;s Dropbox account to create the full governance folder structure
                    and manage documents from this page.
                  </p>
                  <a
                    href={dropboxConnectUrl}
                    className="inline-flex items-center justify-center gap-2 min-w-[200px] h-12 px-6 rounded-xl text-white font-semibold shadow-lg transition-all hover:opacity-90"
                    style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
                  >
                    <Cloud className="w-5 h-5" />
                    Connect with Dropbox
                  </a>
                </div>
              </div>
            </section>
          ) : !provisioned ? (
            <section className="mx-auto max-w-lg">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                <div className="p-8 sm:p-10 flex flex-col items-center text-center">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg mb-6"
                    style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
                  >
                    <FolderOpen className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Create governance folders</h2>
                  <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
                    Dropbox is connected. Create the full governance folder structure in your Dropbox account
                    before you can browse folders or manage files here.
                  </p>
                  <Button
                    onClick={handleProvision}
                    disabled={provisioning}
                    className="min-w-[220px] h-12 rounded-xl text-white font-semibold shadow-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90"
                  >
                    {provisioning ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Creating folders…
                      </>
                    ) : (
                      <>
                        <Folder className="h-5 w-5 mr-2" />
                        Create governance folders
                      </>
                    )}
                  </Button>
                  <Link
                    href={integrationsDropboxUrl}
                    className="mt-4 text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                  >
                    Dropbox settings
                  </Link>
                </div>
              </div>
            </section>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Folder tree sidebar */}
              <aside className="w-full lg:w-72 xl:w-80 shrink-0 lg:block">
                <div className="rounded-2xl border border-border bg-card p-3 min-h-[320px] max-h-[calc(100vh-220px)] flex flex-col gap-2 lg:sticky lg:top-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">
                    Folder structure
                  </p>
                  <div className="relative px-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      type="search"
                      placeholder="Search folders…"
                      value={folderSearchQuery}
                      onChange={(e) => setFolderSearchQuery(e.target.value)}
                      className="h-8 pl-8 pr-8 text-sm"
                    />
                    {folderSearchQuery.trim() !== "" && (
                      <button
                        type="button"
                        aria-label="Clear folder search"
                        onClick={() => setFolderSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1">
                    {folderSearchQuery.trim() !== "" && filteredFolderTree.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6 px-2">
                        No folders match &quot;{folderSearchQuery.trim()}&quot;
                      </p>
                    ) : (
                      <FolderTreeItem
                        node={{ name: "Governance", path: rootPath, children: filteredFolderTree }}
                        currentPath={currentPath}
                        loadingPath={loadingPath}
                        expanded={treeExpanded}
                        onToggle={toggleExpanded}
                        onSelect={navigateToFolder}
                        folderSearchQuery={folderSearchQuery}
                        folderFileCounts={folderFileCounts}
                      />
                    )}
                  </div>
                </div>
              </aside>

              {/* Main content */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* Breadcrumb + actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <nav className="flex flex-wrap items-center gap-1 text-sm min-w-0">
                    {breadcrumbs.map((crumb, i) => (
                      <span key={crumb.path} className="flex items-center gap-1 min-w-0">
                        {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        <button
                          type="button"
                          onClick={() => navigateToFolder(crumb.path)}
                          disabled={loadingPath === crumb.path}
                          className={`inline-flex items-center gap-1 truncate max-w-[200px] hover:underline cursor-pointer disabled:opacity-70 ${
                            i === breadcrumbs.length - 1
                              ? "font-medium text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {loadingPath === crumb.path && (
                            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-purple-600" />
                          )}
                          {crumb.name}
                        </button>
                      </span>
                    ))}
                  </nav>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      disabled={isSearchMode}
                      onClick={() => setShowUploadScreen(true)}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload files
                    </Button>
                  </div>
                </div>

                {showUploadScreen ? (
                  <StorageUploadScreen
                    folderPath={currentPath}
                    folderLabel={currentFolderLabel}
                    onClose={() => setShowUploadScreen(false)}
                  />
                ) : (
                  <>
                    {/* Search */}
                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search all governance files…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10"
                      />
                    </div>

                    {/* File cards */}
                    <div className="rounded-2xl border border-border bg-card/50 overflow-hidden relative min-h-[220px]">
                      {isLoadingFiles && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/75 backdrop-blur-[1px]">
                          <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
                          <p className="text-sm text-muted-foreground">Loading folder contents…</p>
                        </div>
                      )}
                      {displayFiles.length === 0 && !isLoadingFiles ? (
                        <div className="py-16 text-center px-4">
                          <FolderOpen className="mx-auto h-12 w-12 text-purple-600/40 mb-4" />
                          <p className="font-medium text-foreground">
                            {isSearchMode ? `No results for "${searchQuery.trim()}"` : "No files in this folder"}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {isSearchMode
                              ? "Try a different search term."
                              : "Upload documents to keep your governance records organized."}
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 sm:p-5">
                          {!isLoadingFiles && displayFiles.length > 0 && (
                            <p className="text-sm text-muted-foreground mb-4">
                              {displayFiles.length} file{displayFiles.length === 1 ? "" : "s"}
                            </p>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                            {displayFiles.map((file) => (
                              <FileCard key={file.path_display} file={file} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {isSearchMode && displayFiles.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Showing {displayFiles.length} result{displayFiles.length === 1 ? "" : "s"} across all governance
                        folders.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </AppLayout>
  )
}
