"use client"

import { useState, useEffect, useCallback } from "react"
import { Head, router, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import type { BreadcrumbItem } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TextArea } from "@/components/ui/textarea"
import {
  FileText,
  Download,
  Trash2,
  Search,
  CheckSquare,
  Square,
  StickyNote,
  ArrowLeft,
  AlertTriangle,
  X,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useFlashMessage } from "@/hooks/use-flash-message"
import { showInfoToast, showWarningToast } from "@/lib/toast"

interface ExcelDataRow {
  id: number
  row_data: string[]
  note?: {
    id: number
    note: string
  }
  created_at: string
}

interface PaginationData {
  current_page: number
  data: ExcelDataRow[]
  first_page_url: string
  from: number
  last_page: number
  last_page_url: string
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number
  total: number
}

interface UploadedFile {
  id: number
  original_name: string
  file_size: number
  total_rows: number
  processed_rows: number
  status: string
  created_at: string
}

interface PageProps {
  uploadedFile: UploadedFile
  excelData: PaginationData
  headers: string[]
  headerRowId: number
  filters: {
    per_page: number
    page: number
    search: string
  }
  allowedPerPage: number[]
}

export default function ManageDataset() {
  const { uploadedFile, excelData, headers, headerRowId, filters, allowedPerPage } = usePage<PageProps>().props

  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [loading, setLoading] = useState(false)

  // Add debounced search state
  const [searchTerm, setSearchTerm] = useState(filters.search || "")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(filters.search || "")

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500) // 500ms delay

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Auto-search when debounced term changes
  useEffect(() => {
    if (debouncedSearchTerm !== filters.search) {
      handleSearch(debouncedSearchTerm)
    }
  }, [debouncedSearchTerm])

  const handleSearch = useCallback(
    (searchValue: string = debouncedSearchTerm) => {
      router.get(
        `/manage-dataset/${uploadedFile.id}`,
        {
          ...filters,
          search: searchValue,
          page: 1,
        },
        {
          preserveState: true,
          preserveScroll: true,
        },
      )
    },
    [uploadedFile.id, filters, debouncedSearchTerm],
  )

  const handleClearSearch = () => {
    setSearchTerm("")
    setDebouncedSearchTerm("")
    handleSearch("")
  }

  const [noteDialog, setNoteDialog] = useState<{ open: boolean; rowId: number | null; currentNote: string }>({
    open: false,
    rowId: null,
    currentNote: "",
  })

  // Handle flash messages and show toast
  useFlashMessage()

  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Manage Data", href: "/manage-data" },
    { title: uploadedFile.original_name, href: `/manage-dataset/${uploadedFile.id}` },
  ]

  const handleSelectAll = () => {
    if (selectedRows.length === excelData.data.length) {
      setSelectedRows([])
    } else {
      // Only select data rows, never the header row
      const dataRowIds = excelData.data.filter((row) => row.id !== headerRowId).map((row) => row.id)
      setSelectedRows(dataRowIds)
    }
  }

  const handleSelectRow = (rowId: number) => {
    // Prevent selection of header row
    if (rowId === headerRowId) {
      showWarningToast("Header row cannot be selected for operations")
      return
    }

    setSelectedRows((prev) => (prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]))
  }

  const handleBulkDelete = () => {
    if (selectedRows.length === 0) return

    // Filter out header row ID if somehow included
    const validSelectedRows = selectedRows.filter((id) => id !== headerRowId)

    if (validSelectedRows.length === 0) {
      showWarningToast("No valid rows selected for deletion (header row cannot be deleted)")
      return
    }

    if (
      !confirm(
        `Are you sure you want to delete ${validSelectedRows.length} selected rows? This action cannot be undone.`,
      )
    ) {
      return
    }

    setLoading(true)

    // Use Inertia router to post bulk delete request
    router.post(
      `/manage-dataset/${uploadedFile.id}/bulk-delete`,
      { ids: validSelectedRows },
      {
        onSuccess: () => {
              setSelectedRows([]) // Clear selection after successful delete
              router.reload();
        },
        onFinish: () => setLoading(false),
      },
    )
  }

  const handleBulkDownload = () => {
    if (selectedRows.length === 0) return

    // Filter out header row ID if somehow included
    const validSelectedRows = selectedRows.filter((id) => id !== headerRowId)

    if (validSelectedRows.length === 0) {
      showWarningToast("No valid rows selected for download")
      return
    }

    showInfoToast("Preparing download...")

    // Create a form and submit it for download
    const form = document.createElement("form")
    form.method = "POST"
    form.action = `/manage-dataset/${uploadedFile.id}/bulk-download`

    // Add CSRF token
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")
    if (csrfToken) {
      const csrfInput = document.createElement("input")
      csrfInput.type = "hidden"
      csrfInput.name = "_token"
      csrfInput.value = csrfToken
      form.appendChild(csrfInput)
    }

    // Add selected IDs (excluding header)
    validSelectedRows.forEach((id) => {
      const input = document.createElement("input")
      input.type = "hidden"
      input.name = "ids[]"
      input.value = id.toString()
      form.appendChild(input)
    })

    document.body.appendChild(form)
    form.submit()
    document.body.removeChild(form)
  }

  const handlePerPageChange = (newPerPage: number) => {
    router.get(
      `/manage-dataset/${uploadedFile.id}`,
      {
        ...filters,
        per_page: newPerPage,
        page: 1,
      },
      {
        preserveState: true,
      },
    )
  }

  const handlePageChange = (page: number) => {
    router.get(
      `/manage-dataset/${uploadedFile.id}`,
      {
        ...filters,
        page: page,
      },
      {
        preserveState: true,
      },
    )
  }

  const handleSaveNote = () => {
    if (!noteDialog.rowId) return

    // Prevent adding notes to header row
    if (noteDialog.rowId === headerRowId) {
      showWarningToast("Cannot add notes to header row")
      setNoteDialog({ open: false, rowId: null, currentNote: "" })
      return
    }

    // Use Inertia router to post note save request
    router.post(
      `/manage-dataset/${uploadedFile.id}/rows/${noteDialog.rowId}/note`,
      { note: noteDialog.currentNote },
      {
        onSuccess: () => {
          setNoteDialog({ open: false, rowId: null, currentNote: "" })
        },
      },
    )
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  // Calculate actual data rows (excluding header)
  const actualDataRowsCount = uploadedFile.total_rows > 0 ? uploadedFile.total_rows - 1 : 0

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Dataset: ${uploadedFile.original_name}`}>
        <meta name="csrf-token" content={usePage().props.csrf_token} />
      </Head>

      <div className="flex h-full flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" size="sm" onClick={() => router.visit("/manage-data")}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Datasets
              </Button>
            </div>
            <h1 className="text-2xl font-bold">{uploadedFile.original_name}</h1>
            <p className="text-muted-foreground">
              {formatFileSize(uploadedFile.file_size)} • {actualDataRowsCount.toLocaleString()} data rows (excluding
              header)
            </p>
          </div>

          <Button
            onClick={() => {
              showInfoToast("Download started...")
              window.open(`/manage-dataset/${uploadedFile.id}/download`, "_blank")
            }}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download All
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Dataset Rows</CardTitle>
                <CardDescription>
                  Manage individual rows of your dataset. Header row is protected and cannot be modified.
                </CardDescription>
              </div>

              {selectedRows.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{selectedRows.length} selected</span>
                  <Button variant="outline" size="sm" onClick={handleBulkDownload} disabled={loading}>
                    <Download className="w-4 h-4 mr-1" />
                    Download Selected
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={loading}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    {loading ? "Deleting..." : "Delete Selected"}
                  </Button>
                </div>
              )}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 mt-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search in data... (auto-search as you type)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchTerm && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {searchTerm && (
                <Button variant="outline" onClick={handleClearSearch} size="sm">
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border border-muted rounded-md text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <button onClick={handleSelectAll} className="flex items-center">
                        {selectedRows.length === excelData.data.filter((row) => row.id !== headerRowId).length &&
                        excelData.data.filter((row) => row.id !== headerRowId).length > 0 ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">Actions</th>
                    {headers.map((header, index) => (
                      <th key={index} className="px-4 py-3 text-left font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {excelData.data.map((row, rowIndex) => {
                    const isHeaderRow = row.id === headerRowId
                    return (
                      <tr
                        key={row.id}
                        className={`border-t hover:bg-muted/50 ${isHeaderRow ? "bg-yellow-50 dark:bg-yellow-900/20" : ""}`}
                      >
                        <td className="px-4 py-3">
                          {isHeaderRow ? (
                            <div className="flex items-center gap-2">
                              <Square className="w-4 h-4 text-muted-foreground" />
                              <AlertTriangle className="w-3 h-3 text-yellow-600" title="Header row - protected" />
                            </div>
                          ) : (
                            <button onClick={() => handleSelectRow(row.id)}>
                              {selectedRows.includes(row.id) ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isHeaderRow ? (
                            <span className="text-xs text-muted-foreground">Protected</span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setNoteDialog({
                                  open: true,
                                  rowId: row.id,
                                  currentNote: row.note?.note || "",
                                })
                              }
                              className={row.note ? "text-blue-600" : ""}
                            >
                              <StickyNote className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                        {row.row_data.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className={`px-4 py-3 max-w-xs truncate ${isHeaderRow ? "font-medium" : ""}`}
                            title={cell}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {excelData.data.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No data found</h3>
                  <p className="text-muted-foreground">
                    {filters.search ? (
                      <>
                        No rows match your search criteria for "{filters.search}".{" "}
                        <button onClick={handleClearSearch} className="text-blue-600 hover:text-blue-800 underline">
                          Clear search
                        </button>{" "}
                        to see all data.
                      </>
                    ) : (
                      "This dataset appears to be empty."
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6 text-sm text-muted-foreground flex-wrap gap-4">
              <div>
                Showing {excelData.from?.toLocaleString() || 0} to {excelData.to?.toLocaleString() || 0} of{" "}
                {excelData.total.toLocaleString()} row(s) (data rows only, header excluded).
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label>Per page:</label>
                  <select
                    className="border rounded px-2 py-1 bg-background"
                    value={filters.per_page}
                    onChange={(e) => handlePerPageChange(Number.parseInt(e.target.value))}
                  >
                    {allowedPerPage.map((num) => (
                      <option key={num} value={num}>
                        {num}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(excelData.current_page - 1)}
                    disabled={!excelData.prev_page_url}
                  >
                    Prev
                  </Button>
                  <span>
                    Page {excelData.current_page} of {excelData.last_page}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(excelData.current_page + 1)}
                    disabled={!excelData.next_page_url}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Note Dialog */}
      <Dialog open={noteDialog.open} onOpenChange={(open) => setNoteDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add/Edit Note</DialogTitle>
            <DialogDescription>Add a note for this row to help you remember important details.</DialogDescription>
          </DialogHeader>
          <TextArea
            placeholder="Enter your note here..."
            value={noteDialog.currentNote}
            onChange={(e) => setNoteDialog((prev) => ({ ...prev, currentNote: e.target.value }))}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialog({ open: false, rowId: null, currentNote: "" })}>
              Cancel
            </Button>
            <Button onClick={handleSaveNote}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
