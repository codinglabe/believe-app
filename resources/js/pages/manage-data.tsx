"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import AppLayout from "@/layouts/app-layout"
import type { BreadcrumbItem } from "@/types"
import { Head, router, usePage } from "@inertiajs/react"
import { useState, useEffect } from "react"
import { FileText, Clock, CheckCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react"
import DatasetActionDropdown from "@/components/dataset-action-dropdown"
import { useFlashMessage } from "@/hooks/use-flash-message"
import { Button } from "@/components/ui/button"

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "Manage Data",
    href: "/manage-data",
  },
]

interface UploadedFile {
  id: number
  name: string
  type: string
  size: string
  totalRows: string
  processedRows: string
  status: string
  uploadedAt: string
  uploadedAtTime: string
  progress: number
}

interface PaginationData {
  current_page: number
  data: UploadedFile[]
  first_page_url: string
  from: number
  last_page: number
  last_page_url: string
  links: Array<{
    url: string | null
    label: string
    active: boolean
  }>
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number
  total: number
}

interface PageProps {
  uploadedFiles: PaginationData
  filters: {
    per_page: number
    page: number
  }
  allowedPerPage: number[]
  timestamp: number
}

export default function ManageData() {
  const { uploadedFiles, filters, allowedPerPage, timestamp } = usePage<PageProps>().props
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Handle flash messages and show toast
  useFlashMessage()

  // Auto-refresh every 30 seconds for processing files
  useEffect(() => {
    const hasProcessingFiles = uploadedFiles.data.some(
      (file) => file.status === "processing" || file.status === "uploading",
    )

    if (hasProcessingFiles) {
      const interval = setInterval(() => {
        console.log("Auto-refreshing for processing files...")
        router.reload({ only: ["uploadedFiles", "timestamp"] })
      }, 500) // 30 seconds

      return () => clearInterval(interval)
    }
  }, [uploadedFiles.data])

  const handleRefresh = () => {
    setRefreshing(true)
    router.reload({
      only: ["uploadedFiles", "timestamp"],
      onFinish: () => setRefreshing(false),
    })
  }

  const handlePerPageChange = (newPerPage: number) => {
    setLoading(true)
    router.get(
      "/manage-data",
      {
        per_page: newPerPage,
        page: 1,
      },
      {
        preserveState: false, // Don't preserve state to get fresh data
        onFinish: () => setLoading(false),
      },
    )
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > uploadedFiles.last_page) return

    setLoading(true)
    router.get(
      "/manage-data",
      {
        per_page: filters.per_page,
        page: page,
      },
      {
        preserveState: false, // Don't preserve state to get fresh data
        onFinish: () => setLoading(false),
      },
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "processing":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case "uploading":
        return <Clock className="w-4 h-4 text-yellow-500" />
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case "deleting":
        return <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
      default:
        return <FileText className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      case "processing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
      case "uploading":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      case "deleting":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Manage Data" />
      <div className="flex flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
        <Card className="px-0">
          <CardHeader className="px-4 md:px-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Uploaded Datasets</CardTitle>
                <CardDescription>
                  Browse, view details, or manage your datasets. Total: {uploadedFiles.total.toLocaleString()} datasets
                  <span className="text-xs text-muted-foreground ml-2">
                    (Last updated: {new Date(timestamp * 1000).toLocaleTimeString()})
                  </span>
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="px-4 md:px-6">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading datasets...
              </div>
            )}

            <div className="w-full min-h-max relative overflow-x-auto overflow-visible pb-24">
              <table className="min-w-full relative rounded-md border border-muted w-full overflow-x-auto overflow-visible table-responsive text-sm text-left text-foreground">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium min-w-48">Name</th>
                    <th className="px-4 py-3 font-medium min-w-32">Type</th>
                    <th className="px-4 py-3 font-medium min-w-24">Size</th>
                    <th className="px-4 py-3 font-medium min-w-32">Rows</th>
                    <th className="px-4 py-3 font-medium min-w-32">Status</th>
                    <th className="px-4 py-3 font-medium min-w-32">Uploaded</th>
                    <th className="px-4 py-3 font-medium min-w-28 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadedFiles.data.map((dataset) => (
                    <tr key={dataset.id} className="border-t border-muted hover:bg-muted/50 transition">
                      <td className="px-4 py-3 min-w-48">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span className="font-medium truncate" title={dataset.name}>
                            {dataset.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 min-w-32">
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                          {dataset.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 min-w-24">{dataset.size}</td>
                      <td className="px-4 py-3 min-w-32">
                        <div className="text-sm">
                          <div>{dataset.totalRows} total</div>
                          {dataset.status === "processing" && (
                            <div className="text-xs text-muted-foreground">
                              {dataset.processedRows} processed ({dataset.progress}%)
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 min-w-32">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(dataset.status)}
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(dataset.status)}`}
                          >
                            {dataset.status}
                          </span>
                        </div>
                        {(dataset.status === "processing" || dataset.status === "deleting") && (
                          <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                dataset.status === "deleting" ? "bg-red-600" : "bg-blue-600"
                              }`}
                              style={{ width: `${dataset.progress}%` }}
                            ></div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 min-w-32">
                        <div className="text-sm">
                          <div>{dataset.uploadedAt}</div>
                          <div className="text-xs text-muted-foreground" title={dataset.uploadedAtTime}>
                            {dataset.uploadedAtTime}
                          </div>
                        </div>
                      </td>
                      <td className="relative px-4 py-3 min-w-28 text-right w-[1%] whitespace-nowrap overflow-visible">
                        <DatasetActionDropdown datasetId={dataset.id.toString()} status={dataset.status} />
                        </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {uploadedFiles.data.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No datasets found</h3>
                  <p className="text-muted-foreground">Upload your first dataset to get started.</p>
                </div>
              )}

              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-6 px-4 mb-6 text-sm text-muted-foreground flex-wrap gap-4">
                <div>
                  Showing {uploadedFiles.from?.toLocaleString() || 0} to {uploadedFiles.to?.toLocaleString() || 0} of{" "}
                  {uploadedFiles.total.toLocaleString()} dataset(s).
                </div>

                <div className="flex items-center gap-4">
                  {/* Per Page Selector */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Per page:</label>
                    <select
                      className="border rounded px-2 py-1 text-sm bg-background"
                      value={filters.per_page}
                      onChange={(e) => handlePerPageChange(Number.parseInt(e.target.value))}
                      disabled={loading}
                    >
                      {allowedPerPage.map((num) => (
                        <option key={num} value={num}>
                          {num}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Pagination Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-muted transition"
                      onClick={() => handlePageChange(uploadedFiles.current_page - 1)}
                      disabled={!uploadedFiles.prev_page_url || loading}
                    >
                      Prev
                    </button>

                    <span className="px-2">
                      Page {uploadedFiles.current_page} of {uploadedFiles.last_page}
                    </span>

                    <button
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-muted transition"
                      onClick={() => handlePageChange(uploadedFiles.current_page + 1)}
                      disabled={!uploadedFiles.next_page_url || loading}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
