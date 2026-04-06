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
import { PlusCircle, Search, Trash2, Edit, ArrowLeft, Coins, Tag, FileText } from "lucide-react"
import { motion } from "framer-motion"
import { debounce } from "lodash"
import AppLayout from "@/layouts/app-layout"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/admin/Pagination"
import { cn } from "@/lib/utils"
import type { BreadcrumbItem } from "@/types"
import { format } from "date-fns"

interface FractionalAsset {
    id: number
    type: string
    name: string
    symbol: string | null
    description: string | null
    created_at: string
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

interface AssetIndexProps {
    assets: LaravelPagination<FractionalAsset>
}

export default function AssetIndex() {
    const { assets } = usePage<AssetIndexProps>().props
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [selectedAsset, setSelectedAsset] = useState<FractionalAsset | null>(null)
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
            router.get(route("admin.fractional.assets.index"), { search: value.trim() }, { preserveState: true, replace: true })
        }, 500)
    }

    React.useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [])

    const openDeleteModal = (asset: FractionalAsset) => {
        setSelectedAsset(asset)
        setIsDeleteModalOpen(true)
    }

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false)
        setSelectedAsset(null)
    }

    const handleDelete = () => {
        if (selectedAsset) {
            destroy(route("admin.fractional.assets.destroy", selectedAsset.id), {
                onSuccess: () => {
                    closeDeleteModal()
                },
            })
        }
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { title: "Dashboard", href: "/dashboard" },
        { title: "Fractional Ownership", href: route("admin.fractional.assets.index") },
        { title: "Assets", href: route("admin.fractional.assets.index") },
    ]

    const hasResults = assets.data.length > 0

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Fractional Assets" />

            <div className="m-2 md:m-4 space-y-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Fractional Assets</h1>
                        <p className="text-sm text-muted-foreground">Manage assets available for fractional ownership.</p>
                    </div>
                    <Link href={route("admin.fractional.assets.create")}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Create Asset
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
                                    placeholder="Search assets..."
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
                                    <Coins className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">No assets found</h3>
                                <p className="text-sm text-muted-foreground text-center max-w-md">
                                    {searchQuery
                                        ? "No assets match your search criteria. Try adjusting your search terms."
                                        : "Get started by creating your first fractional asset."}
                                </p>
                                {!searchQuery && (
                                    <Link href={route("admin.fractional.assets.create")} className="mt-4">
                                        <Button>
                                            <PlusCircle className="mr-2 h-4 w-4" /> Create Asset
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {assets.data.map((asset) => (
                                        <Card key={asset.id} className="hover:shadow-lg transition-all duration-200 border-border/50 p-0">
                                            <CardHeader className="pb-2.5 border-b px-3 pt-3">
                                                <div className="flex items-start gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Coins className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                            <CardTitle className="text-base font-semibold truncate">
                                                                {asset.name}
                                                            </CardTitle>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <Tag className="h-3 w-3" />
                                                            <span className="capitalize">{asset.type}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-3 space-y-3 px-3 pb-3">
                                                {asset.symbol && (
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-xs">
                                                            {asset.symbol}
                                                        </Badge>
                                                    </div>
                                                )}

                                                {asset.description && (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                                {asset.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                                                    <span>Created {format(new Date(asset.created_at), "MMM d, yyyy")}</span>
                                                </div>

                                                <div className="flex gap-2 pt-2 border-t">
                                                    <Link href={route("admin.fractional.assets.edit", asset.id)} className="flex-1">
                                                        <Button variant="outline" size="sm" className="w-full text-xs h-8">
                                                            <Edit className="h-3.5 w-3.5 mr-1.5" />
                                                            Edit
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                                                        onClick={() => openDeleteModal(asset)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                {/* Pagination */}
                                {assets.last_page > 1 && (
                                    <div className="mt-6 flex justify-center">
                                        <Pagination>
                                            <PaginationContent>
                                                {assets.links.map((link, index) => (
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
                            Are you sure you want to delete the asset "<span className="font-semibold">{selectedAsset?.name}</span>"?
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
