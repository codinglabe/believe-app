"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import { RefreshCw, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { showErrorToast } from "@/lib/toast"

interface QrCodeUploadProps {
  id?: string
  existingUrl?: string | null
  file: File | null
  onChange: (file: File | null) => void
  disabled?: boolean
  error?: string
  className?: string
  maxSizeMB?: number
}

export function QrCodeUpload({
  id,
  existingUrl,
  file,
  onChange,
  disabled,
  error,
  className,
  maxSizeMB = 5,
}: QrCodeUploadProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingUrl ?? null)

  useEffect(() => {
    if (file) return
    setPreviewUrl(existingUrl ?? null)
  }, [existingUrl, file])

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0] ?? null
      if (!selected) return

      if (!selected.type.startsWith("image/")) {
        showErrorToast("Please upload an image file (PNG, JPG, etc.).")
        e.target.value = ""
        return
      }

      const maxBytes = maxSizeMB * 1024 * 1024
      if (selected.size > maxBytes) {
        showErrorToast(`QR image must be ${maxSizeMB}MB or smaller.`)
        e.target.value = ""
        return
      }

      onChange(selected)
    },
    [maxSizeMB, onChange],
  )

  const openPicker = () => {
    if (!disabled) inputRef.current?.click()
  }

  const hasPreview = Boolean(previewUrl)

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled}
        onChange={handleFileChange}
      />

      {hasPreview ? (
        <div className="rounded-xl border bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/40">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <div className="relative shrink-0 overflow-hidden rounded-lg border bg-white p-2 dark:border-gray-600 dark:bg-gray-950">
              <img
                src={previewUrl!}
                alt="Cash App QR code preview"
                className="h-36 w-36 object-contain"
              />
              {file && (
                <span className="absolute bottom-1.5 left-1.5 right-1.5 rounded bg-amber-500/95 px-1.5 py-0.5 text-center text-[10px] font-medium text-white">
                  New — save to apply
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col items-center gap-2 sm:items-start">
              <p className="text-center text-sm text-muted-foreground sm:text-left">
                {file
                  ? "Preview of your new QR code. Save settings to replace the current one."
                  : "This QR code is shown to donors during manual Cash App payment."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={openPicker}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Change QR code
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={openPicker}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 transition-colors",
            "border-gray-300 bg-gray-50/50 hover:border-purple-400 hover:bg-purple-50/50",
            "dark:border-gray-600 dark:bg-gray-900/30 dark:hover:border-purple-600 dark:hover:bg-purple-950/30",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload QR code</span>
          <span className="text-xs text-muted-foreground">PNG or JPG, max {maxSizeMB}MB</span>
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
