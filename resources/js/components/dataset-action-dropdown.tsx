"use client"

import { useState } from "react"
import { router } from "@inertiajs/react"
import { Menu, MenuButton, MenuItem, MenuItems, Portal } from "@headlessui/react"
import { BookOpen, Download, Folder, Trash2, EllipsisIcon } from "lucide-react"
import { showInfoToast, showWarningToast } from "@/lib/toast"

type DatasetActionDropdownProps = {
  datasetId: string
  status: string
}

export default function DatasetActionDropdown({ datasetId, status }: DatasetActionDropdownProps) {
  const [loading, setLoading] = useState(false)

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this dataset? This action cannot be undone.")) {
      setLoading(true)

      // Use Inertia router to delete with proper response handling
      router.delete(`/manage-data/${datasetId}`, {
        onFinish: () => setLoading(false),
      })
    }
  }

  const handleDownload = () => {
    if (status !== "completed") {
      showWarningToast("Dataset is not ready for download. Please wait for processing to complete.")
      return
    }

    showInfoToast("Download started...")
    window.open(`/manage-dataset/${datasetId}/download`, "_blank")
  }

  const handleViewDetails = () => {
    if (status !== "completed") {
      showWarningToast("Dataset is not ready yet. Please wait for processing to complete.")
      return
    }

    router.visit(`/manage-dataset/${datasetId}`)
  }

  return (
    <Menu>
      <MenuButton className="p-1 rounded-md hover:bg-gray-100 cursor-pointer dark:hover:bg-gray-800 focus:outline-none">
        <EllipsisIcon className="w-5 h-5 text-gray-500 cursor-pointer" />
      </MenuButton>

      <MenuItems className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl bg-white dark:bg-zinc-900 shadow-lg ring-1 ring-black/5 focus:outline-none"
        style={{ position: "absolute" }}>
        <div className="py-1 text-sm text-gray-700 dark:text-gray-200">
          <MenuItem>
            {({ active }) => (
              <button
                onClick={handleViewDetails}
                disabled={status !== "completed"}
                className={`${
                  active ? "bg-gray-100 dark:bg-zinc-800" : ""
                } ${status !== "completed" ? "opacity-50 cursor-not-allowed" : ""} flex w-full items-center px-4 py-2 gap-2`}
              >
                <BookOpen size={16} />
                View Details
              </button>
            )}
          </MenuItem>

          <MenuItem>
            {({ active }) => (
              <button
                onClick={handleDownload}
                disabled={status !== "completed"}
                className={`${
                  active ? "bg-gray-100 dark:bg-zinc-800" : ""
                } ${status !== "completed" ? "opacity-50 cursor-not-allowed" : ""} flex w-full items-center px-4 py-2 gap-2`}
              >
                <Download size={16} />
                Download File
              </button>
            )}
          </MenuItem>

          <MenuItem disabled>
            {({ disabled }) => (
              <div
                className={`flex w-full items-center px-4 py-2 gap-2 text-gray-400 ${
                  disabled ? "cursor-not-allowed" : ""
                }`}
              >
                <Folder size={16} />
                Edit Metadata (Soon)
              </div>
            )}
          </MenuItem>

          <MenuItem>
            {({ active }) => (
              <button
                onClick={handleDelete}
                disabled={loading && status !== "completed"}
                className={`${
                  active ? "bg-red-100 dark:bg-red-900" : ""
                } text-red-600 dark:text-red-400 flex w-full items-center px-4 py-2 gap-2 ${loading ? "opacity-50" : ""}`}
              >
                <Trash2 size={16} />
                {loading ? "Deleting..." : "Delete Dataset"}
              </button>
            )}
          </MenuItem>
        </div>
              </MenuItems>
    </Menu>
  )
}
