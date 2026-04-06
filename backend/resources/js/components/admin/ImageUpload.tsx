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
}

export function ImageUpload({ label, value, onChange, disabled, processing }: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(value)

  // Update preview when value prop changes (e.g., on initial load or form reset)
  React.useEffect(() => {
    setPreviewUrl(value)
  }, [value])

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] || null
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
    [onChange],
  )

  const handleClearImage = useCallback(() => {
    onChange(null) // Clear the file in the parent form
    setPreviewUrl(null) // Clear the preview
    // Reset the input element value to allow re-uploading the same file
    const fileInput = document.getElementById("image-upload-input") as HTMLInputElement
    if (fileInput) {
      fileInput.value = ""
    }
  }, [onChange])

  return (
    <div className="space-y-2">
      <Label htmlFor="image-upload-input" className="text-sm font-medium">
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
              id="image-upload-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={disabled || processing}
            />
          </>
        )}
      </div>
      {(disabled || processing) && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {processing ? "Uploading..." : "Disabled during form submission."}
        </p>
      )}
    </div>
  )
}
