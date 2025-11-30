"use client"

import React, { useState } from "react"
import { Head, router, useForm, usePage, Link } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { PlusCircle, Search, Trash2, Edit, ArrowLeft, PieChart, Building, DollarSign, Calendar, TrendingUp, Eye } from "lucide-react"
import { motion } from "framer-motion"
import { debounce } from "lodash"
import AppLayout from "@/layouts/app-layout"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/admin/Pagination"
import { cn } from "@/lib/utils"
import type { BreadcrumbItem } from "@/types"
import { format } from "date-fns"

interface FractionalAsset {
    id: number
    name: string
}

interface FractionalOffering {
    id: number
    asset_id: number
    title: string
    total_shares: number
    available_shares: number
    price_per_share: number
    currency: string
    status: string
    created_at: string
    asset: FractionalAsset
}

interface LaravelPagination<T> {
    data: T[]
    links: { url: string | null; label: string; active: boolean }[]
    current_page: number
    last_page: number
    from: number | null
    to: number | null
    total: number
}

interface OfferingIndexProps {
    offerings: LaravelPagination<FractionalOffering>
}

const statusTone: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    live: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    sold_out: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    closed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
}

export default function OfferingIndex() {
    const { offerings } = usePage<OfferingIndexProps>().props
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [selectedOffering, setSelectedOffering] = useState<FractionalOffering | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    const {
        delete: destroy,
        processing,
    } = useForm({})

    const handleSearchChange = (value: string) => {
        setSearchQuery(value)
        
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }
        
        searchTimeoutRef.current = setTimeout(() => {
            router.get(route("admin.fractional.offerings.index"), { search: value.trim() }, { preserveState: true, replace: true })
        }, 500)
    }

    React.useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [])

    const openDeleteModal = (offering: FractionalOffering) => {
        setSelectedOffering(offering)
        setIsDeleteModalOpen(true)
    }

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false)
        setSelectedOffering(null)
    }

    const handleDelete = () => {
        if (selectedOffering) {
            destroy(route("admin.fractional.offerings.destroy", selectedOffering.id), {
                onSuccess: () => {
                    closeDeleteModal()
                },
            })
        }
    }

    const getStatusBadge = (status: string) => {
        return (
            <Badge className={cn("text-xs capitalize font-medium px-2.5 py-1", statusTone[status] || "bg-gray-100 text-gray-700")}>
                {status.replace("_", " ")}
            </Badge>
        )
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { title: "Dashboard", href: "/dashboard" },
        { title: "Fractional Ownership", href: route("admin.fractional.offerings.index") },
        { title: "Offerings", href: route("admin.fractional.offerings.index") },
    ]

    const hasResults = offerings.data.length > 0
    const soldShares = (offering: FractionalOffering) => offering.total_shares - offering.available_shares
    const soldPercentage = (offering: FractionalOffering) => 
        Math.round((soldShares(offering) / offering.total_shares) * 100)

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Fractional Offerings" />

            <div className="m-2 md:m-4 space-y-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Fractional Offerings</h1>
                        <p className="text-sm text-muted-foreground">Manage fractional ownership offerings for your assets.</p>
                    </div>
                    <Link href={route("admin.fractional.offerings.create")}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Create Offering
                        </Button>
                    </Link>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-end">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search offerings..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    className="pl-9 w-full sm:w-[300px]"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {!hasResults ? (
                            <div className="flex flex-col items-center justify-center py-16 px-4">
                                <div className="rounded-full bg-muted p-4 mb-4">
                                    <PieChart className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">No offerings found</h3>
                                <p className="text-sm text-muted-foreground text-center max-w-md">
                                    {searchQuery
                                        ? "No offerings match your search criteria. Try adjusting your search terms."
                                        : "Get started by creating your first fractional offering."}
                                </p>
                                {!searchQuery && (
                                    <Link href={route("admin.fractional.offerings.create")} className="mt-4">
                                        <Button>
                                            <PlusCircle className="mr-2 h-4 w-4" /> Create Offering
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {offerings.data.map((offering) => {
                                        const sold = soldShares(offering)
                                        const percentage = soldPercentage(offering)

                                        return (
                                            <Card key={offering.id} className="hover:shadow-lg transition-all duration-200 border-border/50 p-0 flex flex-col">
                                                <CardHeader className="pb-2.5 border-b px-3 pt-3 flex-shrink-0">
                                                    <div className="flex items-start gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <PieChart className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                                <CardTitle className="text-sm sm:text-base font-semibold truncate">
                                                                    {offering.title}
                                                                </CardTitle>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <Building className="h-3 w-3 flex-shrink-0" />
                                                                <span className="truncate">{offering.asset.name}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="pt-3 space-y-3 px-3 pb-3 flex-1 flex flex-col">
                                                    {/* Status Badge */}
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {getStatusBadge(offering.status)}
                                                    </div>

                                                    {/* Shares Progress */}
                                                    <div className="space-y-2 flex-shrink-0">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-muted-foreground">Shares Sold</span>
                                                            <span className="font-semibold whitespace-nowrap">{sold} / {offering.total_shares}</span>
                                                        </div>
                                                        <div className="w-full bg-muted rounded-full h-2">
                                                            <div
                                                                className="bg-primary h-2 rounded-full transition-all"
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <TrendingUp className="h-3 w-3 flex-shrink-0" />
                                                            <span>{percentage}% sold</span>
                                                        </div>
                                                    </div>

                                                    {/* Price */}
                                                    <div className="flex items-center gap-2 pt-2 border-t bg-muted/30 -mx-3 px-3 py-2 flex-shrink-0">
                                                        <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                                <span className="text-xs text-muted-foreground whitespace-nowrap">Price per Share</span>
                                                                <span className="text-sm font-semibold truncate">
                                                                    {offering.currency} {offering.price_per_share.toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Created Date */}
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t flex-shrink-0">
                                                        <Calendar className="h-3 w-3 flex-shrink-0" />
                                                        <span className="truncate">Created {format(new Date(offering.created_at), "MMM d, yyyy")}</span>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex gap-2 pt-2 border-t flex-shrink-0 mt-auto">
                                                        <Link href={route("admin.fractional.offerings.show", offering.id)} className="flex-1 min-w-0">
                                                            <Button variant="outline" size="sm" className="w-full text-xs h-8">
                                                                <Eye className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                                                                <span className="hidden sm:inline">View</span>
                                                            </Button>
                                                        </Link>
                                                        <Link href={route("admin.fractional.offerings.edit", offering.id)} className="flex-shrink-0">
                                                            <Button variant="outline" size="sm" className="text-xs h-8 w-8 sm:w-auto px-2">
                                                                <Edit className="h-3.5 w-3.5" />
                                                                <span className="hidden sm:inline ml-1.5">Edit</span>
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-xs h-8 w-8 sm:w-auto px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800 flex-shrink-0"
                                                            onClick={() => openDeleteModal(offering)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                            <span className="hidden sm:inline ml-1.5">Delete</span>
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                                </div>

                                {/* Pagination */}
                                {offerings.last_page > 1 && (
                                    <div className="mt-6 flex justify-center">
                                        <Pagination>
                                            <PaginationContent>
                                                {offerings.links.map((link, index) => (
                                                    <PaginationItem key={index}>
                                                        {link.url ? (
                                                            <PaginationLink href={link.url} isActive={link.active} size="icon">
                                                                {link.label.includes("Previous") ? (
                                                                    <PaginationPrevious size="icon" />
                                                                ) : link.label.includes("Next") ? (
                                                                    <PaginationNext size="icon" />
                                                                ) : (
                                                                    link.label
                                                                )}
                                                            </PaginationLink>
                                                        ) : (
                                                            <PaginationEllipsis />
                                                        )}
                                                    </PaginationItem>
                                                ))}
                                            </PaginationContent>
                                        </Pagination>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the offering "<span className="font-semibold">{selectedOffering?.title}</span>"?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={closeDeleteModal}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleDelete} disabled={processing}>
                            {processing ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    )
}
