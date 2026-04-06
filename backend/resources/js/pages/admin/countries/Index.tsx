"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, router } from "@inertiajs/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
    Plus, 
    Search, 
    Edit, 
    Trash2, 
    Building,
    Globe,
    Filter,
    Hash
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface Country {
    id: number
    code: string
    name: string
    is_active: boolean
    display_order: number
}

interface CountriesIndexProps {
    countries: {
        data: Country[]
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

export default function CountriesIndex({ countries, filters: initialFilters }: CountriesIndexProps) {
    const [search, setSearch] = useState(initialFilters.search || '')
    const [selectedStatus, setSelectedStatus] = useState(initialFilters.status || '')
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [countryToDelete, setCountryToDelete] = useState<Country | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleSearch = (value: string) => {
        setSearch(value)
        router.get('/admin/countries', {
            search: value || '',
            status: selectedStatus || '',
        }, {
            preserveState: true,
            replace: true,
        })
    }

    const handleStatusChange = (value: string) => {
        setSelectedStatus(value === 'all' ? '' : value)
        router.get('/admin/countries', {
            search: search || '',
            status: value === 'all' ? '' : value,
        }, {
            preserveState: true,
            replace: true,
        })
    }

    const handleDeleteClick = (country: Country) => {
        setCountryToDelete(country)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = () => {
        if (!countryToDelete) return

        setIsDeleting(true)
        router.delete(`/admin/countries/${countryToDelete.id}`, {
            onFinish: () => {
                setIsDeleting(false)
                setDeleteDialogOpen(false)
                setCountryToDelete(null)
            },
        })
    }

    const getStatusConfig = (isActive: boolean) => {
        if (isActive) {
            return {
                label: 'Active',
                variant: 'default' as const,
                bgColor: 'bg-green-100 dark:bg-green-900/20',
                color: 'text-green-800 dark:text-green-200',
                borderColor: 'border-green-200 dark:border-green-800',
            }
        }
        return {
            label: 'Inactive',
            variant: 'secondary' as const,
            bgColor: 'bg-gray-100 dark:bg-gray-800',
            color: 'text-gray-800 dark:text-gray-200',
            borderColor: 'border-gray-200 dark:border-gray-700',
        }
    }

    const breadcrumbs = [
        { title: 'Dashboard', href: '/admin' },
        { title: 'Countries', href: '/admin/countries' },
    ]

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Country Management - Admin" />
            
            <div className="space-y-6 p-4 sm:p-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Country Management</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                            Manage countries for livestock tag numbering
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
                            <Building className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                Total: <span className="font-semibold text-gray-900 dark:text-white">{countries.total}</span>
                            </span>
                        </div>
                        <Link href="/admin/countries/create">
                            <Button className="bg-primary hover:bg-primary/90">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Country
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
                                        type="text"
                                        placeholder="Search by name or code..."
                                        value={search}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div className="w-full sm:w-48">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                    <Select value={selectedStatus || "all"} onValueChange={handleStatusChange}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="All Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Status</SelectItem>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Countries Grid */}
                {countries.data.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {countries.data.map((country) => {
                                const statusConfig = getStatusConfig(country.is_active)
                                
                                return (
                                    <Card 
                                        key={country.id}
                                        className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-200 dark:border-gray-800 overflow-hidden"
                                    >
                                        {/* Status Indicator Bar */}
                                        <div className={`h-1 ${statusConfig.bgColor} ${statusConfig.borderColor} border-b`} />
                                        
                                        <CardHeader className="pb-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className={`h-14 w-14 rounded-xl ${statusConfig.bgColor} flex items-center justify-center shrink-0 shadow-sm`}>
                                                        <Globe className={`h-7 w-7 ${statusConfig.color}`} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <CardTitle className="text-lg font-semibold truncate text-gray-900 dark:text-white">
                                                            {country.name}
                                                        </CardTitle>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Badge 
                                                                variant={statusConfig.variant}
                                                                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5"
                                                            >
                                                                <span className="capitalize">{statusConfig.label}</span>
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        
                                        <CardContent className="space-y-4">
                                            {/* Country Code */}
                                            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                                <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                                    <Hash className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Code</p>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                                                        {country.code}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Display Order */}
                                            {country.display_order > 0 && (
                                                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                                    <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                                        <Hash className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Display Order</p>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                                                            {country.display_order}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <Link href={`/admin/countries/${country.id}/edit`}>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    onClick={() => handleDeleteClick(country)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>

                        {/* Pagination */}
                        {countries.last_page > 1 && (
                            <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Showing <span className="font-semibold text-gray-900 dark:text-white">
                                                {((countries.current_page - 1) * countries.per_page || 0) + 1}
                                            </span> to <span className="font-semibold text-gray-900 dark:text-white">
                                                {Math.min(countries.current_page * countries.per_page || 0, countries.total)}
                                            </span> of <span className="font-semibold text-gray-900 dark:text-white">
                                                {countries.total}
                                            </span> countries
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap justify-center">
                                            {countries.links.map((link, index) => (
                                                <Button
                                                    key={index}
                                                    variant={link.active ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => {
                                                        if (link.url) {
                                                            const url = new URL(link.url)
                                                            const params = new URLSearchParams(url.search)
                                                            router.get('/admin/countries', Object.fromEntries(params), {
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
                                    <Building className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                                </div>
                                <div>
                                    <p className="text-xl font-semibold text-gray-900 dark:text-white mb-1.5">No countries found</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {search || selectedStatus ? 'Try adjusting your filters' : 'Get started by adding your first country'}
                                    </p>
                                </div>
                                {!search && !selectedStatus && (
                                    <Link href="/admin/countries/create">
                                        <Button className="mt-4">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Country
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Country</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete <strong>{countryToDelete?.name}</strong> ({countryToDelete?.code})? 
                                This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setDeleteDialogOpen(false)
                                    setCountryToDelete(null)
                                }}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
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

