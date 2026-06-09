"use client"

import { useCallback, useRef, useState } from "react"
import { router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  Upload,
  FileText,
  X,
  Loader2,
  Plus,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { toast } from "react-hot-toast"

const BRAND = {
  from: "#9333ea",
  to: "#2563eb",
}

type UploadStatus = "pending" | "uploading" | "done" | "error"

export type PendingUpload = {
  id: string
  file: File
  displayName: string
  status: UploadStatus
  progress: number
  error?: string
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function defaultDisplayName(file: File): string {
  const lastDot = file.name.lastIndexOf(".")
  return lastDot > 0 ? file.name.slice(0, lastDot) : file.name
}

function fileExtension(file: File): string {
  const lastDot = file.name.lastIndexOf(".")
  return lastDot > 0 ? file.name.slice(lastDot) : ""
}

function getCsrfToken(): string {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? ""
}

function uploadFileWithProgress(
  file: File,
  folderPath: string,
  fileName: string,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder_path", folderPath)
    formData.append("file_name", fileName)

    xhr.open("POST", route("governance.storage.upload"))
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
        const data = JSON.parse(xhr.responseText) as { success?: boolean; message?: string }
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          onProgress(100)
          resolve()
          return
        }
        reject(new Error(data.message ?? "Upload failed"))
      } catch {
        reject(new Error("Upload failed"))
      }
    }

    xhr.onerror = () => reject(new Error("Network error during upload"))
    xhr.send(formData)
  })
}

type Props = {
  folderPath: string
  folderLabel: string
  onClose: () => void
}

export function StorageUploadScreen({ folderPath, folderLabel, onClose }: Props) {
  const [items, setItems] = useState<PendingUpload[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList?.length) return
    const next: PendingUpload[] = []
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      next.push({
        id: `${Date.now()}-${i}-${file.name}`,
        file,
        displayName: defaultDisplayName(file),
        status: "pending",
        progress: 0,
      })
    }
    setItems((prev) => [...prev, ...next])
  }, [])

  const removeItem = (id: string) => {
    if (isUploading) return
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const updateName = (id: string, displayName: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, displayName } : item))
    )
  }

  const pendingCount = items.filter((i) => i.status === "pending").length
  const doneCount = items.filter((i) => i.status === "done").length

  const handleUploadAll = async () => {
    const queue = items.filter((i) => i.status === "pending" || i.status === "error")
    if (queue.length === 0) {
      toast.error("Add at least one file to upload.")
      return
    }

    const invalid = queue.find((i) => i.displayName.trim() === "")
    if (invalid) {
      toast.error("Every file needs a name.")
      return
    }

    setIsUploading(true)
    let successCount = 0

    for (const item of queue) {
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, status: "uploading", progress: 0, error: undefined } : row
        )
      )

      try {
        await uploadFileWithProgress(
          item.file,
          folderPath,
          item.displayName.trim(),
          (progress) => {
            setItems((prev) =>
              prev.map((row) => (row.id === item.id ? { ...row, progress } : row))
            )
          }
        )
        successCount++
        setItems((prev) =>
          prev.map((row) =>
            row.id === item.id ? { ...row, status: "done", progress: 100 } : row
          )
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed"
        setItems((prev) =>
          prev.map((row) =>
            row.id === item.id ? { ...row, status: "error", error: message } : row
          )
        )
      }
    }

    setIsUploading(false)

    if (successCount > 0) {
      toast.success(
        successCount === 1 ? "1 file uploaded." : `${successCount} files uploaded.`
      )
      router.get(
        route("governance.storage.index"),
        { path: folderPath },
        {
          showProgress: false,
          preserveUrl: true,
          preserveScroll: true,
          only: ["files", "currentPath", "searchQuery", "searchResults", "folderFileCounts"],
        }
      )
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div
        className="border-b border-purple-200/60 dark:border-purple-500/20 px-4 sm:px-6 py-5"
        style={{
          background: `linear-gradient(135deg, rgba(147,51,234,0.08) 0%, rgba(37,99,235,0.06) 100%)`,
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 mt-0.5"
              onClick={onClose}
              disabled={isUploading}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Upload files</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Uploading to <span className="font-medium text-foreground">{folderLabel}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Any file type supported · Large files upload in chunks to Dropbox
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              aria-label="Select files to upload"
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ""
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add files
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isUploading || items.length === 0}
              onClick={() => void handleUploadAll()}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {pendingCount > 0 ? `${pendingCount} file${pendingCount === 1 ? "" : "s"}` : "files"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click()
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            if (!isUploading) addFiles(e.dataTransfer.files)
          }}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/20"
              : "border-purple-200 dark:border-purple-500/30 hover:border-purple-400 hover:bg-muted/30"
          }`}
        >
          <Upload className="mx-auto h-10 w-10 text-purple-600/70 dark:text-purple-400/70 mb-3" />
          <p className="font-medium text-foreground">Drop files here or click to browse</p>
          <p className="text-sm text-muted-foreground mt-1">Select multiple files at once</p>
        </div>

        {items.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                {items.length} file{items.length === 1 ? "" : "s"} selected
                {doneCount > 0 ? ` · ${doneCount} uploaded` : ""}
              </p>
            </div>
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-border bg-muted/20 p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
                    >
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(item.file.size)}</p>
                    </div>
                    {item.status === "done" && (
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    )}
                    {item.status === "error" && (
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                    )}
                    {item.status === "pending" && !isUploading && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeItem(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`upload-name-${item.id}`} className="text-xs text-muted-foreground">
                      Save as
                      {fileExtension(item.file) ? (
                        <span className="text-foreground/70">{fileExtension(item.file)}</span>
                      ) : null}
                    </Label>
                    <Input
                      id={`upload-name-${item.id}`}
                      value={item.displayName}
                      disabled={isUploading || item.status === "uploading" || item.status === "done"}
                      onChange={(e) => updateName(item.id, e.target.value)}
                      placeholder="File name"
                      className="h-9"
                    />
                  </div>
                  {(item.status === "uploading" || item.status === "done") && (
                    <Progress value={item.progress} className="h-1.5" />
                  )}
                  {item.status === "error" && item.error && (
                    <p className="text-xs text-destructive">{item.error}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-4">
            No files selected yet. Add files above to set names and upload.
          </p>
        )}
      </div>
    </div>
  )
}
