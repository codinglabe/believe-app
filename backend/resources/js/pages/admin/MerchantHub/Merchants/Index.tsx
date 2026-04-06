"use client"

import React, { useState } from "react"
import { Head, Link, router } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Store,
    Filter,
    CheckCircle,
    XCircle,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { BreadcrumbItem } from "@/types"

interface MerchantHubMerchant {
    id: number
    name: string
    slug: string
    logo_url: string | null
    is_active: boolean
    offers_count: number
    created_at: string
    updated_at: string
}

interface MerchantsIndexProps {
    merchants: {
        data: MerchantHubMerchant[]
        current_page: number
        last_page: number
        per_page: number
        total: number
        links: Array<{
            url: string | null
            label: string
            active: boolean
        }>
    }
    filters: {
        search: string
        status: string
    }
}

const breadcrumbs: BreadcrumbItem[] = [
    // { title: 'Dashboard', href: '/dashboard' },
    { title: 'Merchant Hub', href: '/admin/merchant-hub' },
    { title: 'Merchants', href: '/admin/merchant-hub/merchants' },
]

export default function AdminMerchantsIndex({ merchants, filters: initialFilters }: MerchantsIndexProps) {
    const [search, setSearch] = useState(initialFilters.search || '')
    const [selectedStatus, setSelectedStatus] = useState(initialFilters.status || '')
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [merchantToDelete, setMerchantToDelete] = useState<MerchantHubMerchant | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleSearch = (value: string) => {
        setSearch(value)
        router.get('/admin/merchant-hub/merchants', {
            search: value || '',
            status: selectedStatus || '',
        }, {
            preserveState: true,
            replace: true,
        })
    }

    const handleStatusChange = (value: string) => {
        setSelectedStatus(value === 'all' ? '' : value)
        router.get('/admin/merchant-hub/merchants', {
            search: search || '',
            status: value === 'all' ? '' : value,
        }, {
            preserveState: true,
            replace: true,
        })
    }

    const handleDeleteClick = (merchant: MerchantHubMerchant) => {
        setMerchantToDelete(merchant)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = () => {
        if (!merchantToDelete) return

        setIsDeleting(true)
        router.delete(`/admin/merchant-hub/merchants/${merchantToDelete.id}`, {
            onFinish: () => {
                setIsDeleting(false)
                setDeleteDialogOpen(false)
                setMerchantToDelete(null)
            },
        })
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Merchants Management - Admin" />

            <div className="space-y-6 p-4 sm:p-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Merchants Management</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                            Manage merchants for the Merchant Hub. Total: {merchants.total} merchants
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
                            <Store className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                Total: <span className="font-semibold text-gray-900 dark:text-white">{merchants.total}</span>
                            </span>
                        </div>
                        <Link href="/admin/merchant-hub/merchants/create">
                            <Button className="bg-primary hover:bg-primary/90">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Merchant
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <Card className="border-gray-200 dark:border-gray-800">
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search merchants by name or slug..."
                                        value={search}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        className="pl-10 bg-white dark:bg-gray-800"
                                    />
                                </div>
                            </div>
                            <div className="sm:w-48">
                                <Select value={selectedStatus || 'all'} onValueChange={handleStatusChange}>
                                    <SelectTrigger className="bg-white dark:bg-gray-800">
                                        <Filter className="h-4 w-4 mr-2" />
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Merchants Table */}
                {merchants.data.length === 0 ? (
                    <Card className="border-gray-200 dark:border-gray-800">
                        <CardContent className="p-16 text-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <Store className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                                </div>
                                <div>
                                    <p className="text-xl font-semibold text-gray-900 dark:text-white mb-1.5">No merchants found</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {search || selectedStatus
                                            ? 'Try adjusting your search or filter criteria'
                                            : 'Get started by creating your first merchant'}
                                    </p>
                                </div>
                                {!search && !selectedStatus && (
                                    <Link href="/admin/merchant-hub/merchants/create">
                                        <Button>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Create Merchant
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border-gray-200 dark:border-gray-800">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Merchant</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Slug</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Offers</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                        {merchants.data.map((merchant) => (
                                            <tr key={merchant.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        {merchant.logo_url ? (
                                                            <img
                                                                src={merchant.logo_url.startsWith('http')
                                                                    ? merchant.logo_url
                                                                    : `/storage/${merchant.logo_url}`}
                                                                alt={merchant.name}
                                                                className="h-10 w-10 rounded-lg object-cover"
                                                            />
                                                        ) : (
                                                            <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                                <Store className="h-5 w-5 text-gray-400" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{merchant.name}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-600 dark:text-gray-400">{merchant.slug}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Badge variant="outline">{merchant.offers_count} offers</Badge>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {merchant.is_active ? (
                                                        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Active
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline">
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                            Inactive
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Link href={`/admin/merchant-hub/merchants/${merchant.id}/edit`}>
                                                            <Button variant="ghost" size="sm">
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteClick(merchant)}
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Pagination */}
                {merchants.last_page > 1 && (
                    <Card className="border-gray-200 dark:border-gray-800">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Showing {merchants.data.length} of {merchants.total} merchants
                                </div>
                                <div className="flex items-center gap-2">
                                    {merchants.links.map((link, index) => (
                                        <Button
                                            key={index}
                                            variant={link.active ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => {
                                                if (link.url) {
                                                    const url = new URL(link.url)
                                                    const params = Object.fromEntries(url.searchParams)
                                                    router.get('/admin/merchant-hub/merchants', params, {
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

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Merchant</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete <strong>{merchantToDelete?.name}</strong>?
                                {merchantToDelete && merchantToDelete.offers_count > 0 && (
                                    <span className="block mt-2 text-red-600 dark:text-red-400">
                                        This merchant has {merchantToDelete.offers_count} offer(s). Please remove or reassign offers first.
                                    </span>
                                )}
                                This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setDeleteDialogOpen(false)
                                    setMerchantToDelete(null)
                                }}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting || (merchantToDelete?.offers_count ?? 0) > 0}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    )
}

