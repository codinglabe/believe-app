"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle 
} from "@/components/ui/dialog"
import { Link, Head, useForm, router } from "@inertiajs/react"
import { ArrowLeft, Plus, Calendar, Heart, DollarSign, User, Baby, FileText, Tag, X, Edit, Save, Trash2, Upload, Image as ImageIcon } from "lucide-react"
import { format } from "date-fns"
import { showSuccessToast, showErrorToast } from '@/lib/toast'
import { useState, useRef } from "react"
import type { BreadcrumbItem } from "@/types"

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Livestock", href: "#" },
    { title: "Breeding Events", href: "/breeding" },
    { title: "Breeding Details", href: "#" },
]

interface Animal {
    id: number
    breed: string
    ear_tag: string | null
}

interface Offspring {
    id: number
    child: {
        id: number
        species: string
        breed: string
        sex: string
        ear_tag: string | null
        date_of_birth: string | null
        weight_kg: number | null
        color_markings: string | null
        photos?: Array<{ id: number; url: string; is_primary?: boolean }>
    }
}

interface BreedingEvent {
    id: number
    male_id: number
    female_id: number
    breeding_method: string
    stud_fee: number | null
    breeding_date: string
    expected_kidding_date: string | null
    actual_kidding_date: string | null
    number_of_kids: number | null
    notes: string | null
    male: Animal
    female: Animal
    offspring: Offspring[]
}

interface ShowProps {
    event: BreedingEvent
}

export default function BreedingShow({ event }: ShowProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showAddForm, setShowAddForm] = useState(false)
    const [deleteChildDialogOpen, setDeleteChildDialogOpen] = useState(false)
    const [childToDelete, setChildToDelete] = useState<number | null>(null)
    const [isDeletingChild, setIsDeletingChild] = useState(false)
    const [editingChildId, setEditingChildId] = useState<number | null>(null)
    const [photos, setPhotos] = useState<File[]>([])
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
    const [editPhotos, setEditPhotos] = useState<File[]>([])
    const [editPhotoPreviews, setEditPhotoPreviews] = useState<string[]>([])
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const editFileInputRef = useRef<HTMLInputElement | null>(null)
    const { data, setData, post, processing } = useForm({
        offspring: [{
            species: 'goat',
            breed: '',
            sex: 'male',
            ear_tag: '',
            date_of_birth: new Date().toISOString().split('T')[0],
            weight_kg: '',
            color_markings: '',
        }]
    })

    const singleChildForm = useForm({
        species: 'goat',
        breed: '',
        sex: 'male',
        ear_tag: '',
        date_of_birth: new Date().toISOString().split('T')[0],
        weight_kg: '',
        color_markings: '',
        photos: [] as File[],
    }, {
        forceFormData: true,
    })

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files)
            setPhotos(files)
            singleChildForm.setData('photos', files)
            
            const previews = files.map(file => URL.createObjectURL(file))
            setPhotoPreviews(previews)
        }
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        if (e.dataTransfer.files) {
            const files = Array.from(e.dataTransfer.files)
            setPhotos(files)
            singleChildForm.setData('photos', files)
            
            const previews = files.map(file => URL.createObjectURL(file))
            setPhotoPreviews(previews)
        }
    }

    const removePhoto = (index: number) => {
        const newPhotos = photos.filter((_, i) => i !== index)
        const newPreviews = photoPreviews.filter((_, i) => i !== index)
        setPhotos(newPhotos)
        setPhotoPreviews(newPreviews)
        singleChildForm.setData('photos', newPhotos)
        
        URL.revokeObjectURL(photoPreviews[index])
    }

    const handleAddOffspring = () => {
        setData('offspring', [
            ...data.offspring,
            {
                species: 'goat',
                breed: '',
                sex: 'male',
                ear_tag: '',
                date_of_birth: new Date().toISOString().split('T')[0],
                weight_kg: '',
                color_markings: '',
            }
        ])
    }

    const handleRemoveOffspring = (index: number) => {
        setData('offspring', data.offspring.filter((_, i) => i !== index))
    }

    const handleOffspringChange = (index: number, field: string, value: any) => {
        const updated = [...data.offspring]
        updated[index] = { ...updated[index], [field]: value }
        setData('offspring', updated)
    }

    const handleCreateOffspring = () => {
        post(`/breeding/${event.id}/offspring`, {
            onSuccess: () => {
                showSuccessToast('Offspring created successfully.')
            },
            onError: () => {
                showErrorToast('Failed to create offspring.')
            }
        })
    }

    const handleCreateSingleOffspring = (e: React.FormEvent) => {
        e.preventDefault()
        singleChildForm.post(`/breeding/${event.id}/offspring/single`, {
            onSuccess: () => {
                setShowAddForm(false)
                singleChildForm.reset()
                setPhotos([])
                setPhotoPreviews([])
                photoPreviews.forEach(preview => URL.revokeObjectURL(preview))
                showSuccessToast('Child added successfully.')
                router.reload()
            },
            onError: () => {
                showErrorToast('Failed to add child.')
            }
        })
    }

    const handleDeleteClick = () => {
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = () => {
        setIsDeleting(true)
        router.delete(`/breeding/${event.id}`, {
            onSuccess: () => {
                showSuccessToast('Breeding event deleted successfully.')
                router.visit('/breeding')
            },
            onError: () => {
                showErrorToast('Failed to delete breeding event.')
                setIsDeleting(false)
            }
        })
    }

    const handleDeleteChildClick = (childId: number, e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setChildToDelete(childId)
        setDeleteChildDialogOpen(true)
    }

    const handleDeleteChildConfirm = () => {
        if (!childToDelete) return
        
        setIsDeletingChild(true)
        router.delete(`/animals/${childToDelete}`, {
            onSuccess: () => {
                showSuccessToast('Child deleted successfully.')
                setDeleteChildDialogOpen(false)
                setChildToDelete(null)
                router.reload()
            },
            onError: () => {
                showErrorToast('Failed to delete child.')
                setIsDeletingChild(false)
            }
        })
    }

    const editChildForm = useForm({
        species: '',
        breed: '',
        sex: '',
        ear_tag: '',
        date_of_birth: '',
        weight_kg: '',
        color_markings: '',
        photos: [] as File[],
    }, {
        forceFormData: true,
    })

    const handleEditChildClick = (child: Offspring['child'], e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setEditingChildId(child.id)
        editChildForm.setData({
            species: child.species || 'goat',
            breed: child.breed || '',
            sex: child.sex || 'male',
            ear_tag: child.ear_tag || '',
            date_of_birth: child.date_of_birth ? new Date(child.date_of_birth).toISOString().split('T')[0] : '',
            weight_kg: child.weight_kg?.toString() || '',
            color_markings: child.color_markings || '',
            photos: [],
        })
        setEditPhotos([])
        setEditPhotoPreviews([])
    }

    const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files)
            setEditPhotos(files)
            editChildForm.setData('photos', files)
            
            const previews = files.map(file => URL.createObjectURL(file))
            setEditPhotoPreviews(previews)
        }
    }

    const handleEditDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        if (e.dataTransfer.files) {
            const files = Array.from(e.dataTransfer.files)
            setEditPhotos(files)
            editChildForm.setData('photos', files)
            
            const previews = files.map(file => URL.createObjectURL(file))
            setEditPhotoPreviews(previews)
        }
    }

    const removeEditPhoto = (index: number) => {
        const newPhotos = editPhotos.filter((_, i) => i !== index)
        const newPreviews = editPhotoPreviews.filter((_, i) => i !== index)
        setEditPhotos(newPhotos)
        setEditPhotoPreviews(newPreviews)
        editChildForm.setData('photos', newPhotos)
        
        URL.revokeObjectURL(editPhotoPreviews[index])
    }

    const handleUpdateChild = (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingChildId || !event?.id) return

        // Ensure all form data is included
        editChildForm.transform((data) => {
            return {
                species: data.species,
                breed: data.breed,
                sex: data.sex,
                ear_tag: data.ear_tag || '',
                date_of_birth: data.date_of_birth || '',
                weight_kg: data.weight_kg || '',
                color_markings: data.color_markings || '',
                photos: editPhotos,
                _method: 'PUT',
            }
        })
        
        editChildForm.post(`/breeding/${event.id}/offspring/${editingChildId}`, {
            forceFormData: true,
            onSuccess: () => {
                setEditingChildId(null)
                editChildForm.reset()
                setEditPhotos([])
                setEditPhotoPreviews([])
                editPhotoPreviews.forEach(preview => URL.revokeObjectURL(preview))
                showSuccessToast('Child updated successfully.')
                router.reload()
            },
            onError: (errors) => {
                console.error('Update errors:', errors)
                showErrorToast('Failed to update child.')
            }
        })
    }

    return (
        <LivestockDashboardLayout breadcrumbs={breadcrumbs}>
            <Head title="Breeding Event Details - Livestock Management" />
            
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <Link href="/breeding" className="w-full sm:w-auto">
                        <Button variant="outline" className="w-full sm:w-auto border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Breeding Events
                    </Button>
                </Link>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Link href={`/breeding/${event.id}/edit`} className="w-full sm:w-auto">
                            <Button className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Breeding Event
                            </Button>
                        </Link>
                        <Button 
                            variant="outline"
                            onClick={handleDeleteClick}
                            className="w-full sm:w-auto border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                        </Button>
                    </div>
                </div>

                <div className="space-y-6">
                        {/* Breeding Information */}
                        <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader className="pb-4 border-b">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-gradient-to-r from-amber-600 to-orange-600 rounded">
                                        <Heart className="h-4 w-4 text-white" />
                                    </div>
                                    <CardTitle className="text-xl font-bold text-gray-900 dark:text-white pb-2">Breeding Information</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                                            <User className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Male (Sire)</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {event.male.breed}
                                                {event.male.ear_tag && (
                                                    <span className="text-amber-600 dark:text-amber-400 ml-1">
                                                        ({event.male.ear_tag})
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                                            <User className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Female (Dam)</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {event.female.breed}
                                                {event.female.ear_tag && (
                                                    <span className="text-amber-600 dark:text-amber-400 ml-1">
                                                        ({event.female.ear_tag})
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                                            <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div className="flex-1">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Breeding Date</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {format(new Date(event.breeding_date), 'MMM dd, yyyy')}
                                        </p>
                                    </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                                            <Tag className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div className="flex-1">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Method</p>
                                            <Badge 
                                                variant="outline"
                                                className="border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                                            >
                                                {event.breeding_method}
                                            </Badge>
                                        </div>
                                    </div>
                                    {event.expected_kidding_date && (
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                                                <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <div className="flex-1">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Expected Kidding</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                {format(new Date(event.expected_kidding_date), 'MMM dd, yyyy')}
                                            </p>
                                            </div>
                                        </div>
                                    )}
                                    {event.actual_kidding_date && (
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                                <Baby className="h-5 w-5 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div className="flex-1">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Actual Kidding</p>
                                                <p className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-600">
                                                {format(new Date(event.actual_kidding_date), 'MMM dd, yyyy')}
                                            </p>
                                            </div>
                                        </div>
                                    )}
                                    {event.stud_fee && (
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                                                <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <div className="flex-1">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Stud Fee</p>
                                                <p className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-600">
                                                ${event.stud_fee.toLocaleString()}
                                            </p>
                                            </div>
                                        </div>
                                    )}
                                    {event.number_of_kids && (
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                                                <Baby className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <div className="flex-1">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Number of Kids</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                {event.number_of_kids}
                                            </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {event.notes && (
                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                                                <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Notes</p>
                                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{event.notes}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Offspring */}
                        <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader className="pb-4 border-b">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-gradient-to-r from-amber-600 to-orange-600 rounded">
                                            <Baby className="h-4 w-4 text-white" />
                                        </div>
                                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white pb-2">Offspring</CardTitle>
                                    </div>
                                    <Button 
                                        onClick={() => setShowAddForm(!showAddForm)}
                                        className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        {showAddForm ? 'Cancel' : 'Add Child'}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {/* Add Child Form */}
                                {showAddForm && (
                                    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-amber-200 dark:border-amber-800">
                                        <form onSubmit={handleCreateSingleOffspring} className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor="species" className="text-sm font-medium">Species *</Label>
                                                    <Select
                                                        value={singleChildForm.data.species}
                                                        onValueChange={(value) => singleChildForm.setData('species', value)}
                                                        required
                                                    >
                                                        <SelectTrigger className="mt-2">
                                                            <SelectValue placeholder="Select Species" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="goat">Goat</SelectItem>
                                                            <SelectItem value="sheep">Sheep</SelectItem>
                                                            <SelectItem value="cow">Cow</SelectItem>
                                                            <SelectItem value="chicken">Chicken</SelectItem>
                                                            <SelectItem value="pig">Pig</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    {singleChildForm.errors.species && (
                                                        <p className="text-sm text-red-500 mt-1">{singleChildForm.errors.species}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label htmlFor="breed" className="text-sm font-medium">Breed *</Label>
                                                    <Input
                                                        id="breed"
                                                        value={singleChildForm.data.breed}
                                                        onChange={(e) => singleChildForm.setData('breed', e.target.value)}
                                                        className="mt-2"
                                                        required
                                                        placeholder="Enter breed"
                                                    />
                                                    {singleChildForm.errors.breed && (
                                                        <p className="text-sm text-red-500 mt-1">{singleChildForm.errors.breed}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label htmlFor="sex" className="text-sm font-medium">Sex *</Label>
                                                    <Select
                                                        value={singleChildForm.data.sex}
                                                        onValueChange={(value) => singleChildForm.setData('sex', value)}
                                                        required
                                                    >
                                                        <SelectTrigger className="mt-2">
                                                            <SelectValue placeholder="Select Sex" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="male">Male</SelectItem>
                                                            <SelectItem value="female">Female</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    {singleChildForm.errors.sex && (
                                                        <p className="text-sm text-red-500 mt-1">{singleChildForm.errors.sex}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label htmlFor="ear_tag" className="text-sm font-medium">Ear Tag</Label>
                                                    <Input
                                                        id="ear_tag"
                                                        value={singleChildForm.data.ear_tag}
                                                        onChange={(e) => singleChildForm.setData('ear_tag', e.target.value)}
                                                        className="mt-2"
                                                        placeholder="Optional"
                                                    />
                                                    {singleChildForm.errors.ear_tag && (
                                                        <p className="text-sm text-red-500 mt-1">{singleChildForm.errors.ear_tag}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label htmlFor="date_of_birth" className="text-sm font-medium">Date of Birth</Label>
                                                    <Input
                                                        id="date_of_birth"
                                                        type="date"
                                                        value={singleChildForm.data.date_of_birth}
                                                        onChange={(e) => singleChildForm.setData('date_of_birth', e.target.value)}
                                                        className="mt-2"
                                                    />
                                                    {singleChildForm.errors.date_of_birth && (
                                                        <p className="text-sm text-red-500 mt-1">{singleChildForm.errors.date_of_birth}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label htmlFor="weight_kg" className="text-sm font-medium">Weight (kg)</Label>
                                                    <Input
                                                        id="weight_kg"
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={singleChildForm.data.weight_kg}
                                                        onChange={(e) => singleChildForm.setData('weight_kg', e.target.value)}
                                                        className="mt-2"
                                                        placeholder="0.00"
                                                    />
                                                    {singleChildForm.errors.weight_kg && (
                                                        <p className="text-sm text-red-500 mt-1">{singleChildForm.errors.weight_kg}</p>
                                                    )}
                                                </div>
                                                <div className="md:col-span-2">
                                                    <Label htmlFor="color_markings" className="text-sm font-medium">Color/Markings</Label>
                                                    <Input
                                                        id="color_markings"
                                                        value={singleChildForm.data.color_markings}
                                                        onChange={(e) => singleChildForm.setData('color_markings', e.target.value)}
                                                        className="mt-2"
                                                        placeholder="Optional"
                                                    />
                                                    {singleChildForm.errors.color_markings && (
                                                        <p className="text-sm text-red-500 mt-1">{singleChildForm.errors.color_markings}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Photo Upload */}
                                            <div>
                                                <Label className="text-sm font-medium mb-2 block">Photos</Label>
                                                <div
                                                    onDrop={handleDrop}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-lg p-6 cursor-pointer hover:border-amber-400 dark:hover:border-amber-600 transition-colors bg-amber-50/50 dark:bg-amber-950/20 min-h-[200px]"
                                                >
                                                    {photoPreviews.length > 0 ? (
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                            {photoPreviews.map((preview, index) => (
                                                                <div key={index} className="relative group">
                                                                    <img
                                                                        src={preview}
                                                                        alt={`Preview ${index + 1}`}
                                                                        className="w-full h-32 object-cover rounded-lg border border-amber-200 dark:border-amber-800"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            removePhoto(index)
                                                                        }}
                                                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            <div className="relative border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-lg flex items-center justify-center hover:border-amber-400 dark:hover:border-amber-600 transition-colors bg-amber-50/30 dark:bg-amber-950/10">
                                                                <div className="text-center p-4">
                                                                    <Upload className="h-6 w-6 mx-auto text-amber-600 dark:text-amber-400 mb-1" />
                                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                                        Add more
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center">
                                                            <Upload className="h-8 w-8 mx-auto text-amber-600 dark:text-amber-400 mb-2" />
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                Click to upload or drag and drop
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                                PNG, JPG up to 5MB
                                                            </p>
                                                        </div>
                                                    )}
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        multiple
                                                        accept="image/*"
                                                        onChange={handlePhotoChange}
                                                        className="hidden"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setShowAddForm(false)
                                                        singleChildForm.reset()
                                                        setPhotos([])
                                                        setPhotoPreviews([])
                                                        photoPreviews.forEach(preview => URL.revokeObjectURL(preview))
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    disabled={singleChildForm.processing}
                                                    className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                                                >
                                                    <Save className="h-4 w-4 mr-2" />
                                                    {singleChildForm.processing ? 'Adding...' : 'Add Child'}
                                                </Button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {event.offspring.length > 0 ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                        {event.offspring.map((off) => (
                                                <div
                                                    key={off.id}
                                                    className={`group relative ${editingChildId === off.child.id ? 'col-span-full' : ''}`}
                                                >
                                                    {editingChildId === off.child.id ? (
                                                        // Edit Form
                                                        <div className="border border-amber-200 dark:border-amber-800/50 rounded-lg p-6 bg-gray-50 dark:bg-gray-900/50 w-full">
                                                            <form onSubmit={handleUpdateChild} className="space-y-4">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div>
                                                                        <Label htmlFor={`edit-species-${off.child.id}`} className="text-sm font-medium">Species *</Label>
                                                                        <Select
                                                                            value={editChildForm.data.species}
                                                                            onValueChange={(value) => editChildForm.setData('species', value)}
                                                                            required
                                                                        >
                                                                            <SelectTrigger className="mt-2">
                                                                                <SelectValue placeholder="Select Species" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="goat">Goat</SelectItem>
                                                                                <SelectItem value="sheep">Sheep</SelectItem>
                                                                                <SelectItem value="cow">Cow</SelectItem>
                                                                                <SelectItem value="chicken">Chicken</SelectItem>
                                                                                <SelectItem value="pig">Pig</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                        {editChildForm.errors.species && (
                                                                            <p className="text-sm text-red-500 mt-1">{editChildForm.errors.species}</p>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <Label htmlFor={`edit-breed-${off.child.id}`} className="text-sm font-medium">Breed *</Label>
                                                                        <Input
                                                                            id={`edit-breed-${off.child.id}`}
                                                                            value={editChildForm.data.breed}
                                                                            onChange={(e) => editChildForm.setData('breed', e.target.value)}
                                                                            className="mt-2"
                                                                            required
                                                                            placeholder="Enter breed"
                                                                        />
                                                                        {editChildForm.errors.breed && (
                                                                            <p className="text-sm text-red-500 mt-1">{editChildForm.errors.breed}</p>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <Label htmlFor={`edit-sex-${off.child.id}`} className="text-sm font-medium">Sex *</Label>
                                                                        <Select
                                                                            value={editChildForm.data.sex}
                                                                            onValueChange={(value) => editChildForm.setData('sex', value)}
                                                                            required
                                                                        >
                                                                            <SelectTrigger className="mt-2">
                                                                                <SelectValue placeholder="Select Sex" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="male">Male</SelectItem>
                                                                                <SelectItem value="female">Female</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                        {editChildForm.errors.sex && (
                                                                            <p className="text-sm text-red-500 mt-1">{editChildForm.errors.sex}</p>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <Label htmlFor={`edit-ear_tag-${off.child.id}`} className="text-sm font-medium">Ear Tag</Label>
                                                                        <Input
                                                                            id={`edit-ear_tag-${off.child.id}`}
                                                                            value={editChildForm.data.ear_tag}
                                                                            onChange={(e) => editChildForm.setData('ear_tag', e.target.value)}
                                                                            className="mt-2"
                                                                            placeholder="Optional"
                                                                        />
                                                                        {editChildForm.errors.ear_tag && (
                                                                            <p className="text-sm text-red-500 mt-1">{editChildForm.errors.ear_tag}</p>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <Label htmlFor={`edit-date_of_birth-${off.child.id}`} className="text-sm font-medium">Date of Birth</Label>
                                                                        <Input
                                                                            id={`edit-date_of_birth-${off.child.id}`}
                                                                            type="date"
                                                                            value={editChildForm.data.date_of_birth}
                                                                            onChange={(e) => editChildForm.setData('date_of_birth', e.target.value)}
                                                                            className="mt-2"
                                                                        />
                                                                        {editChildForm.errors.date_of_birth && (
                                                                            <p className="text-sm text-red-500 mt-1">{editChildForm.errors.date_of_birth}</p>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <Label htmlFor={`edit-weight_kg-${off.child.id}`} className="text-sm font-medium">Weight (kg)</Label>
                                                                        <Input
                                                                            id={`edit-weight_kg-${off.child.id}`}
                                                                            type="number"
                                                                            step="0.01"
                                                                            min="0"
                                                                            value={editChildForm.data.weight_kg}
                                                                            onChange={(e) => editChildForm.setData('weight_kg', e.target.value)}
                                                                            className="mt-2"
                                                                            placeholder="0.00"
                                                                        />
                                                                        {editChildForm.errors.weight_kg && (
                                                                            <p className="text-sm text-red-500 mt-1">{editChildForm.errors.weight_kg}</p>
                                                                        )}
                                                                    </div>
                                                                    <div className="md:col-span-2">
                                                                        <Label htmlFor={`edit-color_markings-${off.child.id}`} className="text-sm font-medium">Color/Markings</Label>
                                                                        <Input
                                                                            id={`edit-color_markings-${off.child.id}`}
                                                                            value={editChildForm.data.color_markings}
                                                                            onChange={(e) => editChildForm.setData('color_markings', e.target.value)}
                                                                            className="mt-2"
                                                                            placeholder="Optional"
                                                                        />
                                                                        {editChildForm.errors.color_markings && (
                                                                            <p className="text-sm text-red-500 mt-1">{editChildForm.errors.color_markings}</p>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Photo Upload */}
                                                                <div>
                                                                    <Label className="text-sm font-medium mb-2 block">Photos</Label>
                                                                    <div
                                                                        onDrop={handleEditDrop}
                                                                        onDragOver={(e) => e.preventDefault()}
                                                                        onClick={() => editFileInputRef.current?.click()}
                                                                        className="border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-lg p-6 cursor-pointer hover:border-amber-400 dark:hover:border-amber-600 transition-colors bg-amber-50/50 dark:bg-amber-950/20 min-h-[200px]"
                                                                    >
                                                                        {(off.child.photos && off.child.photos.length > 0) || editPhotoPreviews.length > 0 ? (
                                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                                {/* Existing Photos */}
                                                                                {off.child.photos && off.child.photos.map((photo) => (
                                                                                    <div key={photo.id} className="relative group">
                                                                                        <img
                                                                                            src={photo.url}
                                                                                            alt="Existing photo"
                                                                                            className="w-full h-32 object-cover rounded-lg border border-amber-200 dark:border-amber-800"
                                                                                        />
                                                                                    </div>
                                                                                ))}
                                                                                {/* New Photo Previews */}
                                                                                {editPhotoPreviews.map((preview, index) => (
                                                                                    <div key={`new-${index}`} className="relative group">
                                                                                        <img
                                                                                            src={preview}
                                                                                            alt={`Preview ${index + 1}`}
                                                                                            className="w-full h-32 object-cover rounded-lg border border-amber-200 dark:border-amber-800"
                                                                                        />
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation()
                                                                                                removeEditPhoto(index)
                                                                                            }}
                                                                                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                        >
                                                                                            <X className="h-4 w-4" />
                                                                                        </button>
                                                                                    </div>
                                                                                ))}
                                                                                <div className="relative border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-lg flex items-center justify-center hover:border-amber-400 dark:hover:border-amber-600 transition-colors bg-amber-50/30 dark:bg-amber-950/10">
                                                                                    <div className="text-center p-4">
                                                                                        <Upload className="h-6 w-6 mx-auto text-amber-600 dark:text-amber-400 mb-1" />
                                                                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                                                                            Add more
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="text-center">
                                                                                <Upload className="h-8 w-8 mx-auto text-amber-600 dark:text-amber-400 mb-2" />
                                                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                                    Click to upload or drag and drop
                                                                                </p>
                                                                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                                                    PNG, JPG up to 5MB
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                        <input
                                                                            ref={editFileInputRef}
                                                                            type="file"
                                                                            multiple
                                                                            accept="image/*"
                                                                            onChange={handleEditPhotoChange}
                                                                            className="hidden"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        onClick={() => {
                                                                            setEditingChildId(null)
                                                                            editChildForm.reset()
                                                                            setEditPhotos([])
                                                                            setEditPhotoPreviews([])
                                                                            editPhotoPreviews.forEach(preview => URL.revokeObjectURL(preview))
                                                                        }}
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                    <Button
                                                                        type="submit"
                                                                        disabled={editChildForm.processing}
                                                                        className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                                                                    >
                                                                        <Save className="h-4 w-4 mr-2" />
                                                                        {editChildForm.processing ? 'Updating...' : 'Update Child'}
                                                                    </Button>
                                                                </div>
                                                            </form>
                                                        </div>
                                                    ) : (
                                                        // Display Card
                                                        <>
                                                            <Link
                                                                href={`/animals/${off.child.id}`}
                                                                className="block"
                                                            >
                                                                <div className="border border-amber-200 dark:border-amber-800/50 rounded-lg overflow-hidden hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md transition-all">
                                                                    {/* Photo Preview */}
                                                                    {off.child.photos && off.child.photos.length > 0 ? (
                                                                        <div className="relative w-full aspect-[3/2] overflow-hidden bg-gray-100 dark:bg-gray-800">
                                                                            <img
                                                                                src={off.child.photos[0].url}
                                                                                alt={off.child.breed}
                                                                                className="w-full h-full object-cover"
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="relative w-full aspect-[3/2] overflow-hidden bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center">
                                                                            <Baby className="h-8 w-8 text-amber-400 dark:text-amber-600" />
                                                                        </div>
                                                                    )}
                                                                    <div className="p-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="p-1.5 bg-amber-50 dark:bg-amber-950/20 rounded group-hover:bg-amber-100 dark:group-hover:bg-amber-950/30 transition-colors">
                                                                                <Baby className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                                                                                    {off.child.breed}
                                                                                </p>
                                                                                <div className="flex items-center gap-1.5 mt-1">
                                                                                    <Badge
                                                                                        variant="outline"
                                                                                        className="text-xs px-1.5 py-0.5 border-gray-200 dark:border-gray-700"
                                                                                    >
                                                                                        {off.child.sex}
                                                                                    </Badge>
                                                                                    {off.child.ear_tag && (
                                                                                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                                            {off.child.ear_tag}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                </Link>
                                                            <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={(e) => handleEditChildClick(off.child, e)}
                                                                    className="h-6 w-6 p-0 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                                                >
                                                                    <Edit className="h-3 w-3" />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={(e) => handleDeleteChildClick(off.child.id, e)}
                                                                    className="h-6 w-6 p-0 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </>
                                                    )}
                                            </div>
                                        ))}
                                        </div>
                                    </div>
                                ) : !event.actual_kidding_date ? (
                                    <div className="space-y-4">
                                        <p className="text-gray-600 dark:text-gray-400">
                                            Record offspring when they are born.
                                        </p>
                                        {data.offspring.map((offspring, index) => (
                                            <div 
                                                key={index} 
                                                className="border border-amber-200 dark:border-amber-800/50 rounded-lg p-4 space-y-4 bg-amber-50/30 dark:bg-amber-950/10"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Baby className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                                        <h4 className="font-semibold text-gray-900 dark:text-white">Kid #{index + 1}</h4>
                                                    </div>
                                                    {data.offspring.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveOffspring(index)}
                                                            className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Species</label>
                                                        <select
                                                            value={offspring.species}
                                                            onChange={(e) => handleOffspringChange(index, 'species', e.target.value)}
                                                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                                        >
                                                            <option value="goat">Goat</option>
                                                            <option value="sheep">Sheep</option>
                                                            <option value="cow">Cow</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Breed</label>
                                                        <input
                                                            type="text"
                                                            value={offspring.breed}
                                                            onChange={(e) => handleOffspringChange(index, 'breed', e.target.value)}
                                                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                                            required
                                                            placeholder="Enter breed"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Sex</label>
                                                        <select
                                                            value={offspring.sex}
                                                            onChange={(e) => handleOffspringChange(index, 'sex', e.target.value)}
                                                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                                        >
                                                            <option value="male">Male</option>
                                                            <option value="female">Female</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Ear Tag</label>
                                                        <input
                                                            type="text"
                                                            value={offspring.ear_tag}
                                                            onChange={(e) => handleOffspringChange(index, 'ear_tag', e.target.value)}
                                                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                                            placeholder="Optional"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Date of Birth</label>
                                                        <input
                                                            type="date"
                                                            value={offspring.date_of_birth}
                                                            onChange={(e) => handleOffspringChange(index, 'date_of_birth', e.target.value)}
                                                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Weight (kg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={offspring.weight_kg}
                                                            onChange={(e) => handleOffspringChange(index, 'weight_kg', e.target.value)}
                                                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleAddOffspring}
                                                className="w-full sm:w-auto border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add Another Kid
                                            </Button>
                                            <Button
                                                onClick={handleCreateOffspring}
                                                disabled={processing}
                                                className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                                            >
                                                {processing ? 'Creating...' : 'Create Offspring'}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Baby className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-600 dark:text-gray-400">No offspring recorded yet.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                </div>
            </div>

            {/* Delete Child Confirmation Dialog */}
            <Dialog open={deleteChildDialogOpen} onOpenChange={setDeleteChildDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <Trash2 className="h-5 w-5" />
                            Delete Child
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Are you sure you want to delete this child? This action cannot be undone and will permanently remove the animal record.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setDeleteChildDialogOpen(false)
                                setChildToDelete(null)
                            }}
                            className="w-full sm:w-auto"
                            disabled={isDeletingChild}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleDeleteChildConfirm}
                            disabled={isDeletingChild}
                            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isDeletingChild ? 'Deleting...' : 'Delete Child'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <Trash2 className="h-5 w-5" />
                            Delete Breeding Event
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Are you sure you want to delete this breeding event? This action cannot be undone.
                            {event.offspring.length > 0 && (
                                <span className="block mt-2 text-amber-600 dark:text-amber-400 font-medium">
                                    ⚠️ Warning: This breeding event has {event.offspring.length} recorded offspring. The breeding event will be deleted, but the offspring records will remain.
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                            className="w-full sm:w-auto"
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete Breeding Event'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </LivestockDashboardLayout>
    )
}

