"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { router, Head } from "@inertiajs/react"
import { useState } from "react"
import { Trash2, Eye } from "lucide-react"
import { showSuccessToast, showErrorToast } from '@/lib/toast'
import { route } from "ziggy-js"
interface Animal {
    id: number
    breed: string
    primary_photo?: { url: string } | null
}

interface Seller {
    id: number
    name: string
}

interface Listing {
    id: number
    title: string
    price: number
    status: string
    animal: Animal
    seller: Seller
}

interface ListingsProps {
    listings: {
        data: Listing[]
        links: { url: string | null; label: string; active: boolean }[]
        current_page: number
        last_page: number
        total: number
    }
    filters: {
        status?: string
    }
}

export default function AdminListings({ listings, filters }: ListingsProps) {
    const [selectedStatus, setSelectedStatus] = useState(filters.status || '')

    const handleStatusChange = (status: string) => {
        setSelectedStatus(status)
        const params: Record<string, string> = {}
        if (status) params.status = status
        
        router.get(route('admin.listings'), params, {
            preserveState: true,
            replace: true
        })
    }

    const handleRemove = (id: number) => {
        if (confirm('Are you sure you want to remove this listing?')) {
            router.delete(route('admin.listings.remove', id), {
                onSuccess: () => {
                    showSuccessToast('Listing removed successfully.')
                },
                onError: () => {
                    showErrorToast('Failed to remove listing.')
                }
            })
        }
    }

    return (
        <LivestockDashboardLayout>
            <Head title="Manage Listings - Admin" />
            
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage Listings</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Review and manage marketplace listings
                    </p>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-4">
                        <select
                            value={selectedStatus}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="sold">Sold</option>
                            <option value="removed">Removed</option>
                            <option value="pending">Pending</option>
                        </select>
                    </CardContent>
                </Card>

                {/* Listings List */}
                {listings.data.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {listings.data.map((listing) => (
                            <Card key={listing.id}>
                                <CardContent className="p-0">
                                    <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
                                        {listing.animal.primary_photo ? (
                                            <img
                                                src={listing.animal.primary_photo.url}
                                                alt={listing.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Eye className="h-16 w-16 text-gray-400" />
                                            </div>
                                        )}
                                        <Badge 
                                            className="absolute top-2 right-2"
                                            variant={listing.status === 'active' ? 'default' : 'secondary'}
                                        >
                                            {listing.status}
                                        </Badge>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                                            {listing.title}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                            {listing.animal.breed}
                                        </p>
                                        <p className="text-lg font-bold text-green-600 dark:text-green-400 mb-4">
                                            ${listing.price.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                                            Seller: {listing.seller.name}
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.visit(`/admin/livestock/listings/${listing.id}`)}
                                                className="flex-1"
                                            >
                                                <Eye className="h-3 w-3 mr-1" />
                                                View
                                            </Button>
                                            {listing.status === 'active' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleRemove(listing.id)}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <p className="text-gray-600 dark:text-gray-400">No listings found.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </LivestockDashboardLayout>
    )
}

