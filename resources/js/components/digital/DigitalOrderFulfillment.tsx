"use client"

import React, { useRef, useState } from "react"
import axios from "axios"
import { FileDown, Upload, Trash2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { showErrorToast, showSuccessToast } from "@/lib/toast"

export interface DigitalDeliveryRow {
  id: number
  original_filename: string
  file_size?: number
}

export interface DigitalOrderLine {
  id: number
  name: string
  is_digital?: boolean
  digital_deliveries?: DigitalDeliveryRow[]
}

interface Props {
  orderId: number
  items: DigitalOrderLine[]
  uploadPath: (orderId: number, itemId: number) => string
  deletePath?: (orderId: number, itemId: number, deliveryId: number) => string
  readOnly?: boolean
}

function csrfHeader(): Record<string, string> {
  const token =
    typeof document !== "undefined"
      ? document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? ""
      : ""
  return token ? { "X-CSRF-TOKEN": token } : {}
}

function formatBytes(bytes?: number): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DigitalOrderFulfillment({
  orderId,
  items,
  uploadPath,
  deletePath,
  readOnly = false,
}: Props) {
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const [uploading, setUploading] = useState<number | null>(null)
  const [localItems, setLocalItems] = useState(items)

  React.useEffect(() => {
    setLocalItems(items)
  }, [items])

  const digitalLines = localItems.filter((i) => i.is_digital)
  if (digitalLines.length === 0) return null

  const uploadFiles = async (itemId: number, files: FileList | null) => {
    if (!files?.length) return
    setUploading(itemId)
    const formData = new FormData()
    Array.from(files).forEach((f) => formData.append("files[]", f))
    try {
      const { data } = await axios.post(uploadPath(orderId, itemId), formData, {
        headers: { ...csrfHeader(), "Content-Type": "multipart/form-data" },
      })
      const newDeliveries = (data.deliveries ?? []) as DigitalDeliveryRow[]
      setLocalItems((prev) =>
        prev.map((line) =>
          line.id === itemId
            ? {
                ...line,
                digital_deliveries: [
                  ...(line.digital_deliveries ?? []),
                  ...newDeliveries.map((d) => ({
                    id: d.id,
                    original_filename: d.original_filename,
                    file_size: d.file_size,
                  })),
                ],
              }
            : line
        )
      )
      showSuccessToast("Files uploaded. The buyer can download them from their order.")
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? e.response?.data?.error ?? e.message : "Upload failed"
      showErrorToast(String(msg))
    } finally {
      setUploading(null)
      const input = fileRefs.current[itemId]
      if (input) input.value = ""
    }
  }

  const removeDelivery = async (itemId: number, deliveryId: number) => {
    if (!deletePath) return
    try {
      await axios.delete(deletePath(orderId, itemId, deliveryId), { headers: csrfHeader() })
      setLocalItems((prev) =>
        prev.map((line) =>
          line.id === itemId
            ? {
                ...line,
                digital_deliveries: (line.digital_deliveries ?? []).filter((d) => d.id !== deliveryId),
              }
            : line
        )
      )
      showSuccessToast("File removed.")
    } catch {
      showErrorToast("Could not remove file.")
    }
  }

  return (
    <div className="space-y-4">
      {digitalLines.map((line) => (
        <div
          key={line.id}
          className="rounded-lg border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-800 dark:bg-violet-950/30"
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{line.name}</p>
              <p className="text-xs text-muted-foreground">Digital product — upload books, PDFs, or documents for the buyer.</p>
            </div>
            {!readOnly && (
              <>
                <input
                  ref={(el) => {
                    fileRefs.current[line.id] = el
                  }}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.epub,.doc,.docx,.txt,.zip,.xls,.xlsx,.ppt,.pptx,.csv,.mp3,.mp4"
                  onChange={(e) => uploadFiles(line.id, e.target.files)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploading === line.id}
                  onClick={() => fileRefs.current[line.id]?.click()}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {uploading === line.id ? "Uploading…" : "Upload files"}
                </Button>
              </>
            )}
          </div>
          {(line.digital_deliveries ?? []).length > 0 ? (
            <ul className="space-y-2">
              {(line.digital_deliveries ?? []).map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-sm dark:bg-gray-900"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 shrink-0 text-violet-600" />
                    <span className="truncate">{d.original_filename}</span>
                    {d.file_size ? (
                      <span className="text-xs text-muted-foreground shrink-0">{formatBytes(d.file_size)}</span>
                    ) : null}
                  </span>
                  {!readOnly && deletePath && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="shrink-0 h-8 w-8"
                      onClick={() => removeDelivery(line.id, d.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
          )}
        </div>
      ))}
    </div>
  )
}

export function DigitalDownloadsList({
  downloads,
}: {
  downloads: { id: number; original_filename: string; file_size?: number; download_url: string }[]
}) {
  if (!downloads.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Your files will appear here once the seller uploads them.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {downloads.map((d) => (
        <li key={d.id}>
          <a
            href={d.download_url}
            className="inline-flex items-center gap-2 text-sm font-medium text-violet-700 hover:underline dark:text-violet-300"
          >
            <FileDown className="h-4 w-4" />
            {d.original_filename}
            {d.file_size ? (
              <span className="text-xs font-normal text-muted-foreground">({formatBytes(d.file_size)})</span>
            ) : null}
          </a>
        </li>
      ))}
    </ul>
  )
}
