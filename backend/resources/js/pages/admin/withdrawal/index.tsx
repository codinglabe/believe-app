"use client"

import { useEffect, useState } from "react"
import { Head, Link, router } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  Ban,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table"
import { ConfirmationModal } from "@/components/admin/confirmation-modal"
import { showSuccessToast } from "@/lib/toast"

interface Withdrawal {
  id: number
  user_name: string
  user_email: string
  amount: number
  payment_method: string
  paypal_email: string | null
  bank_account_details: string | null
  status: "pending" | "accepted" | "processing" | "completed" | "rejected" | "failed"
  transaction_id: string | null
  admin_notes: string | null
  created_at: string
  processed_at: string | null
}

interface LaravelPagination<T> {
  data: T[]
  current_page: number
  first_page_url: string
  from: number | null
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
  to: number | null
  total: number
}

interface Props {
  withdrawals: LaravelPagination<Withdrawal>
  filters: {
    search: string
    status: string
  }
}

export default function WithdrawalIndex({ withdrawals, filters }: Props) {
  const [search, setSearch] = useState(filters.search || "")
  const [status, setStatus] = useState(filters.status || "")
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    id: number | null
    title: string
    message: string
  }>({
    isOpen: false,
    id: null,
    title: "",
    message: "",
  })
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params: Record<string, string> = {}
      if (search.trim()) params.search = search
      if (status) params.status = status

      router.get(route("withdrawals.index"), params, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
      })
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [search, status])

  const openDeleteModal = (id: number, userName: string) => {
    setDeleteModal({
      isOpen: true,
      id,
      title: "Delete Withdrawal Request",
      message: `Are you sure you want to delete the withdrawal request from ${userName}? This action cannot be undone.`,
    })
  }

  const handleDeleteConfirm = () => {
    if (!deleteModal.id) return
    setIsDeleting(true)
    router.delete(route("withdrawals.destroy", deleteModal.id), {
      preserveScroll: true,
      onSuccess: () => {
        setDeleteModal({ isOpen: false, id: null, title: "", message: "" })
        showSuccessToast("Withdrawal request deleted successfully.")
      },
      onFinish: () => {
        setIsDeleting(false)
      },
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-3 w-3" />
      case "accepted":
        return <CheckCircle className="h-3 w-3" />
      case "processing":
        return <Clock className="h-3 w-3" />
      case "completed":
        return <CheckCircle className="h-3 w-3" />
      case "rejected":
        return <Ban className="h-3 w-3" />
      case "failed":
        return <XCircle className="h-3 w-3" />
      default:
        return null
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary"
      case "accepted":
        return "default"
      case "processing":
        return "outline"
      case "completed":
        return "success" // Assuming a 'success' variant exists or can be styled
      case "rejected":
      case "failed":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getNumericLinks = (links: LaravelPagination<any>["links"]) => {
    return links.filter((link) => {
      const label = link.label.replace(/&laquo;|&raquo;/g, "").trim()
      return !isNaN(Number(label)) && label !== "Previous" && label !== "Next"
    })
  }

  return (
    <AppLayout>
      <Head title="Withdrawal Management" />
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 m-10">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 animate-in slide-in-from-left duration-700">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
              Withdrawal Requests
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400">
              Manage user withdrawal requests
            </p>
          </div>
          <div className="animate-in slide-in-from-right duration-700">
            <Link href={route("withdrawals.create")}>
              <Button
                size="lg"
                className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Request Withdrawal</span>
                <span className="sm:hidden">Request</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Withdrawals Table */}
        <Card className="shadow-lg hover:shadow-xl transition-all duration-300 animate-in slide-in-from-left duration-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900 dark:text-white">
              <DollarSign className="h-5 w-5 text-green-600" />
              All Withdrawals ({withdrawals.total})
            </CardTitle>
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by User, Amount, or Transaction ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Amount</TableHead>
                    <TableHead className="font-semibold">Method</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Requested At</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.data.length > 0 ? (
                    withdrawals.data.map((withdrawal) => (
                      <TableRow
                        key={withdrawal.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200"
                      >
                        <TableCell className="font-medium">
                          {withdrawal.user_name}
                          <div className="text-xs text-gray-500 dark:text-gray-400">({withdrawal.user_email})</div>
                        </TableCell>
                        <TableCell className="text-green-600 dark:text-green-400 font-semibold">
                          ${Number(withdrawal.amount).toLocaleString()}
                        </TableCell>
                        <TableCell className="capitalize">{withdrawal.payment_method.replace("_", " ")}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(withdrawal.status)}>
                            {getStatusIcon(withdrawal.status)}
                            <span className="ml-1 capitalize">{withdrawal.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(withdrawal.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Link href={route("withdrawals.show", withdrawal.id)}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={route("withdrawals.edit", withdrawal.id)}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => openDeleteModal(withdrawal.id, withdrawal.user_name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No withdrawal requests found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Pagination */}
            {withdrawals.last_page > 1 && (
              <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between pt-6 sm:pt-8">
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
                  Showing <span className="font-medium text-gray-900 dark:text-white">{withdrawals.from || 0}</span> to{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{withdrawals.to || 0}</span> of{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{withdrawals.total}</span> withdrawals
                </div>
                <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                  {withdrawals.prev_page_url && (
                    <Link href={withdrawals.prev_page_url}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:shadow-md transition-all duration-200 hover:scale-110"
                      >
                        <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </Link>
                  )}
                  {getNumericLinks(withdrawals.links).map((link, index) => (
                    <div key={index}>
                      {link.url ? (
                        <Link href={link.url}>
                          <Button
                            variant={link.active ? "default" : "outline"}
                            size="sm"
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-110 ${
                              link.active
                                ? "bg-blue-600 text-white shadow-lg scale-110"
                                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:shadow-md"
                            }`}
                          >
                            {link.label}
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full text-xs sm:text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                        >
                          {link.label}
                        </Button>
                      )}
                    </div>
                  ))}
                  {withdrawals.next_page_url && (
                    <Link href={withdrawals.next_page_url}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:shadow-md transition-all duration-200 hover:scale-110"
                      >
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onChange={setDeleteModal}
        title={deleteModal.title}
        description={deleteModal.message}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </AppLayout>
  )
}
