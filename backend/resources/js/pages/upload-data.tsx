"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InputFile } from "@/components/ui/input-file"
import AppLayout from "@/layouts/app-layout"
import type { BreadcrumbItem } from "@/types"
import { Head, router } from "@inertiajs/react"
import { useRef, useState } from "react"
import { FileUp, Loader2, CheckCircle, AlertCircle } from "lucide-react"

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "Upload Data",
    href: "/dashboard",
  },
]

interface UploadResponse {
  success: boolean
  file_id?: number
  message: string
}

export default function UploadData() {
  const uploadFileInput = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
  const [statusMessage, setStatusMessage] = useState("")

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = [".csv", ".xlsx", ".xls"]
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()

      if (!allowedTypes.includes(fileExtension)) {
        setStatusMessage("Please select a valid CSV or Excel file")
        setUploadStatus("error")
        setSelectedFile(null)
        return
      }

      // Validate file size (500MB max)
      const maxSize = 500 * 1024 * 1024 // 500MB in bytes
      if (file.size > maxSize) {
        setStatusMessage("File size must be less than 500MB")
        setUploadStatus("error")
        setSelectedFile(null)
        return
      }

      setSelectedFile(file)
      setUploadStatus("idle")
      setStatusMessage("")
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setStatusMessage("Please select a file first")
      setUploadStatus("error")
      return
    }

    setIsUploading(true)
    setUploadStatus("idle")

    const formData = new FormData()
      formData.append("file", selectedFile)

      // Add CSRF token to form data
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")
    if (csrfToken) {
      formData.append("_token", csrfToken)
    }

    router.post("/upload-excel", formData, {
        forceFormData: true,
        headers: {
            // Include CSRF token in headers as well
            "X-CSRF-TOKEN": csrfToken || "",
          },
      onSuccess: (page) => {
        setIsUploading(false)
        setUploadStatus("success")
        setStatusMessage("File uploaded successfully! Processing started.")

        // Reset form
        setSelectedFile(null)
        if (uploadFileInput.current) {
          uploadFileInput.current.value = ""
        }
      },
      onError: (errors) => {
        setIsUploading(false)
        setUploadStatus("error")

        // Handle validation errors
        if (errors.file) {
          setStatusMessage(errors.file)
        } else {
          setStatusMessage("Upload failed. Please try again.")
        }
      },
      onFinish: () => {
        setIsUploading(false)
      },
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Upload Data" />
      <div className="flex h-full flex-1 flex-col gap-4 rounded-xl py-6 px-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100">Upload Your Data</h1>
          <p className="text-gray-500 text-1xl dark:text-gray-400 mb-6 text-sm">
            Select a file. For files up to 50MB, an editable sample preview will be generated.
          </p>

          <Card className="px-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="inline"></FileUp>
                <span>File Selection</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-2">Select File</label>
                  <InputFile
                    ref={uploadFileInput}
                    accept=".csv,.xlsx,.xls"
                    className="w-full"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                  />
                </div>

                {/* File Info Display */}
                {selectedFile && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <FileUp className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">{selectedFile.name}</span>
                      <span className="text-gray-500">({formatFileSize(selectedFile.size)})</span>
                    </div>
                  </div>
                )}

                {/* Status Message */}
                {statusMessage && (
                  <div
                    className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                      uploadStatus === "success"
                        ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        : uploadStatus === "error"
                          ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                    }`}
                  >
                    {uploadStatus === "success" && <CheckCircle className="w-4 h-4" />}
                    {uploadStatus === "error" && <AlertCircle className="w-4 h-4" />}
                    <span>{statusMessage}</span>
                  </div>
                )}

                <div>
                  <Button
                    type="button"
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading}
                    className="mt-4 cursor-pointer bg-blue-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <FileUp className="w-4 h-4 mr-2" />
                        Upload File
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
