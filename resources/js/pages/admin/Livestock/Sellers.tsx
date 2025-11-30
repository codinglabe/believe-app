"use client"

import AppLayout from "@/layouts/app-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { router, Head } from "@inertiajs/react"
import { useState } from "react"
import { CheckCircle, XCircle, Building2, User, Mail, AlertCircle, Clock, ShieldCheck, Filter, Users as UsersIcon, Eye, Trash2, Package, List } from "lucide-react"
import { showSuccessToast, showErrorToast } from '@/lib/toast'
import type { BreadcrumbItem } from "@/types"
import { Separator } from "@/components/ui/separator"

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Admin", href: "/dashboard" },
    { title: "Livestock", href: "/admin/livestock" },
    { title: "Sellers", href: "/admin/livestock/sellers" },
]

interface User {
    id: number
    name: string
    email: string
}

interface SellerProfile {
    id: number
    farm_name: string
    verification_status: string
    rejection_reason: string | null
    address?: string
    phone?: string
    national_id_number?: string
    payee_type?: string
    payee_details?: any
    listings_count: number
    user: User
}

interface SellersProps {
    sellers: {
        data: SellerProfile[]
        links: { url: string | null; label: string; active: boolean }[]
        current_page: number
        last_page: number
        total: number
        per_page: number
    }
    filters: {
        status?: string
    }
}

export default function AdminSellers({ sellers, filters }: SellersProps) {
    const [selectedStatus, setSelectedStatus] = useState(filters.status || '')
    const [deleteSeller, setDeleteSeller] = useState<SellerProfile | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [rejectSeller, setRejectSeller] = useState<SellerProfile | null>(null)
    const [rejectionReason, setRejectionReason] = useState('')
    const [isRejecting, setIsRejecting] = useState(false)

    const handleStatusChange = (status: string) => {
        setSelectedStatus(status)
        const params: Record<string, string> = {}
        if (status) params.status = status
        
        router.get('/admin/livestock/sellers', params, {
            preserveState: true,
            replace: true
        })
    }

    const handleVerify = (id: number) => {
        router.put(`/admin/livestock/sellers/${id}/verify`, {}, {
            onSuccess: () => {
                showSuccessToast('Seller verified successfully.')
            },
            onError: () => {
                showErrorToast('Failed to verify seller.')
            }
        })
    }

    const handleRejectClick = (seller: SellerProfile) => {
        setRejectSeller(seller)
        setRejectionReason('')
    }

    const handleRejectConfirm = () => {
        if (!rejectSeller || !rejectionReason.trim()) {
            showErrorToast('Please provide a reason for rejection.')
            return
        }
        
        setIsRejecting(true)
        router.put(`/admin/livestock/sellers/${rejectSeller.id}/reject`, {
            rejection_reason: rejectionReason.trim()
        }, {
            onSuccess: () => {
                showSuccessToast('Seller rejected successfully.')
                setRejectSeller(null)
                setRejectionReason('')
                setIsRejecting(false)
            },
            onError: () => {
                showErrorToast('Failed to reject seller.')
                setIsRejecting(false)
            }
        })
    }

    const handleView = (sellerId: number) => {
        router.visit(`/admin/livestock/sellers/${sellerId}`)
    }

    const handleViewListings = (sellerId: number) => {
        router.visit(`/admin/livestock/sellers/${sellerId}/listings`)
    }

    const handleDeleteClick = (seller: SellerProfile) => {
        setDeleteSeller(seller)
    }

    const handleDeleteConfirm = () => {
        if (!deleteSeller) return
        
        setIsDeleting(true)
        router.delete(`/admin/livestock/sellers/${deleteSeller.id}`, {
            onSuccess: () => {
                showSuccessToast('Seller deleted successfully.')
                setDeleteSeller(null)
                setIsDeleting(false)
            },
            onError: () => {
                showErrorToast('Failed to delete seller.')
                setIsDeleting(false)
            }
        })
    }

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'verified':
                return {
                    icon: ShieldCheck,
                    variant: 'default' as const,
                    color: 'text-green-600 dark:text-green-400',
                    bgColor: 'bg-green-50 dark:bg-green-900/20',
                    borderColor: 'border-green-200 dark:border-green-800',
                    label: 'Verified'
                }
            case 'pending':
                return {
                    icon: Clock,
                    variant: 'secondary' as const,
                    color: 'text-yellow-600 dark:text-yellow-400',
                    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
                    borderColor: 'border-yellow-200 dark:border-yellow-800',
                    label: 'Pending'
                }
            case 'rejected':
                return {
                    icon: AlertCircle,
                    variant: 'destructive' as const,
                    color: 'text-red-600 dark:text-red-400',
                    bgColor: 'bg-red-50 dark:bg-red-900/20',
                    borderColor: 'border-red-200 dark:border-red-800',
                    label: 'Rejected'
                }
            default:
                return {
                    icon: Clock,
                    variant: 'outline' as const,
                    color: 'text-gray-600 dark:text-gray-400',
                    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
                    borderColor: 'border-gray-200 dark:border-gray-800',
                    label: status
                }
        }
    }

    const getStatusCounts = () => {
        const counts = {
            all: sellers.total,
            pending: sellers.data.filter(s => s.verification_status === 'pending').length,
            verified: sellers.data.filter(s => s.verification_status === 'verified').length,
            rejected: sellers.data.filter(s => s.verification_status === 'rejected').length,
        }
        return counts
    }

    const statusCounts = getStatusCounts()

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Sellers - Admin" />
            
            <div className="space-y-6 p-4 sm:p-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage Sellers</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                            Verify and manage seller profiles for the livestock marketplace
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
                            <UsersIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                Total: <span className="font-semibold text-gray-900 dark:text-white">{sellers.total}</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            <div className="w-48">
                                <Select value={selectedStatus || "all"} onValueChange={(value) => handleStatusChange(value === "all" ? "" : value)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="verified">Verified</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">All Sellers</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{statusCounts.all}</p>
                                </div>
                                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <UsersIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Pending</p>
                                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{statusCounts.pending}</p>
                                </div>
                                <div className="h-10 w-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                                    <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Verified</p>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{statusCounts.verified}</p>
                                </div>
                                <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Rejected</p>
                                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{statusCounts.rejected}</p>
                                </div>
                                <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sellers Grid */}
                {sellers.data.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {sellers.data.map((seller) => {
                                const statusConfig = getStatusConfig(seller.verification_status)
                                const StatusIcon = statusConfig.icon
                                
                                return (
                                    <Card 
                                        key={seller.id}
                                        className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-200 dark:border-gray-800 overflow-hidden"
                                    >
                                        {/* Status Indicator Bar */}
                                        <div className={`h-1 ${statusConfig.bgColor} ${statusConfig.borderColor} border-b`} />
                                        
                                        <CardHeader className="pb-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className={`h-14 w-14 rounded-xl ${statusConfig.bgColor} flex items-center justify-center shrink-0 shadow-sm`}>
                                                        <Building2 className={`h-7 w-7 ${statusConfig.color}`} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <CardTitle className="text-lg font-semibold truncate text-gray-900 dark:text-white">
                                                            {seller.farm_name}
                                                        </CardTitle>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Badge 
                                                                variant={statusConfig.variant}
                                                                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5"
                                                            >
                                                                <StatusIcon className="h-3.5 w-3.5" />
                                                                <span className="capitalize">{statusConfig.label}</span>
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        
                                        <CardContent className="space-y-4">
                                            {/* Owner Information */}
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                                    <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                                        <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Owner</p>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate mt-0.5">
                                                            {seller.user.name}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                                    <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                                        <Mail className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</p>
                                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate mt-0.5">
                                                            {seller.user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                                    <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                                        <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Listings</p>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                                                            {seller.listings_count || 0}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Buttons - Bottom Right */}
                                            <Separator className="my-2" />
                                            <div className="flex items-center justify-end gap-1.5 pt-1">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleView(seller.id)}
                                                            className="h-8 w-8 p-0 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>View Seller</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                                {seller.listings_count > 0 && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleViewListings(seller.id)}
                                                                className="h-8 w-8 p-0 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:border-purple-300 dark:hover:border-purple-700"
                                                            >
                                                                <List className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>View Listings</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                                {/* Show Verify button for pending or rejected sellers */}
                                                {(seller.verification_status === 'pending' || seller.verification_status === 'rejected') && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleVerify(seller.id)}
                                                                className="h-8 w-8 p-0 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:border-green-300 dark:hover:border-green-700"
                                                            >
                                                                <CheckCircle className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Verify Seller</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                                {/* Show Reject button for pending or verified sellers */}
                                                {(seller.verification_status === 'pending' || seller.verification_status === 'verified') && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleRejectClick(seller)}
                                                                className="h-8 w-8 p-0 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-700"
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Reject Seller</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDeleteClick(seller)}
                                                            className="h-8 w-8 p-0 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-700"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Delete Seller</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>

                        {/* Pagination */}
                        {sellers.last_page > 1 && (
                            <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Showing <span className="font-semibold text-gray-900 dark:text-white">
                                                {((sellers.current_page - 1) * sellers.per_page || 0) + 1}
                                            </span> to <span className="font-semibold text-gray-900 dark:text-white">
                                                {Math.min(sellers.current_page * sellers.per_page || 0, sellers.total)}
                                            </span> of <span className="font-semibold text-gray-900 dark:text-white">
                                                {sellers.total}
                                            </span> sellers
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap justify-center">
                                            {sellers.links.map((link, index) => (
                                                <Button
                                                    key={index}
                                                    variant={link.active ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => {
                                                        if (link.url) {
                                                            const url = new URL(link.url)
                                                            const params = new URLSearchParams(url.search)
                                                            router.get('/admin/livestock/sellers', Object.fromEntries(params), {
                                                                preserveState: true,
                                                                replace: true
                                                            })
                                                        }
                                                    }}
                                                    disabled={!link.url || link.active}
                                                    className={link.active ? "bg-primary hover:bg-primary/90" : ""}
                                                >
                                                    <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                ) : (
                    <Card className="border-gray-200 dark:border-gray-800">
                        <CardContent className="p-16 text-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <Building2 className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                                </div>
                                <div>
                                    <p className="text-xl font-semibold text-gray-900 dark:text-white mb-1.5">No sellers found</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {selectedStatus ? `No sellers with status "${selectedStatus}"` : "No sellers have been registered yet"}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Reject Confirmation Dialog */}
                <Dialog open={!!rejectSeller} onOpenChange={(open) => {
                    if (!open) {
                        setRejectSeller(null)
                        setRejectionReason('')
                    }
                }}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                <XCircle className="h-5 w-5 text-red-600" />
                                Reject Seller
                            </DialogTitle>
                            <DialogDescription>
                                Please provide a reason for rejecting the seller profile for <span className="font-semibold">{rejectSeller?.farm_name}</span>.
                                This reason will be visible to the seller.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="rejection-reason" className="text-sm font-medium">
                                    Rejection Reason <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    id="rejection-reason"
                                    placeholder="Enter the reason for rejection..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="min-h-[120px] resize-none"
                                    disabled={isRejecting}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    This reason will be displayed to the seller and cannot be changed later.
                                </p>
                            </div>
                            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">Important</p>
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                    Once rejected, the seller will need to submit a new profile application. Make sure the reason is clear and helpful.
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setRejectSeller(null)
                                    setRejectionReason('')
                                }}
                                disabled={isRejecting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleRejectConfirm}
                                disabled={isRejecting || !rejectionReason.trim()}
                            >
                                {isRejecting ? "Rejecting..." : "Reject Seller"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={!!deleteSeller} onOpenChange={(open) => !open && setDeleteSeller(null)}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                <Trash2 className="h-5 w-5 text-red-600" />
                                Delete Seller
                            </DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete the seller profile for <span className="font-semibold">{deleteSeller?.farm_name}</span>? 
                                This action cannot be undone and will permanently remove all seller data.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
                            <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">Warning</p>
                            <p className="text-xs text-red-700 dark:text-red-400">
                                This will permanently delete the seller profile and all associated data. This action cannot be reversed.
                            </p>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setDeleteSeller(null)}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Deleting..." : "Delete Seller"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    )
}


