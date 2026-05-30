"use client"

import React, { useRef, useState } from "react"
import axios from "axios"
import { Upload, Trash2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { showErrorToast, showSuccessToast } from "@/lib/toast"

interface CatalogFile {
  id: number
  original_filename: string
  file_size?: number
}

interface Props {
  files: CatalogFile[]
  uploadUrl: string
  onChange?: (files: CatalogFile[]) => void
}

function csrfHeader(): Record<string, string> {
  const token =
    typeof document !== "undefined"
      ? document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? ""
      : ""
  return token ? { "X-CSRF-TOKEN": token } : {}
}

export default function DigitalCatalogFiles({ files: initialFiles, uploadUrl, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState(initialFiles)
  const [uploading, setUploading] = useState(false)

  React.useEffect(() => {
    setFiles(initialFiles)
  }, [initialFiles])

  const update = (next: CatalogFile[]) => {
    setFiles(next)
    onChange?.(next)
  }

  const upload = async (list: FileList | null) => {
    if (!list?.length) return
    setUploading(true)
    const formData = new FormData()
    Array.from(list).forEach((f) => formData.append("files[]", f))
    try {
      const { data } = await axios.post(uploadUrl, formData, {
        headers: { ...csrfHeader(), "Content-Type": "multipart/form-data" },
      })
      const added = (data.files ?? []) as CatalogFile[]
      update([...files, ...added])
      showSuccessToast("Files added to product.")
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? e.response?.data?.error ?? e.message : "Upload failed"
      showErrorToast(String(msg))
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const remove = async (id: number) => {
    try {
      await axios.delete(`/digital-product-files/${id}`, { headers: csrfHeader() })
      update(files.filter((f) => f.id !== id))
      showSuccessToast("File removed.")
    } catch {
      showErrorToast("Could not remove file.")
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-800 dark:bg-violet-950/30">
      <p className="text-sm font-medium text-violet-900 dark:text-violet-100">
        Digital files (optional)
      </p>
      <p className="text-xs text-muted-foreground">
        Pre-upload files to auto-deliver when someone purchases. You can also upload per order later.
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.epub,.doc,.docx,.txt,.zip,.xls,.xlsx,.ppt,.pptx,.csv,.mp3,.mp4"
        onChange={(e) => upload(e.target.files)}
      />
      <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
        <Upload className="h-4 w-4 mr-1" />
        {uploading ? "Uploading…" : "Add files"}
      </Button>
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-2 text-sm rounded-md bg-white px-3 py-2 dark:bg-gray-900">
              <span className="flex items-center gap-2 min-w-0 truncate">
                <FileText className="h-4 w-4 shrink-0" />
                {f.original_filename}
              </span>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => remove(f.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
