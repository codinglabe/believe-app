"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePage, Head, router } from "@inertiajs/react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
    Eye,
    ChevronLeft,
    ChevronRight,
    ArrowUpCircle,
    ArrowDownCircle,
    ShoppingCart,
    RefreshCcw,
    XCircle,
    CheckCircle,
    Clock,
    Info,
    Heart,
    DollarSign,
    Calendar,
    Tag,
    Search,
    Filter,
    Download,
    CreditCard,
} from "lucide-react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"

// --- Types Definition ---
interface Transaction {
    id: number
    user_id: number
    related_id: number | null
    related_type: string | null
    type: "deposit" | "withdrawal" | "purchase" | "refund" | "transfer" | "donation"
    status: "pending" | "completed" | "failed" | "cancelled"
    amount: number
    fee: number
    currency: string
    payment_method: string | null
    transaction_id: string | null
    meta: Record<string, any> | null
    processed_at: string // ISO 8601 string
    created_at: string
    updated_at: string
}

interface PaginationLink {
    url: string | null
    label: string
    active: boolean
}

interface PaginationData<T> {
    current_page: number
    data: T[]
    first_page_url: string
    from: number
    last_page: number
    last_page_url: string
    links: PaginationLink[]
    next_page_url: string | null
    path: string
    per_page: number
    prev_page_url: string | null
    to: number
    total: number
}

interface PageProps {
    transactions: PaginationData<Transaction>
    filters: {
        search?: string
        status?: string
        page?: string
    }
    auth: {
        user: {
            id: number
            name: string
            email: string
        }
    }
}

// --- Helper Components ---

// Transaction Detail Dialog
function TransactionDetailDialog({
    isOpen,
    onClose,
    transaction,
}: {
    isOpen: boolean
    onClose: () => void
    transaction: Transaction | null
}) {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case "completed":
                return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            case "pending":
                return <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            case "failed":
            case "cancelled":
                return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            default:
                return <Info className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        }
    }

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case "completed":
                return "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300"
            case "pending":
                return "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300"
            case "failed":
            case "cancelled":
                return "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300"
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-300"
        }
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "deposit":
                return <ArrowUpCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            case "withdrawal":
                return <ArrowDownCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            case "purchase":
                return <ShoppingCart className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            case "refund":
                return <RefreshCcw className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            case "donation":
                return <Heart className="h-6 w-6 text-pink-600 dark:text-pink-400" />
            case "transfer":
                return <RefreshCcw className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            default:
                return <Info className="h-6 w-6 text-gray-600 dark:text-gray-400" />
        }
    }

    const renderMetaData = (meta: Record<string, any>) => {
        if (!meta || Object.keys(meta).length === 0) {
            return <p className="text-gray-500 dark:text-gray-400">No additional meta data.</p>
        }
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {Object.entries(meta).map(([key, value]) => (
                    <div key={key} className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 capitalize">
                            {key.replace(/_/g, " ")}:
                        </span>
                        <span className="text-base font-semibold text-gray-900 dark:text-white break-words">
                            {typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : String(value)}
                        </span>
                    </div>
                ))}
            </div>
        )
    }

    if (!transaction) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className=" bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl">
                <DialogHeader className="mb-6 flex flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Tag className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                        <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">Transaction Details</DialogTitle>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                    >
                        <XCircle className="h-6 w-6" />
                        <span className="sr-only">Close</span>
                    </Button>
                </DialogHeader>

                <DialogDescription className="text-gray-600 dark:text-gray-400 mb-6">
                    Detailed information about transaction ID:{" "}
                    <span className="font-mono text-blue-600 dark:text-blue-300">
                        {transaction.transaction_id || `TXN#${transaction.id}`}
                    </span>
                </DialogDescription>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Status Card */}
                    <Card className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg flex flex-col justify-between">
                        <CardContent className="p-0">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Status</p>
                            <div className="flex items-center gap-2">
                                {getStatusIcon(transaction.status)}
                                <span
                                    className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${getStatusBadgeClass(transaction.status)}`}
                                >
                                    {transaction.status}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Date Card */}
                    <Card className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg flex flex-col justify-between">
                        <CardContent className="p-0">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Date</p>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {new Date(transaction.processed_at).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Amount Card */}
                    <Card className="bg-green-50 dark:bg-green-700/30 border border-green-200 dark:border-green-600 p-4 rounded-lg flex flex-col justify-between">
                        <CardContent className="p-0">
                            <p className="text-sm text-green-700 dark:text-green-300 mb-2">Amount</p>
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                                <p className="text-xl font-bold text-green-800 dark:text-green-400">{`${transaction.currency} ${transaction.amount}`}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Fee Card */}
                    <Card className="bg-red-50 dark:bg-red-700/30 border border-red-200 dark:border-red-600 p-4 rounded-lg flex flex-col justify-between">
                        <CardContent className="p-0">
                            <p className="text-sm text-red-700 dark:text-red-300 mb-2">Fee</p>
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-6 w-6 text-red-600 dark:text-red-400" />
                                <p className="text-xl font-bold text-red-800 dark:text-red-400">{`${transaction.currency} ${transaction.fee}`}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Transaction Details */}
                <Card className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg mb-6">
                    <CardContent className="p-0 space-y-3">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            {getTypeIcon(transaction.type)}
                            <span className="text-lg font-semibold text-blue-600 dark:text-blue-400 capitalize">
                                {transaction.type}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <CreditCard className="h-5 w-5" />
                            <span>
                                Payment Method: <span className="font-semibold">{transaction.payment_method || "N/A"}</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Tag className="h-5 w-5" />
                            <span>
                                Transaction ID:{" "}
                                <span className="font-mono text-sm text-gray-800 dark:text-gray-200">
                                    {transaction.transaction_id || `TXN#${transaction.id}`}
                                </span>
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {transaction.meta && Object.keys(transaction.meta).length > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Additional Details</h3>
                        {renderMetaData(transaction.meta)}
                    </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Audit Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Created At:</span>
                            <span className="text-base font-semibold text-gray-900 dark:text-white">
                                {new Date(transaction.created_at).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated At:</span>
                            <span className="text-base font-semibold text-gray-900 dark:text-white">
                                {new Date(transaction.updated_at).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mt-8">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white dark:border-gray-600 px-6 py-2 rounded-md"
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// Pagination Controls
function PaginationControls({
    pagination,
    onPageChange,
}: {
    pagination: PaginationData<any>
    onPageChange: (page: number) => void
}) {
    const { current_page, last_page, from, to, total, links } = pagination
    const pageNumbers = useMemo(() => links.filter((link) => link.url && !isNaN(Number(link.label))), [links])

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-300">
                Showing <span className="font-semibold">{from || 0}</span> to <span className="font-semibold">{to || 0}</span>{" "}
                of <span className="font-semibold">{total || 0}</span> results
            </div>
            <div className="flex items-center space-x-2">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onPageChange(current_page - 1)}
                    disabled={!pagination.prev_page_url}
                    className="rounded-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                {pageNumbers.map((link: PaginationLink, index: number) => (
                    <Button
                        key={index}
                        variant={link.active ? "default" : "outline"}
                        size="icon"
                        onClick={() => onPageChange(Number(link.label))}
                        disabled={link.active}
                        className={`rounded-full ${link.active ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                    >
                        {link.label}
                    </Button>
                ))}
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onPageChange(current_page + 1)}
                    disabled={!pagination.next_page_url}
                    className="rounded-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}

// --- Main Transactions Page Component ---
export default function TransactionsPage() {
    const { transactions, filters, auth } = usePage<PageProps>().props

    const [searchTerm, setSearchTerm] = useState(filters.search || "")
    const [filterStatus, setFilterStatus] = useState<string>(filters.status || "all")
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

    const applyFilters = (page: number = transactions.current_page) => {
        router.get(
            "/profile/transactions",
            {
                page: page.toString(),
                search: searchTerm,
                status: filterStatus === "all" ? undefined : filterStatus,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        )
    }

    useEffect(() => {
        const handler = setTimeout(() => {
            applyFilters(1)
        }, 300)
        return () => clearTimeout(handler)
    }, [searchTerm, filterStatus])

    const handlePageChange = (page: number) => {
        applyFilters(page)
    }

    const handleViewDetails = (transaction: Transaction) => {
        setSelectedTransaction(transaction)
        setIsDetailModalOpen(true)
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "deposit":
                return <ArrowUpCircle className="h-5 w-5 text-blue-500" />
            case "withdrawal":
                return <ArrowDownCircle className="h-5 w-5 text-red-500" />
            case "purchase":
                return <ShoppingCart className="h-5 w-5 text-purple-500" />
            case "refund":
                return <RefreshCcw className="h-5 w-5 text-orange-500" />
            case "donation":
                return <Heart className="h-5 w-5 text-pink-500" />
            case "transfer":
                return <RefreshCcw className="h-5 w-5 text-gray-500" />
            default:
                return <Info className="h-5 w-5 text-gray-500" />
        }
    }

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case "completed":
                return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
            case "pending":
                return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
            case "failed":
            case "cancelled":
                return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
        }
    }

    return (
        <ProfileLayout title="Transaction History" description="Track your product orders and deliveries">
            <Head title="Transactions" />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 mb-3"
            >

                <CardHeader className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-3 items-center justify-between">
                        <div className="relative w-full sm:max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                            <Input
                                placeholder="Search by Transaction ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-full sm:w-[180px] bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                                <Filter className="h-4 w-4 mr-2 text-gray-500" />
                                <SelectValue placeholder="Filter by Status" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-gray-800 border border-gray-700 text-gray-900 dark:text-white">
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="rounded-lg overflow-hidden "
            >

                {/* Main content area for transaction cards */}
                <CardContent className="!p-0 grid grid-cols-1 gap-4">
                    <AnimatePresence mode="wait">
                        {transactions.data.length > 0 ? (
                            transactions.data.map((transaction) => (
                                <motion.div
                                    key={transaction.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className=" dark:bg-gray-900 border dark:border-gray-800 rounded-lg p-4 relative overflow-hidden cursor-pointer"
                                    onClick={() => handleViewDetails(transaction)}
                                >
                                    {/* Top section: Type, ID, Status, Buttons */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col">
                                            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-50 capitalize">
                                                {transaction.type.replace(/_/g, " ")}
                                            </h3>{" "}
                                            {/* Dynamic type */}
                                            <div className="flex items-center gap-2 text-sm mt-1">
                                                <span className="text-gray-700 dark:text-gray-50 font-mono">
                                                    {transaction.transaction_id || `TXN#${transaction.id}`}
                                                </span>
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${getStatusBadgeClass(transaction.status)}`}
                                                >
                                                    {transaction.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation() // Prevent row click from triggering modal twice
                                                    handleViewDetails(transaction)
                                                }}
                                                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 dark:bg-blue-700 dark:hover:bg-blue-800 dark:border-blue-700 rounded-full"
                                                aria-label={`View details for transaction ${transaction.id}`}
                                            >
                                                <Eye className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Main details section */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-gray-300">
                                        <div className="flex justify-between sm:block">
                                            <span className="text-gray-700 dark:text-gray-200">Amount:</span>
                                            <span className="font-semibold text-green-400 sm:ml-2">
                                                {`${transaction.currency} ${transaction.amount}`}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400 text-lg">
                                <Info className="h-10 w-10 mx-auto mb-4 text-gray-400" />
                                No transactions found matching your criteria.
                            </div>
                        )}
                    </AnimatePresence>
                </CardContent>

            </motion.div>
            <PaginationControls pagination={transactions} onPageChange={handlePageChange} />
            <TransactionDetailDialog
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                transaction={selectedTransaction}
            />
        </ProfileLayout>
    )
}
