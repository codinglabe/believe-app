"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Head } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { FileUp, Loader2, CheckCircle, AlertCircle, Pause, Play } from "lucide-react"
import { InputFile } from "@/components/ui/input-file"

const CHUNK_SIZE = 1024 * 1024 // 1MB chunks

const breadcrumbs = [
  {
    title: "Upload Data",
    href: "/upload",
  },
]

// Helper function to get CSRF token
const getCSRFToken = () => {
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")
  if (!token) {
    console.error("CSRF token not found!")
  }
  return token || ""
}

function ChunkedUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [fileId, setFileId] = useState<string | null>(null)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [totalChunks, setTotalChunks] = useState(0)
  const [currentChunk, setCurrentChunk] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const isUploadingRef = useRef(false)
  const uploadIdRef = useRef<string | null>(null) // Add ref to track uploadId

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const allowedTypes = [".csv", ".xlsx", ".xls"]
      const fileExtension = "." + selectedFile.name.split(".").pop()?.toLowerCase()

      if (!allowedTypes.includes(fileExtension)) {
        setMessage("Please select a valid CSV or Excel file")
        setStatus("error")
        return
      }

      const calculatedTotalChunks = Math.ceil(selectedFile.size / CHUNK_SIZE)
      console.log(`File selected: ${selectedFile.name}, Size: ${selectedFile.size}, Chunks: ${calculatedTotalChunks}`)

      setFile(selectedFile)
      setTotalChunks(calculatedTotalChunks)
      setProgress(0)
      setStatus("idle")
      setMessage("")
      setFileId(null)
      setUploadId(null)
      uploadIdRef.current = null // Reset ref
      setCurrentChunk(0)
      isUploadingRef.current = false
    }
  }

  const uploadChunk = async (chunkIndex: number): Promise<boolean> => {
    if (!file || paused || !isUploadingRef.current) {
      return false
    }

    console.log(`Uploading chunk ${chunkIndex}/${totalChunks}`)
    setCurrentChunk(chunkIndex)

    const start = chunkIndex * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    const chunk = file.slice(start, end)

    const formData = new FormData()
    formData.append("chunk", chunk)
    formData.append("chunkIndex", chunkIndex.toString())
    formData.append("totalChunks", totalChunks.toString())
    formData.append("fileName", file.name)
    formData.append("fileSize", file.size.toString())

    // Use ref value for uploadId - this ensures we have the latest value
    if (uploadIdRef.current) {
      formData.append("uploadId", uploadIdRef.current)
      console.log(`Using uploadId: ${uploadIdRef.current} for chunk ${chunkIndex}`)
    } else {
      console.log(`No uploadId for chunk ${chunkIndex} (first chunk)`)
    }

    try {
      console.log("Sending request to /upload-chunk")

      const response = await fetch("/upload-chunk", {
        method: "POST",
        body: formData,
        headers: {
          "X-CSRF-TOKEN": getCSRFToken(),
          Accept: "application/json",
        },
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Response error:", errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text()
        console.error("Non-JSON response:", responseText.substring(0, 500))
        throw new Error("Server returned HTML instead of JSON. Check Laravel logs.")
      }

      const result = await response.json()
      console.log("Upload result:", result)

      if (result.success) {
        // Update states and refs
        if (result.fileId && !fileId) {
          setFileId(result.fileId)
        }
        if (result.uploadId && !uploadIdRef.current) {
          setUploadId(result.uploadId)
          uploadIdRef.current = result.uploadId // Store in ref for immediate use
          console.log(`Set uploadId: ${result.uploadId}`)
        }
        if (result.progress !== undefined) {
          setProgress(result.progress)
        }

        if (result.isComplete) {
          setStatus("success")
          setMessage(result.message || "File uploaded successfully!")
          setUploading(false)
          isUploadingRef.current = false
          return true
        }

        return true
      } else {
        throw new Error(result.message || "Upload failed")
      }
    } catch (error: any) {
      console.error("Upload error:", error)
      setStatus("error")
      setMessage("Upload failed: " + error.message)
      setUploading(false)
      isUploadingRef.current = false
      return false
    }
  }

  const uploadFile = async () => {
    if (!file) return

    console.log(`Starting upload of ${file.name} (${totalChunks} chunks)`)
    console.log("CSRF Token:", getCSRFToken())

    setUploading(true)
    setStatus("uploading")
    setProgress(0)
    setPaused(false)
    setCurrentChunk(0)
    isUploadingRef.current = true
    uploadIdRef.current = null // Reset uploadId ref

    // Upload chunks sequentially
    for (let i = 0; i < totalChunks; i++) {
      if (!isUploadingRef.current || paused) {
        console.log("Upload stopped or paused")
        break
      }

      const success = await uploadChunk(i)
      if (!success) {
        console.log("Upload failed at chunk", i)
        break
      }

      // Small delay between chunks
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  const togglePause = () => {
    if (paused) {
      console.log("Resuming upload from chunk", currentChunk)
      setPaused(false)
      setUploading(true)
      isUploadingRef.current = true

      // Continue from current chunk
      const continueUpload = async () => {
        for (let i = currentChunk; i < totalChunks; i++) {
          if (!isUploadingRef.current || paused) {
            break
          }

          const success = await uploadChunk(i)
          if (!success) {
            break
          }

          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      continueUpload()
    } else {
      console.log("Pausing upload at chunk", currentChunk)
      setPaused(true)
      setUploading(false)
      isUploadingRef.current = false
    }
  }

  const resetUpload = () => {
    console.log("Resetting upload")
    setFile(null)
    setTotalChunks(0)
    setProgress(0)
    setStatus("idle")
    setMessage("")
    setFileId(null)
    setUploadId(null)
    uploadIdRef.current = null
    setCurrentChunk(0)
    setPaused(false)
    setUploading(false)
    isUploadingRef.current = false
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
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
      <Head title="Upload Large Files" />

      <div className="flex h-full flex-1 flex-col gap-4 rounded-xl py-6 px-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100">Upload Large Excel Files</h1>
          <p className="text-gray-500 text-sm dark:text-gray-400 mb-6">
            Upload files of any size using chunked upload technology. Files are uploaded in small pieces to avoid server
            limits.
          </p>

          <Card className="px-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="inline h-5 w-5" />
                <span>Chunked File Upload</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="font-medium">Select Excel/CSV File</label>
                <InputFile
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="border w-full border-gray-700 rounded p-2 disabled:opacity-50"
                />
              </div>

              {file && (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <FileUp className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">{file.name}</span>
                    <span className="text-gray-500">({formatFileSize(file.size)})</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Will be uploaded in {totalChunks} chunks of {formatFileSize(CHUNK_SIZE)} each
                  </div>
                  {uploading && (
                    <div className="text-xs text-blue-600 mt-1">
                      Current chunk: {currentChunk + 1}/{totalChunks}
                    </div>
                  )}
                </div>
              )}

              {(status === "uploading" || paused) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Upload Progress {paused && "(Paused)"}</span>
                    <span className="text-sm font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="text-xs text-gray-500">
                    Chunk {currentChunk + 1} of {totalChunks}
                  </div>
                </div>
              )}

              {message && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                    status === "success"
                      ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      : status === "error"
                        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                  }`}
                >
                  {status === "success" && <CheckCircle className="w-4 h-4" />}
                  {status === "error" && <AlertCircle className="w-4 h-4" />}
                  <span>{message}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={uploadFile}
                  disabled={!file || (uploading && !paused)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {uploading && !paused ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : paused ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Resume Upload
                    </>
                  ) : (
                    <>
                      <FileUp className="w-4 h-4 mr-2" />
                      Upload File
                    </>
                  )}
                </Button>

                {/* {(uploading || paused) && (
                  <Button onClick={togglePause} variant="outline">
                    {paused ? (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Pause
                      </>
                    )}
                  </Button>
                )} */}

                {(status === "success" || status === "error") && (
                  <Button onClick={resetUpload} variant="outline">
                    Upload Another File
                  </Button>
                )}
              </div>

              {/* Debug Info */}
              {/* <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
                <strong>Debug Info:</strong>
                <br />
                File ID: {fileId || "None"}
                <br />
                Upload ID (State): {uploadId || "None"}
                <br />
                Upload ID (Ref): {uploadIdRef.current || "None"}
                <br />
                Current Chunk: {currentChunk}
                <br />
                Total Chunks: {totalChunks}
                <br />
                Is Uploading: {isUploadingRef.current ? "Yes" : "No"}
                <br />
                Status: {status}
                <br />
                Progress: {progress}%
                <br />
                CSRF Token: {getCSRFToken() ? "Present" : "Missing"}
              </div> */}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}

export default ChunkedUpload
