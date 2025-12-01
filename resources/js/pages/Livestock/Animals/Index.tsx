"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Link, router, Head } from "@inertiajs/react"
import { useState, useMemo, useRef } from "react"
import { 
    Plus, 
    Eye, 
    Edit, 
    Trash2,
    Search,
    Filter,
    Heart,
    Tag,
    CheckCircle,
    XCircle,
    AlertCircle,
    TrendingUp,
    Package,
    Calendar,
    MapPin
} from "lucide-react"
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface Animal {
    id: number
    species: string
    breed: string
    sex: string
    ear_tag: string | null
    age_months: number | null
    status: string
    primary_photo?: { url: string } | null
    listing?: { id: number; status: string } | null
}

interface AnimalsIndexProps {
    animals: {
        data: Animal[]
        links: { url: string | null; label: string; active: boolean }[]
        current_page: number
        last_page: number
        total: number
    }
    filters: {
        search?: string
        status?: string
    }
}

export default function AnimalsIndex({ animals, filters }: AnimalsIndexProps) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '')
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all')
    const [deleteAnimal, setDeleteAnimal] = useState<Animal | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

    const handleSearchChange = (value: string) => {
        setSearchQuery(value)
        
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
    }

        debounceTimerRef.current = setTimeout(() => {
            const params: Record<string, string> = {}
            if (value.trim()) params.search = value.trim()
            if (selectedStatus && selectedStatus !== 'all') params.status = selectedStatus
            
            router.get(route('animals.index'), params, {
                preserveState: true,
                replace: true
            })
        }, 300)
    }

    const handleStatusChange = (status: string) => {
        setSelectedStatus(status)
        
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }
        
        debounceTimerRef.current = setTimeout(() => {
            const params: Record<string, string> = {}
            if (searchQuery.trim()) params.search = searchQuery.trim()
            if (status && status !== 'all') params.status = status
            
            router.get(route('animals.index'), params, {
                preserveState: true,
                replace: true
            })
        }, 300)
    }

    const handleDeleteClick = (animal: Animal) => {
        setDeleteAnimal(animal)
    }

    const handleDeleteConfirm = () => {
        if (!deleteAnimal) return
        
        setIsDeleting(true)
        router.delete(route('animals.destroy', deleteAnimal.id), {
                onSuccess: () => {
                    showSuccessToast('Animal deleted successfully.')
                setDeleteAnimal(null)
                setIsDeleting(false)
                },
                onError: () => {
                    showErrorToast('Failed to delete animal.')
                setIsDeleting(false)
                }
            })
        }

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'available':
                return {
                    icon: CheckCircle,
                    variant: 'default' as const,
                    color: 'text-green-600 dark:text-green-400',
                    bgColor: 'bg-green-50 dark:bg-green-900/20',
                    borderColor: 'border-green-200 dark:border-green-800',
                    label: 'Available'
                }
            case 'sold':
                return {
                    icon: Package,
                    variant: 'secondary' as const,
                    color: 'text-blue-600 dark:text-blue-400',
                    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
                    borderColor: 'border-blue-200 dark:border-blue-800',
                    label: 'Sold'
                }
            case 'off_farm':
                return {
                    icon: MapPin,
                    variant: 'outline' as const,
                    color: 'text-yellow-600 dark:text-yellow-400',
                    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
                    borderColor: 'border-yellow-200 dark:border-yellow-800',
                    label: 'Off Farm'
                }
            case 'deceased':
                return {
                    icon: XCircle,
                    variant: 'destructive' as const,
                    color: 'text-red-600 dark:text-red-400',
                    bgColor: 'bg-red-50 dark:bg-red-900/20',
                    borderColor: 'border-red-200 dark:border-red-800',
                    label: 'Deceased'
                }
            default:
                return {
                    icon: AlertCircle,
                    variant: 'secondary' as const,
                    color: 'text-gray-600 dark:text-gray-400',
                    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
                    borderColor: 'border-gray-200 dark:border-gray-800',
                    label: status
                }
        }
    }

    // Calculate stats
    const stats = useMemo(() => {
        const all = animals.total
        const available = animals.data.filter(a => a.status === 'available').length
        const sold = animals.data.filter(a => a.status === 'sold').length
        const offFarm = animals.data.filter(a => a.status === 'off_farm').length
        const deceased = animals.data.filter(a => a.status === 'deceased').length
        
        return { all, available, sold, offFarm, deceased }
    }, [animals])

    return (
        <LivestockDashboardLayout>
            <Head title="My Animals - Livestock Management" />
            
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Animals</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Manage your livestock inventory
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="relative flex-1 md:max-w-xs">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search animals..."
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500"
                            />
                        </div>
                        {/* Filter */}
                        <Select value={selectedStatus} onValueChange={handleStatusChange}>
                            <SelectTrigger className="w-[180px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="available">Available</SelectItem>
                                <SelectItem value="sold">Sold</SelectItem>
                                <SelectItem value="off_farm">Off Farm</SelectItem>
                                <SelectItem value="deceased">Deceased</SelectItem>
                            </SelectContent>
                        </Select>
                        {/* Add Button */}
                    <Link href={route('animals.create')}>
                            <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Animal
                        </Button>
                    </Link>
                </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Animals</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.all}</p>
                                </div>
                                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                                    <Heart className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-green-200 dark:border-green-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.available}</p>
                                </div>
                                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-blue-200 dark:border-blue-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Sold</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.sold}</p>
                                </div>
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                    <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-yellow-200 dark:border-yellow-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Off Farm</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.offFarm}</p>
                                </div>
                                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                                    <MapPin className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                                </div>
                        </div>
                    </CardContent>
                </Card>

                    <Card className="border border-red-200 dark:border-red-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Deceased</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.deceased}</p>
                                </div>
                                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                                    <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Animals Grid */}
                {animals.data.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {animals.data.map((animal) => {
                            const statusConfig = getStatusConfig(animal.status)
                            const StatusIcon = statusConfig.icon
                            
                            return (
                                <Card 
                                    key={animal.id} 
                                    className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-all overflow-hidden group p-0"
                                >
                                    {/* Full Width Image at Top - No Padding, Flush with Card */}
                                    <div className="relative w-full aspect-[3/2] bg-gray-200 dark:bg-gray-800 overflow-hidden">
                                        {animal.primary_photo ? (
                                            <img
                                                src={animal.primary_photo.url}
                                                alt={animal.breed}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-800">
                                                <Heart className="h-16 w-16 text-gray-400 dark:text-gray-600" />
                                            </div>
                                        )}
                                        
                                        {/* Status Badge - Green for Available */}
                                        <div className="absolute top-2 right-2 z-10">
                                        <Badge 
                                                className={`${
                                                    animal.status === 'available' 
                                                        ? 'bg-green-500 hover:bg-green-600 text-white border-0' 
                                                        : `${statusConfig.bgColor} ${statusConfig.borderColor} ${statusConfig.color} border-2`
                                                } flex items-center gap-1 px-2 py-0.5 text-xs shadow-lg`}
                                                variant={animal.status === 'available' ? 'default' : statusConfig.variant}
                                            >
                                                {animal.status === 'available' ? (
                                                    <>
                                                        <CheckCircle className="h-3 w-3" />
                                                        <span className="font-semibold">Available</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <StatusIcon className="h-3 w-3" />
                                                        <span className="font-semibold">{statusConfig.label}</span>
                                                    </>
                                                )}
                                            </Badge>
                                        </div>
                                        
                                        {/* Listing Badge */}
                                        {animal.listing && (
                                            <div className="absolute top-2 left-2 z-10">
                                                <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-lg text-xs px-2 py-0.5">
                                                    <TrendingUp className="h-3 w-3 mr-1" />
                                                    Listed
                                        </Badge>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Content Section */}
                                    <CardContent className="p-4">
                                        {/* Title */}
                                        <div className="mb-3">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">
                                            {animal.breed}
                                        </h3>
                                            
                                            {/* Info Grid */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="p-1 bg-amber-500/20 dark:bg-amber-500/30 rounded">
                                                            <Tag className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                                        </div>
                                                        <span className="text-gray-700 dark:text-gray-300 capitalize font-medium">{animal.species}</span>
                                                    </div>
                                                    <span className="text-gray-400 dark:text-gray-500">•</span>
                                                    <span className="text-gray-700 dark:text-gray-300 capitalize font-medium">{animal.sex}</span>
                                            </div>
                                                
                                            {animal.ear_tag && (
                                                    <div className="flex items-center gap-1.5 text-xs">
                                                        <div className="p-1 bg-amber-500/20 dark:bg-amber-500/30 rounded">
                                                            <Tag className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                                        </div>
                                                        <span className="text-gray-700 dark:text-gray-300 font-medium">Ear Tag:</span>
                                                        <span className="text-gray-900 dark:text-white font-bold">{animal.ear_tag}</span>
                                                    </div>
                                            )}
                                                
                                            {animal.age_months && (
                                                    <div className="flex items-center gap-1.5 text-xs">
                                                        <div className="p-1 bg-amber-500/20 dark:bg-amber-500/30 rounded">
                                                            <Calendar className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                                        </div>
                                                        <span className="text-gray-700 dark:text-gray-300 font-medium">Age:</span>
                                                        <span className="text-gray-900 dark:text-white font-bold">{animal.age_months} months</span>
                                                    </div>
                                            )}
                                            </div>
                                        </div>
                                        
                                        {/* Action Buttons */}
                                        <div className="flex gap-1.5 pt-3 border-t border-gray-200 dark:border-gray-700">
                                            <Link href={route('animals.show', animal.id)} className="flex-1">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="w-full border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:border-amber-300 dark:hover:border-amber-700 font-medium text-xs h-8"
                                                >
                                                    <Eye className="h-3 w-3 mr-1" />
                                                    View
                                                </Button>
                                            </Link>
                                            {/* Only show Edit and Delete buttons if animal is not sold */}
                                            {animal.status !== 'sold' && (
                                                <>
                                                    <Link href={route('animals.edit', animal.id)} className="flex-1">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="w-full border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:border-amber-300 dark:hover:border-amber-700 font-medium text-xs h-8"
                                                        >
                                                            <Edit className="h-3 w-3 mr-1" />
                                                            Edit
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteClick(animal)}
                                                        className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-300 dark:hover:border-red-700 h-8 w-8 p-0"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </>
                                            )}
                                    </div>
                                </CardContent>
                            </Card>
                            )
                        })}
                    </div>
                ) : (
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg">
                        <CardContent className="p-16 text-center">
                            <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full w-fit mx-auto mb-6">
                                <Heart className="h-16 w-16 text-amber-600 dark:text-amber-400" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                                No animals found
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                                {searchQuery || (selectedStatus && selectedStatus !== 'all')
                                    ? 'Try adjusting your search or filter criteria to find what you\'re looking for.' 
                                    : 'Get started by adding your first animal to your livestock inventory.'}
                            </p>
                            <Link href={route('animals.create')}>
                                <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Your First Animal
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}

                {/* Pagination */}
                {animals.last_page > 1 && (
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        {animals.links.map((link, index) => (
                            <Button
                                key={index}
                                variant={link.active ? "default" : "outline"}
                                disabled={!link.url}
                                onClick={() => link.url && router.get(link.url)}
                                className={link.active ? "bg-amber-600 hover:bg-amber-700 text-white" : "border-gray-200 dark:border-gray-700"}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}

                {/* Delete Confirmation Dialog */}
                <Dialog open={!!deleteAnimal} onOpenChange={(open) => !open && setDeleteAnimal(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Animal</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete <strong>{deleteAnimal?.breed}</strong>? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setDeleteAnimal(null)}
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
        </LivestockDashboardLayout>
    )
}

