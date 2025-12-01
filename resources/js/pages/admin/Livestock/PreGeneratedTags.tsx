"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { router, Head, useForm } from "@inertiajs/react"
import { useState, useRef } from "react"
import { 
    Tag, 
    Search, 
    Filter, 
    Plus, 
    CheckCircle, 
    Clock, 
    XCircle,
    Package,
    Eye,
    Trash2,
    Building2,
    Hash,
    AlertCircle
} from "lucide-react"
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface Animal {
    id: number
    species: string
    breed: string
    ear_tag: string | null
}

interface PreGeneratedTag {
    id: number
    country_code: string
    tag_number: string
    status: 'available' | 'assigned' | 'needs_assignment'
    created_at: string
    animal: Animal | null
    fractional_asset_id: number | null
}

interface PreGeneratedTagsProps {
    tags: {
        data: PreGeneratedTag[]
        links: { url: string | null; label: string; active: boolean }[]
        current_page: number
        last_page: number
        total: number
    }
    stats: {
        total: number
        available: number
        assigned: number
        needs_assignment?: number
    }
    availableAnimals: Animal[]
    filters: {
        search?: string
        status?: string
        country_code?: string
    }
}

export default function PreGeneratedTags({ tags, stats, availableAnimals, filters }: PreGeneratedTagsProps) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '')
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all')
    const [selectedCountry, setSelectedCountry] = useState(filters.country_code || '')
    const [showGenerateDialog, setShowGenerateDialog] = useState(false)
    const [showAssignDialog, setShowAssignDialog] = useState(false)
    const [selectedTag, setSelectedTag] = useState<PreGeneratedTag | null>(null)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [tagToDelete, setTagToDelete] = useState<PreGeneratedTag | null>(null)

    const { data: generateData, setData: setGenerateData, post: generatePost, processing: isGenerating } = useForm({
        country_code: '',
        count: 10,
        start_number: 1,
    })

    const { data: assignData, setData: setAssignData, post: assignPost, processing: isAssigning } = useForm({
        livestock_animal_id: '',
    })

    const debouncedSearch = useRef(
        setTimeout(() => {}, 0)
    )

    const handleSearch = (value: string) => {
        setSearchQuery(value)
        clearTimeout(debouncedSearch.current)
        debouncedSearch.current = setTimeout(() => {
            const params: Record<string, string> = {}
            if (value.trim()) params.search = value.trim()
            if (selectedStatus && selectedStatus !== 'all') params.status = selectedStatus
            if (selectedCountry) params.country_code = selectedCountry
            
            router.get('/admin/livestock/pre-generated-tags', params, {
                preserveState: true,
                replace: true
            })
        }, 300)
    }

    const handleStatusChange = (status: string) => {
        setSelectedStatus(status)
        const params: Record<string, string> = {}
        if (searchQuery.trim()) params.search = searchQuery.trim()
        if (status && status !== 'all') params.status = status
        if (selectedCountry) params.country_code = selectedCountry
        
        router.get('/admin/livestock/pre-generated-tags', params, {
            preserveState: true,
            replace: true
        })
    }

    const handleCountryChange = (country: string) => {
        setSelectedCountry(country)
        const params: Record<string, string> = {}
        if (searchQuery.trim()) params.search = searchQuery.trim()
        if (selectedStatus && selectedStatus !== 'all') params.status = selectedStatus
        if (country) params.country_code = country
        
        router.get('/admin/livestock/pre-generated-tags', params, {
            preserveState: true,
            replace: true
        })
    }

    const handleGenerate = () => {
        generatePost('/admin/livestock/pre-generated-tags/generate', {
            preserveScroll: true,
            onSuccess: () => {
                setShowGenerateDialog(false)
                setGenerateData({ country_code: '', count: 10, start_number: 1 })
                showSuccessToast('Tags generated successfully!')
            },
            onError: (errors) => {
                showErrorToast('Failed to generate tags. Please check the form.')
            }
        })
    }

    const handleAssignClick = (tag: PreGeneratedTag) => {
        setSelectedTag(tag)
        setAssignData({ livestock_animal_id: '' })
        setShowAssignDialog(true)
    }

    const handleAssign = () => {
        if (!selectedTag) return
        
        assignPost(`/buyer/pre-generated-tags/${selectedTag.id}/assign`, {
            preserveScroll: true,
            onSuccess: () => {
                setShowAssignDialog(false)
                setSelectedTag(null)
                setAssignData({ livestock_animal_id: '' })
                showSuccessToast('Tag assigned successfully!')
            },
            onError: (errors) => {
                showErrorToast('Failed to assign tag. Please try again.')
            }
        })
    }

    const handleUnassign = (tag: PreGeneratedTag) => {
        if (!confirm('Are you sure you want to unassign this tag?')) return
        
        router.post(`/buyer/pre-generated-tags/${tag.id}/unassign`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                showSuccessToast('Tag unassigned successfully!')
            },
            onError: () => {
                showErrorToast('Failed to unassign tag.')
            }
        })
    }

    const handleDeleteClick = (tag: PreGeneratedTag) => {
        setTagToDelete(tag)
        setShowDeleteDialog(true)
    }

    const handleDelete = () => {
        if (!tagToDelete) return
        
        router.delete(`/admin/livestock/pre-generated-tags/${tagToDelete.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setShowDeleteDialog(false)
                setTagToDelete(null)
                showSuccessToast('Tag deleted successfully!')
            },
            onError: () => {
                showErrorToast('Failed to delete tag.')
            }
        })
    }

    return (
        <LivestockDashboardLayout>
            <Head title="Pre-Generated Tags" />
            
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <Hash className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                            Pre-Generated Tags
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                            Manage pre-generated tag numbers and assign them to animals
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
                            <Tag className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                Total: <span className="font-semibold text-gray-900 dark:text-white">{stats.total}</span>
                            </span>
                        </div>
                        <Button 
                            onClick={() => setShowGenerateDialog(true)}
                            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30 font-medium"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Generate Tags
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className={`grid grid-cols-1 ${stats.needs_assignment !== undefined && stats.needs_assignment > 0 ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tags</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
                                </div>
                                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                                    <Tag className="h-6 w-6 text-amber-600 dark:text-amber-400" />
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
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Assigned</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.assigned}</p>
                                </div>
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                    <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    {stats.needs_assignment !== undefined && stats.needs_assignment > 0 && (
                        <Card className="border border-yellow-200 dark:border-yellow-800/50 shadow-lg hover:shadow-xl transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Needs Assignment</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.needs_assignment}</p>
                                    </div>
                                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                                        <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search by tag number or country code..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pl-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <Select value={selectedStatus} onValueChange={handleStatusChange}>
                            <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                                <Filter className="h-4 w-4 mr-2 text-gray-400" />
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="available">Available</SelectItem>
                                <SelectItem value="assigned">Assigned</SelectItem>
                                <SelectItem value="needs_assignment">Needs Assignment</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-full sm:w-48">
                        <Input
                            type="text"
                            placeholder="Country Code (e.g., GM)"
                            value={selectedCountry}
                            onChange={(e) => handleCountryChange(e.target.value)}
                            className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                            maxLength={2}
                        />
                    </div>
                </div>

                {/* Tags Table */}
                {tags.data.length > 0 ? (
                    <Card className="border-gray-200 dark:border-gray-800">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tag Number</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Country Code</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Animal</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                                        {tags.data.map((tag) => (
                                            <tr key={tag.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <Tag className="h-4 w-4 text-gray-400" />
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white">{tag.tag_number}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Badge variant="outline" className="text-xs">
                                                        {tag.country_code}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {tag.status === 'needs_assignment' ? (
                                                        <Badge 
                                                            variant="outline"
                                                            className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700"
                                                        >
                                                            <AlertCircle className="h-3 w-3 mr-1" />
                                                            Needs Assignment
                                                        </Badge>
                                                    ) : tag.status === 'available' ? (
                                                        <Badge 
                                                            variant="default"
                                                            className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                                        >
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Available
                                                        </Badge>
                                                    ) : (
                                                        <Badge 
                                                            variant="secondary"
                                                            className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                                        >
                                                            <Package className="h-3 w-3 mr-1" />
                                                            Assigned
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {tag.animal ? (
                                                        <div className="text-sm text-gray-900 dark:text-white">
                                                            {tag.animal.breed} ({tag.animal.species})
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(tag.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {(tag.status === 'available' || tag.status === 'needs_assignment') ? (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleAssignClick(tag)}
                                                            >
                                                                Assign Animal
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleUnassign(tag)}
                                                            >
                                                                Unassign
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border-gray-200 dark:border-gray-800">
                        <CardContent className="p-12 text-center">
                            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-400">No pre-generated tags found.</p>
                            <Button 
                                onClick={() => setShowGenerateDialog(true)}
                                className="mt-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Generate Tags
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Pagination */}
                {tags.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Showing {tags.data.length} of {tags.total} tags
                        </div>
                        <div className="flex gap-2">
                            {tags.links.map((link, index) => (
                                <button
                                    key={index}
                                    onClick={() => link.url && router.get(link.url)}
                                    disabled={!link.url || link.active}
                                    className={`px-3 py-1 rounded-md text-sm ${
                                        link.active
                                            ? 'bg-primary text-white'
                                            : link.url
                                            ? 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Generate Tags Dialog */}
                <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Generate Pre-Generated Tags</DialogTitle>
                            <DialogDescription>
                                Generate multiple tag numbers at once. Tags will be created in the format: COUNTRY-001, COUNTRY-002, etc.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                                    Country Code (2 letters)
                                </label>
                                <Input
                                    type="text"
                                    value={generateData.country_code}
                                    onChange={(e) => setGenerateData('country_code', e.target.value.toUpperCase().slice(0, 2))}
                                    placeholder="e.g., GM"
                                    maxLength={2}
                                    className="uppercase"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                                    Number of Tags
                                </label>
                                <Input
                                    type="number"
                                    value={generateData.count}
                                    onChange={(e) => setGenerateData('count', parseInt(e.target.value) || 1)}
                                    min={1}
                                    max={100}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                                    Start Number (optional)
                                </label>
                                <Input
                                    type="number"
                                    value={generateData.start_number}
                                    onChange={(e) => setGenerateData('start_number', parseInt(e.target.value) || 1)}
                                    min={1}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    If not specified, will continue from the highest existing number
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleGenerate} disabled={isGenerating || !generateData.country_code}>
                                {isGenerating ? 'Generating...' : 'Generate Tags'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Assign Animal Dialog */}
                <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Assign Animal to Tag</DialogTitle>
                            <DialogDescription>
                                Select an animal to assign to tag: {selectedTag?.tag_number}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                                    Select Animal
                                </label>
                                <Select
                                    value={assignData.livestock_animal_id}
                                    onValueChange={(value) => setAssignData('livestock_animal_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an animal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableAnimals.map((animal) => (
                                            <SelectItem key={animal.id} value={animal.id.toString()}>
                                                {animal.breed} ({animal.species}) {animal.ear_tag ? `- ${animal.ear_tag}` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleAssign} disabled={isAssigning || !assignData.livestock_animal_id}>
                                {isAssigning ? 'Assigning...' : 'Assign Animal'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Tag</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete tag {tagToDelete?.tag_number}? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={handleDelete}>
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </LivestockDashboardLayout>
    )
}

