"use client"

import React, { useState, useCallback } from "react"
import { UploadCloud, XCircle, ImageIcon } from "lucide-react"
import { Button } from "@/components/admin/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/admin/ui/input"

interface ImageUploadProps {
  label: string
  value: string | null // Current image URL
  onChange: (file: File | null) => void // Callback for when a file is selected/cleared
  disabled?: boolean
  processing?: boolean
  /** Laravel-style limit in kilobytes (e.g. 5120 for 5MB). If set, rejects larger files before POST so nginx cannot return 413. */
  maxFileSizeKb?: number
  /** Unique id for the file input when multiple uploads are on one form. */
  inputId?: string
}

export function ImageUpload({ label, value, onChange, disabled, processing, maxFileSizeKb, inputId = "image-upload-input" }: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(value)
  const [sizeError, setSizeError] = useState<string | null>(null)

  // Update preview when value prop changes (e.g., on initial load or form reset)
  React.useEffect(() => {
    setPreviewUrl(value)
  }, [value])

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] || null
      setSizeError(null)

      if (file && maxFileSizeKb != null && file.size > maxFileSizeKb * 1024) {
        const mb = Math.round((maxFileSizeKb / 1024) * 10) / 10
        setSizeError(`File is too large. Maximum size is ${mb} MB.`)
        onChange(null)
        setPreviewUrl(value ?? null)
        event.target.value = ""
        return
      }

      onChange(file) // Pass the file object to the parent form

      if (file) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setPreviewUrl(null)
      }
    },
    [onChange, maxFileSizeKb, value],
  )

  const handleClearImage = useCallback(() => {
    setSizeError(null)
    onChange(null) // Clear the file in the parent form
    setPreviewUrl(null) // Clear the preview
    // Reset the input element value to allow re-uploading the same file
    const fileInput = document.getElementById(inputId) as HTMLInputElement
    if (fileInput) {
      fileInput.value = ""
    }
  }, [onChange, inputId])

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </Label>
      <div className="flex flex-col items-center justify-center w-full border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 relative">
        {previewUrl ? (
          <div className="relative w-full h-48 rounded-md overflow-hidden">
            <img src={previewUrl || "/placeholder.svg"} alt="Image Preview" className="w-full h-full object-cover" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 rounded-full w-8 h-8"
              onClick={handleClearImage}
              disabled={disabled || processing}
            >
              <XCircle className="w-4 h-4" />
              <span className="sr-only">Remove image</span>
            </Button>
          </div>
        ) : (
          <>
            <UploadCloud className="w-12 h-12 text-slate-400 mb-3" />
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
              Drag & drop an image here, or click to select
            </p>
            <Button
              type="button"
              variant="outline"
              className="pointer-events-none bg-transparent" // Prevent button from being clickable directly
              disabled={disabled || processing}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Select Image
            </Button>
            <Input
              id={inputId}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={disabled || processing}
            />
          </>
        )}
      </div>
      {sizeError && <p className="text-sm text-red-600 dark:text-red-400">{sizeError}</p>}
      {maxFileSizeKb != null && !sizeError && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Maximum file size {Math.round((maxFileSizeKb / 1024) * 10) / 10} MB.
        </p>
      )}
      {(disabled || processing) && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {processing ? "Uploading..." : "Disabled during form submission."}
        </p>
      )}
    </div>
  )
}
