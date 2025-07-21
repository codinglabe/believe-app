"use client"

import { useState, useEffect, useMemo } from "react"
import { Head, Link, router } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Input } from "@/components/admin/ui/input"
import { Select } from "@/components/admin/ui/select"
import { Button } from "@/components/admin/ui/button"
import { Card, CardContent, CardHeader } from "@/components/admin/ui/card"
import { Badge } from "@/components/admin/ui/badge"
import { Search, Plus, Eye, Edit, Trash2, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import type { NodeBoss, NodeBossFilters, PaginatedNodeBoss } from "@/types/nodeboss"
import { useDebounce } from "@/hooks/useDebounce"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { showSuccessToast } from "@/lib/toast"

interface Props {
    auth: any
    nodeBosses: PaginatedNodeBoss
    filters: NodeBossFilters
}

export default function Index({ auth, nodeBosses, filters }: Props) {
    const [search, setSearch] = useState(filters.search || "")
    const [status, setStatus] = useState(filters.status || "")
    const [investmentStatus, setInvestmentStatus] = useState(
        typeof filters.is_closed === "boolean"
            ? filters.is_closed.toString()
            : filters.is_closed || ""
    )
    const [selectedNodeBossId, setSelectedNodeBossId] = useState<number | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const debouncedSearch = useDebounce(search, 300)

    // Auto-filter when values change
    useEffect(() => {
        const params: any = {}

        if (debouncedSearch) params.search = debouncedSearch
        if (status) params.status = status
        if (investmentStatus) params.is_closed = investmentStatus

        setIsLoading(true)
        router.get(route("node-boss.index"), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onFinish: () => setIsLoading(false),
        })
    }, [debouncedSearch, status, investmentStatus])

    const handleDelete = (id: number) => {
        setSelectedNodeBossId(id)
        setDeleteDialogOpen(true)
    }

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const confirmDeleteUser = () => {
        if (!selectedNodeBossId) return;
        setIsLoading(true)
        setDeleteDialogOpen(false)
        router.delete(route("node-boss.destroy", String(selectedNodeBossId)), {
            preserveScroll: true,
            onFinish: () => setIsLoading(false),
            onSuccess: () => {
                setSelectedNodeBossId(null)
                showSuccessToast("Node Boss deleted successfully.")
            }
        })

    }

    const clearFilters = () => {
        setSearch("")
        setStatus("")
        setInvestmentStatus("")
    }

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case "active":
                return "default"
            case "inactive":
                return "secondary"
            case "draft":
                return "outline"
            default:
                return "secondary"
        }
    }

    const hasActiveFilters = useMemo(() => {
        return search || status || investmentStatus
    }, [search, status, investmentStatus])

    // Enhanced pagination logic
    const generatePaginationLinks = () => {
        const links = []
        const currentPage = nodeBosses.current_page
        const lastPage = nodeBosses.last_page
        const maxVisible = 7

        // Always show first page
        if (currentPage > 3) {
            links.push({ page: 1, url: nodeBosses.links[1]?.url, active: false })
            if (currentPage > 4) {
                links.push({ page: "...", url: null, active: false })
            }
        }

        // Show pages around current page
        const start = Math.max(1, currentPage - 2)
        const end = Math.min(lastPage, currentPage + 2)

        for (let i = start; i <= end; i++) {
            const linkIndex = i
            links.push({
                page: i,
                url: nodeBosses.links[linkIndex]?.url,
                active: i === currentPage,
            })
        }

        // Always show last page
        if (currentPage < lastPage - 2) {
            if (currentPage < lastPage - 3) {
                links.push({ page: "...", url: null, active: false })
            }
            links.push({ page: lastPage, url: nodeBosses.links[lastPage]?.url, active: false })
        }

        return links
    }

    const paginationLinks = generatePaginationLinks()

    return (
        <AppLayout>
            <Head title="NodeBoss Management" />
            <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 m-10">
                {/* Header */}
                <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2 animate-in slide-in-from-left duration-700">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                            NodeBoss Management
                        </h1>
                        <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400">
                            Manage your investment opportunities
                        </p>
                    </div>
                    <div className="animate-in slide-in-from-right duration-700">
                        <Link href={route("node-boss.create")}>
                            <Button
                                size="lg"
                                className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                            >
                                <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                                <span className="hidden sm:inline">Create Node Boss</span>
                                <span className="sm:hidden">Create</span>
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Search and Filters */}
                <Card className="hover:shadow-xl transition-all duration-300 animate-in slide-in-from-top duration-500">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center gap-3 mb-4 sm:mb-6">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg animate-pulse">
                                <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Search & Filter</h3>
                            {hasActiveFilters && (
                                <Badge variant="secondary" className="ml-auto animate-in zoom-in duration-300">
                                    {[search, status, investmentStatus].filter(Boolean).length} active
                                </Badge>
                            )}
                        </div>

                        <div className={`grid grid-cols-1 sm:grid-cols-2 ${hasActiveFilters ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3 sm:gap-4`}>
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4 group-focus-within:text-blue-500 transition-colors duration-200" />
                                <Input
                                    placeholder="Search NodeBoss..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 h-10 sm:h-12 b transition-all duration-200 hover:shadow-md"
                                />
                            </div>

                            <Select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="h-10 sm:h-12  transition-all duration-200 hover:shadow-md"
                            >
                                <option value="">All Status</option>
                                <option value="active">🟢 Active</option>
                                <option value="inactive">🟡 Inactive</option>
                                {/* <option value="draft">📝 Draft</option> */}
                            </Select>

                            <Select
                                value={investmentStatus}
                                onChange={(e) => setInvestmentStatus(e.target.value)}
                                className="h-10 sm:h-12 transition-all duration-200 hover:shadow-md"
                            >
                                <option value="">All Investments</option>
                                <option value="false">🟢 Open</option>
                                <option value="true">🔒 Closed</option>
                            </Select>

                            {hasActiveFilters && (
                                <Button
                                    variant="outline"
                                    onClick={clearFilters}
                                    className="h-10 sm:h-12 bg-gray-50 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 animate-in zoom-in duration-300 cursor-pointer"
                                >
                                    <Filter className="mr-2 h-4 w-4" />
                                    <span className="hidden sm:inline">Clear Filters</span>
                                    <span className="sm:hidden">Clear</span>
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Results Summary */}
                {/* <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 animate-in slide-in-from-left duration-500">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <span className="text-sm sm:text-lg font-medium text-gray-900 dark:text-white">
                            {nodeBosses.total} NodeBoss{nodeBosses.total !== 1 ? "es" : ""} found
                        </span>
                        {nodeBosses.data.length !== nodeBosses.total && (
                            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                (showing {nodeBosses.data.length})
                            </span>
                        )}
                    </div>
                    {hasActiveFilters && (
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>Filters applied</span>
                        </div>
                    )}
                </div> */}

                {/* Loading Overlay */}
                {isLoading && (
                    <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div className="rounded-lg p-6 shadow-xl">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Loading...</p>
                        </div>
                    </div>
                )}

                {/* NodeBoss Grid */}
                {nodeBosses.data.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                        {nodeBosses.data.map((nodeBoss: NodeBoss, index) => (
                            <Card
                                key={nodeBoss.id}
                                className="group hover:shadow-2xl transition-all duration-500  overflow-hidden transform animate-in fade-in slide-in-from-bottom duration-700"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                {/* Image */}
                                <div className="aspect-video bg-gray-200 dark:bg-gray-700 overflow-hidden relative">
                                    {nodeBoss.image ? (
                                        <img
                                            src={"/" + nodeBoss.image || "/placeholder.svg"}
                                            alt={nodeBoss.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
                                            <div className="text-center text-gray-400 dark:text-gray-500 animate-pulse">
                                                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                                    <span className="text-lg sm:text-2xl">📊</span>
                                                </div>
                                                <p className="text-xs sm:text-sm font-medium">No Image</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Status Badge Overlay */}
                                    <div className="absolute top-2 sm:top-3 right-2 sm:right-3 animate-in zoom-in duration-500">
                                        <Badge
                                            variant={getStatusBadgeVariant(nodeBoss.status)}
                                            className="shadow-lg backdrop-blur-sm text-xs bg-green-400"
                                        >
                                            <span className="hidden sm:inline">{nodeBoss.uuid}</span>
                                        </Badge>
                                    </div>

                                    {/* Investment Status Overlay */}
                                    <div className="absolute top-3 sm:bottom-3 left-2 sm:left-3 animate-in zoom-in duration-700">
                                        <Badge
                                            variant={nodeBoss.is_closed ? "destructive" : "default"}
                                            className="shadow-lg backdrop-blur-sm text-xs"
                                        >
                                            {nodeBoss.is_closed ? "🔒" : "🟢"}
                                            <span className="hidden sm:inline">{nodeBoss.is_closed ? " Closed" : " Open"}</span>
                                        </Badge>
                                    </div>
                                </div>

                                <CardContent className="p-3 sm:p-6 space-y-3 sm:space-y-4">
                                    {/* Header */}
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-base sm:text-xl text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                                            {nodeBoss.name}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                            {nodeBoss.description}
                                        </p>
                                    </div>

                                    {/* Suggested Amounts */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                            Investment Options
                                        </p>
                                        <div className="flex flex-wrap gap-1 sm:gap-2">
                                            {(typeof nodeBoss.suggested_amounts === "string"
                                                ? JSON.parse(nodeBoss.suggested_amounts)
                                                : nodeBoss.suggested_amounts
                                            )?.slice(0, 5).map((amount: number, index: number) => (
                                                <Badge
                                                    key={index}
                                                    variant="outline"
                                                    className="text-xs font-medium bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 animate-in zoom-in duration-300"
                                                    style={{ animationDelay: `${index * 100}ms` }}
                                                >
                                                    ${amount}
                                                </Badge>
                                            ))}
                                            {(typeof nodeBoss.suggested_amounts === "string"
                                                ? JSON.parse(nodeBoss.suggested_amounts)
                                                : nodeBoss.suggested_amounts
                                            )?.length > 3 && (
                                                    <Badge variant="outline" className="text-xs bg-gray-50 dark:bg-gray-700">
                                                        +{(typeof nodeBoss.suggested_amounts === "string"
                                                            ? JSON.parse(nodeBoss.suggested_amounts)
                                                            : nodeBoss.suggested_amounts
                                                        ).length - 3}
                                                    </Badge>
                                                )}
                                        </div>
                                    </div>

                                    {/* Meta Information */}
                                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600">
                                        <span className="flex text-xl items-center gap-1">
                                            ${nodeBoss.price}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            🕒 {new Date(nodeBoss.updated_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-3 gap-1 sm:gap-2 pt-2 sm:pt-4">
                                        <Link href={route("node-boss.show", nodeBoss.id)}>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800 transition-all duration-200 hover:scale-105 cursor-pointer"
                                            >
                                                <Eye className="h-3 w-3" />
                                            </Button>
                                        </Link>
                                        <Link href={route("node-boss.edit", nodeBoss.id)}>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full bg-transparent hover:bg-green-50 dark:hover:bg-green-900/20 border-green-200 dark:border-green-800 transition-all duration-200 hover:scale-105 cursor-pointer"
                                            >
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDelete(nodeBoss.id)}
                                            className="w-full bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all duration-200 hover:scale-105 cursor-pointer"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="shadow-lg animate-in fade-in duration-500">
                        <CardContent className="p-8 sm:p-16">
                            <div className="text-center space-y-4 sm:space-y-6">
                                <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 flex items-center justify-center animate-pulse">
                                    <Search className="h-8 w-8 sm:h-12 sm:w-12 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">No NodeBoss Found</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-lg max-w-md mx-auto">
                                        {hasActiveFilters
                                            ? "No results match your current filters. Try adjusting your search criteria."
                                            : "Get started by creating your first NodeBoss investment opportunity."}
                                    </p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                                    {hasActiveFilters ? (
                                        <Button
                                            variant="outline"
                                            onClick={clearFilters}
                                            size="lg"
                                            className="hover:scale-105 transition-transform duration-200 bg-transparent"
                                        >
                                            <Filter className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                                            Clear All Filters
                                        </Button>
                                    ) : (
                                        <Link href={route("node-boss.create")}>
                                            <Button size="lg" className="shadow-lg hover:scale-105 transition-transform duration-200">
                                                <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                                                Create Your First NodeBoss
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Enhanced Pagination */}
                {nodeBosses.links && nodeBosses.links.length > 3 && (
                    <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between pt-6 sm:pt-8 animate-in slide-in-from-bottom duration-500">
                        {/* Total Results - Left Side */}
                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
                            Showing <span className="font-medium text-gray-900 dark:text-white">{nodeBosses.data.length}</span> of{" "}
                            <span className="font-medium text-gray-900 dark:text-white">{nodeBosses.total}</span> results
                        </div>

                        {/* Pagination - Right Side */}
                        <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                            {/* Previous Button */}
                            {nodeBosses.current_page > 1 && (
                                <Link href={nodeBosses.links[0]?.url || "#"}>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:shadow-md transition-all duration-200 hover:scale-110"
                                    >
                                        <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                                    </Button>
                                </Link>
                            )}

                            {/* Page Numbers */}
                            {paginationLinks.map((link, index) => (
                                <div key={index}>
                                    {link.page === "..." ? (
                                        <span className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                                            ...
                                        </span>
                                    ) : (
                                        <Link href={link.url || "#"}>
                                            <Button
                                                variant={link.active ? "default" : "outline"}
                                                size="sm"
                                                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-110 ${link.active
                                                    ? "bg-blue-600 text-white shadow-lg scale-110 animate-pulse"
                                                    : link.url
                                                        ? "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:shadow-md"
                                                        : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                                    }`}
                                            >
                                                {link.page}
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            ))}

                            {/* Next Button */}
                            {nodeBosses.current_page < nodeBosses.last_page && (
                                <Link href={nodeBosses.links[nodeBosses.links.length - 1]?.url || "#"}>
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
            </div>
            <ConfirmationModal
                isOpen={deleteDialogOpen}
                onChange={setDeleteDialogOpen}
                title="Confirm Delete"
                description="Are you sure you want to delete this node boss?"
                confirmLabel="Delete"
                cancelLabel="Cancel"
                onConfirm={() => confirmDeleteUser()}
            />
        </AppLayout>
    )
}
