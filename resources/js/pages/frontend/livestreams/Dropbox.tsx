"use client"

import { useState, useEffect, useRef } from "react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Head, Link, router } from "@inertiajs/react"
import axios from "axios"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { ArrowLeft, Cloud, MoreHorizontal, Download, Pencil, Trash2, Video, FileVideo, HardDrive, Search, Loader2, Link2Off, ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { toast } from "react-hot-toast"
import { PageHead } from "@/components/frontend/PageHead"

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

interface Props {
  dropboxLinked: boolean
  dropboxRedirectUri?: string | null
  dropboxFolderName: string
  dropboxFolderPath: string
  dropboxFiles: DropboxFile[]
  backUrl?: string
}

export default function SupporterDropbox({
  dropboxLinked,
  dropboxRedirectUri,
  dropboxFolderPath = "",
  dropboxFiles = [],
  backUrl = "/livestreams/supporter",
}: Props) {
  const PER_PAGE = 24
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<DropboxFile[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filesToShow = searchQuery.trim() !== "" ? (searchResults ?? []) : dropboxFiles
  const totalItems = filesToShow.length
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / PER_PAGE)
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1
  const endItem = totalItems === 0 ? 0 : Math.min(currentPage * PER_PAGE, totalItems)
  const paginatedFiles = filesToShow.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, totalItems])

  useEffect(() => {
    if (currentPage > totalPages && totalPages >= 1) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = searchQuery.trim()
    if (q === "") {
      setSearchResults(null)
      setSearching(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(() => {
      axios
        .get(route("integrations.dropbox.search"), { params: { q } })
        .then((res) => {
          setSearchResults(res.data.files ?? [])
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false))
      debounceRef.current = null
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery])

  const isSearching = searchQuery.trim() !== "" && searching

  return (
    <FrontendLayout>
      <PageHead title="Dropbox recordings" description="View and manage your meeting recordings saved to Dropbox." />
      <Head title="Dropbox recordings" />

      <div className="min-h-screen bg-background">
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
                        ? "Recordings saved to your Dropbox. View, download, or manage below."
                        : "Connect Dropbox to save meeting recordings to your account."}
                    </p>
                  </div>
                </div>
              </div>
              {dropboxLinked && (
                <div className="shrink-0">
                  <DisconnectButton />
                </div>
              )}
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
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="search"
                      placeholder="Search in Dropbox…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-9 h-10 bg-muted/50 border-border focus-visible:ring-2 focus-visible:ring-purple-500/50"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                </div>
                {!searchQuery.trim() && dropboxFiles.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {totalPages > 1
                      ? `${dropboxFiles.length} file${dropboxFiles.length === 1 ? "" : "s"} · Page ${currentPage} of ${totalPages}`
                      : `${dropboxFiles.length} file${dropboxFiles.length === 1 ? "" : "s"}`}
                  </p>
                )}

                {isSearching ? (
                  <div className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-600 dark:text-purple-400" />
                    <span className="text-sm">Searching Dropbox…</span>
                  </div>
                ) : filesToShow.length === 0 ? (
                  <div className="py-20 text-center rounded-2xl border-2 border-dashed border-purple-200 dark:border-purple-500/20 bg-muted/20" style={{ background: `linear-gradient(135deg, ${BRAND.fromMuted}, ${BRAND.toMuted})` }}>
                    {searchQuery.trim() ? (
                      <>
                        <Search className="mx-auto h-14 w-14 text-purple-600/50 dark:text-purple-400/50 mb-4" />
                        <p className="text-base font-medium text-foreground">No results for &quot;{searchQuery.trim()}&quot;</p>
                        <p className="text-sm text-muted-foreground mt-1">Try a different search term.</p>
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
                      {paginatedFiles.map((file) => (
                        <FileCard key={file.path_display} file={file} />
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
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage <= 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Prev
                          </Button>
                          <div className="flex items-center gap-0.5 mx-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                              .filter((p) => {
                                if (totalPages <= 7) return true
                                if (p === 1 || p === totalPages) return true
                                if (p >= currentPage - 1 && p <= currentPage + 1) return true
                                return false
                              })
                              .map((p, i, arr) => {
                                const showEllipsisBefore = i > 0 && p - arr[i - 1] > 1
                                return (
                                  <span key={p} className="flex items-center gap-0.5">
                                    {showEllipsisBefore && <span className="px-1.5 text-muted-foreground">…</span>}
                                    <Button
                                      variant={currentPage === p ? "default" : "ghost"}
                                      size="sm"
                                      className={`h-9 w-9 min-w-9 p-0 ${currentPage === p ? "bg-linear-to-r from-purple-600 to-blue-600 text-white" : ""}`}
                                      onClick={() => setCurrentPage(p)}
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
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
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
            <section className="mx-auto flex flex-col rounded-2xl border border-purple-200 dark:border-purple-500/20 bg-card shadow-lg p-8 sm:p-10 max-w-xl min-h-[280px]" style={{ background: `linear-gradient(135deg, ${BRAND.fromMuted}, ${BRAND.toMuted})` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md" style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}>
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Connect Dropbox</h2>
                  <p className="text-sm text-muted-foreground">
                    Meeting recordings will be saved automatically. You can download, rename, or delete files from this page.
                  </p>
                </div>
              </div>
              {dropboxRedirectUri && (
                <div className="mt-0 mb-4 rounded-xl border border-purple-200 dark:border-purple-500/30 bg-background/80 dark:bg-background/50 p-4">
                  <p className="text-sm font-medium text-foreground mb-1">Need the redirect URI?</p>
                  <p className="text-xs text-muted-foreground mb-2">Add this URL in your Dropbox app settings:</p>
                  <code className="block text-xs bg-muted px-3 py-2 rounded border border-border break-all select-all text-foreground">
                    {dropboxRedirectUri}
                  </code>
                </div>
              )}
              <div className="mt-auto flex justify-end">
                <Button
                  asChild
                  size="lg"
                  className="rounded-lg text-white shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
                >
                  <a href={route("integrations.dropbox.redirect")} className="inline-flex items-center gap-2">
                    <Cloud className="w-5 h-5" />
                    Connect with Dropbox
                  </a>
                </Button>
              </div>
            </section>
          )}
        </main>
      </div>
    </FrontendLayout>
  )
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

function isVideoFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  return ["webm", "mp4", "mkv", "mov", "avi", "m4v"].includes(ext)
}

function displayNameWithoutExtension(name: string): string {
  const lastDot = name.lastIndexOf(".")
  return lastDot > 0 ? name.slice(0, lastDot) : name
}

function FileCard({ file }: { file: DropboxFile }) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [newName, setNewName] = useState(file.name)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const downloadUrl = route("integrations.dropbox.download", { path: file.path_display })
  const showVideo = isVideoFile(file.name)

  const handleRename = () => {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === file.name) {
      setRenameOpen(false)
      return
    }
    setRenaming(true)
    router.put(route("integrations.dropbox.file.rename"), { path: file.path_display, new_name: trimmed }, {
      preserveScroll: true,
      onFinish: () => { setRenaming(false); setRenameOpen(false) },
      onSuccess: () => toast.success("File renamed."),
      onError: () => toast.error("Could not rename file."),
    })
  }

  const handleDelete = () => {
    setDeleteConfirmOpen(false)
    setDeleting(true)
    router.delete(route("integrations.dropbox.file.delete"), {
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
