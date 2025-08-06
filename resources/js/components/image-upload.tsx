"use client"

import React from "react"

import { useState, useCallback } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/admin/ui/button"
import { Input } from "@/components/admin/ui/input"
import { XCircle, UploadCloud } from "lucide-react"
import { toast } from "sonner"

interface ImageUploadProps {
  id?: string
  label: string
  value: string | null // For displaying current image URL
  onChange: (file: File | null) => void
  error?: string
}

export default function ImageUpload({ id, label, value, onChange, error }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value)

  // Update preview when value prop changes (e.g., on edit page load)
  React.useEffect(() => {
    setPreview(value)
  }, [value])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          // 2MB limit
          toast.error("Image size exceeds 2MB limit.")
          onChange(null)
          setPreview(null)
          e.target.value = "" // Clear the input
          return
        }
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreview(reader.result as string)
          onChange(file)
        }
        reader.readAsDataURL(file)
      } else {
        setPreview(null)
        onChange(null)
      }
    },
    [onChange],
  )

  const handleRemoveImage = useCallback(() => {
    setPreview(null)
    onChange(null)
    // Optionally clear the file input if it exists
    const inputElement = document.getElementById(id || "image-upload") as HTMLInputElement
    if (inputElement) {
      inputElement.value = ""
    }
  }, [onChange, id])

  return (
    <div className="space-y-2">
      <Label htmlFor={id || "image-upload"} className="text-gray-700 dark:text-gray-300">
        {label}
      </Label>
      <div className="flex items-center space-x-4">
        <div className="relative w-32 h-32 border border-gray-300 dark:border-gray-700 rounded-md overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          {preview ? (
            <img src={preview || "/placeholder.svg"} alt="Image Preview" className="w-full h-full object-cover" />
          ) : (
            <UploadCloud className="h-12 w-12 text-gray-400 dark:text-gray-600" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <Input
            id={id || "image-upload"}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 dark:text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              dark:file:bg-blue-900 dark:file:text-blue-300 dark:hover:file:bg-blue-800
              bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
          />
          {preview && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemoveImage}
              className="w-full bg-white dark:bg-gray-900 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/50"
            >
              <XCircle className="h-4 w-4 mr-2" /> Remove Image
            </Button>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  )
}
