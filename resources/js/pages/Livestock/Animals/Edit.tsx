"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Link, useForm, Head, usePage } from "@inertiajs/react"
import { useState, useRef } from "react"
import { showSuccessToast, showErrorToast } from '@/lib/toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
    Edit, 
    Heart, 
    Tag, 
    Calendar, 
    MapPin, 
    DollarSign, 
    FileText,
    CheckCircle,
    ArrowLeft,
    Image as ImageIcon,
    Upload,
    Trash2
} from "lucide-react"

interface AnimalPhoto {
    id: number
    url: string
    is_primary: boolean
    display_order: number
}

interface Animal {
    id: number
    species: string
    breed: string
    sex: string
    ear_tag: string | null
    original_ear_tag: string | null
    livestock_user_id: number
    current_owner_livestock_user_id: number
    date_of_birth: string | null
    age_months: number | null
    weight_kg: number | null
    color_markings: string | null
    location: string | null
    health_status: string
    fertility_status: string
    original_purchase_price: number | null
    current_market_value: number | null
    status: string
    notes: string | null
    photos?: AnimalPhoto[]
}

interface EditProps {
    animal: Animal
}

export default function EditAnimal({ animal }: EditProps) {
    const [newPhotos, setNewPhotos] = useState<File[]>([])
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
    const [photosToDelete, setPhotosToDelete] = useState<number[]>([])
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    // Format date for input (YYYY-MM-DD)
    const formatDateForInput = (dateString: string | null): string => {
        if (!dateString) return ''
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return ''
        return date.toISOString().split('T')[0]
    }

    const form = useForm({
        species: animal.species || 'goat',
        breed: animal.breed || '',
        sex: animal.sex || 'male',
        ear_tag: animal.ear_tag || '',
        date_of_birth: formatDateForInput(animal.date_of_birth),
        age_months: animal.age_months?.toString() || '',
        weight_kg: animal.weight_kg?.toString() || '',
        color_markings: animal.color_markings || '',
        location: animal.location || '',
        health_status: animal.health_status || 'good',
        fertility_status: animal.fertility_status || 'unknown',
        original_purchase_price: animal.original_purchase_price?.toString() || '',
        current_market_value: animal.current_market_value?.toString() || '',
        status: animal.status || 'available',
        notes: animal.notes || '',
        photos: [] as File[],
        photos_to_delete: [] as number[],
    })

    // Transform data to add _method for Laravel method spoofing
    form.transform((data) => ({
        ...data,
        _method: 'PUT',
    }))

    const { data, setData, post, processing, errors } = form

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files)
            const updatedPhotos = [...newPhotos, ...files]
            setNewPhotos(updatedPhotos)
            setData('photos', updatedPhotos)
            
            // Create previews
            const newPreviews = files.map(file => URL.createObjectURL(file))
            setPhotoPreviews([...photoPreviews, ...newPreviews])
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        
        if (e.dataTransfer.files) {
            const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'))
            const updatedPhotos = [...newPhotos, ...files]
            setNewPhotos(updatedPhotos)
            setData('photos', updatedPhotos)
            
            // Create previews
            const newPreviews = files.map(file => URL.createObjectURL(file))
            setPhotoPreviews([...photoPreviews, ...newPreviews])
        }
    }

    const removeNewPhoto = (index: number) => {
        const updatedPhotos = newPhotos.filter((_, i) => i !== index)
        const updatedPreviews = photoPreviews.filter((_, i) => i !== index)
        setNewPhotos(updatedPhotos)
        setPhotoPreviews(updatedPreviews)
        setData('photos', updatedPhotos)
        
        // Revoke object URL to free memory
        URL.revokeObjectURL(photoPreviews[index])
    }

    const markPhotoForDeletion = (photoId: number) => {
        const updated = [...photosToDelete, photoId]
        setPhotosToDelete(updated)
        setData('photos_to_delete', updated)
    }

    const existingPhotos = animal.photos?.filter(photo => !photosToDelete.includes(photo.id)) || []

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // Use post with _method=PUT for file uploads (Laravel method spoofing)
        post(`/animals/${animal.id}`, {
            forceFormData: true,
            onSuccess: () => {
                showSuccessToast('Animal updated successfully.')
            },
            onError: () => {
                showErrorToast('Failed to update animal. Please check the form.')
            }
        })
    }

    return (
        <LivestockDashboardLayout>
            <Head title={`Edit ${animal.breed} - Livestock Management`} />
            
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <Link href={`/animals/${animal.id}`}>
                            <Button variant="ghost" size="sm" className="border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Animal
                            </Button>
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                            <Edit className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Animal</h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                                Update animal information and details
                            </p>
                        </div>
                    </div>
                </div>

                {/* Basic Information */}
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardHeader className="border-b border-amber-200 dark:border-amber-800/50 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                    <Heart className="h-5 w-5 text-white" />
                                </div>
                                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Basic Information</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="species" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                        <Tag className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        Species *
                                    </Label>
                                    <Select value={data.species} onValueChange={(value) => setData('species', value)}>
                                        <SelectTrigger className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="goat">Goat</SelectItem>
                                            <SelectItem value="sheep">Sheep</SelectItem>
                                            <SelectItem value="cow">Cow</SelectItem>
                                            <SelectItem value="chicken">Chicken</SelectItem>
                                            <SelectItem value="pig">Pig</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.species && (
                                        <p className="text-sm text-red-500 mt-1">{errors.species}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="breed" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                        <Tag className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        Breed *
                                    </Label>
                                    <Input
                                        id="breed"
                                        value={data.breed}
                                        onChange={(e) => setData('breed', e.target.value)}
                                        className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500 ${errors.breed ? 'border-red-500 dark:border-red-500' : ''}`}
                                        required
                                    />
                                    {errors.breed && (
                                        <p className="text-sm text-red-500 mt-1">{errors.breed}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="sex" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                        <Heart className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        Sex *
                                    </Label>
                                    <Select value={data.sex} onValueChange={(value) => setData('sex', value)}>
                                        <SelectTrigger className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.sex && (
                                        <p className="text-sm text-red-500 mt-1">{errors.sex}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="ear_tag" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                        <Tag className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        Ear Tag
                                    </Label>
                                    {animal.original_ear_tag && animal.original_ear_tag !== animal.ear_tag && (
                                        <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                                <span className="font-medium">Original Seller Tag:</span> {animal.original_ear_tag}
                                            </p>
                                        </div>
                                    )}
                                    <Input
                                        id="ear_tag"
                                        value={data.ear_tag}
                                        onChange={(e) => setData('ear_tag', e.target.value)}
                                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                    />
                                    {errors.ear_tag && (
                                        <p className="text-sm text-red-500 mt-1">{errors.ear_tag}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="date_of_birth" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                        <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        Date of Birth
                                    </Label>
                                    <Input
                                        id="date_of_birth"
                                        type="date"
                                        value={data.date_of_birth || ''}
                                        onChange={(e) => setData('date_of_birth', e.target.value)}
                                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                    />
                                    {errors.date_of_birth && (
                                        <p className="text-sm text-red-500 mt-1">{errors.date_of_birth}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="age_months" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                        <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        Age (Months)
                                    </Label>
                                    <Input
                                        id="age_months"
                                        type="number"
                                        min="0"
                                        value={data.age_months}
                                        onChange={(e) => setData('age_months', e.target.value)}
                                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                    />
                                    {errors.age_months && (
                                        <p className="text-sm text-red-500 mt-1">{errors.age_months}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="weight_kg" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                        <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        Weight (kg)
                                    </Label>
                                    <Input
                                        id="weight_kg"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.weight_kg}
                                        onChange={(e) => setData('weight_kg', e.target.value)}
                                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                    />
                                    {errors.weight_kg && (
                                        <p className="text-sm text-red-500 mt-1">{errors.weight_kg}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="color_markings" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                        <Tag className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        Color/Markings
                                    </Label>
                                    <Input
                                        id="color_markings"
                                        value={data.color_markings}
                                        onChange={(e) => setData('color_markings', e.target.value)}
                                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                    />
                                    {errors.color_markings && (
                                        <p className="text-sm text-red-500 mt-1">{errors.color_markings}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="location" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                        <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        Location
                                    </Label>
                                    <Input
                                        id="location"
                                        value={data.location}
                                        onChange={(e) => setData('location', e.target.value)}
                                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                    />
                                    {errors.location && (
                                        <p className="text-sm text-red-500 mt-1">{errors.location}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Health & Status */}
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardHeader className="border-b border-amber-200 dark:border-amber-800/50 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                    <CheckCircle className="h-5 w-5 text-white" />
                                </div>
                                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Health & Status</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="health_status" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                        <CheckCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        Health Status *
                                    </Label>
                                    <Select value={data.health_status} onValueChange={(value) => setData('health_status', value)}>
                                        <SelectTrigger className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="excellent">Excellent</SelectItem>
                                            <SelectItem value="good">Good</SelectItem>
                                            <SelectItem value="fair">Fair</SelectItem>
                                            <SelectItem value="poor">Poor</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.health_status && (
                                        <p className="text-sm text-red-500 mt-1">{errors.health_status}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="fertility_status" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                        <Heart className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        Fertility Status *
                                    </Label>
                                    <Select value={data.fertility_status} onValueChange={(value) => setData('fertility_status', value)}>
                                        <SelectTrigger className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fertile">Fertile</SelectItem>
                                            <SelectItem value="infertile">Infertile</SelectItem>
                                            <SelectItem value="unknown">Unknown</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.fertility_status && (
                                        <p className="text-sm text-red-500 mt-1">{errors.fertility_status}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="status" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                        <CheckCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        Status *
                                    </Label>
                                    <Select value={data.status} onValueChange={(value) => setData('status', value)}>
                                        <SelectTrigger className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="available">Available</SelectItem>
                                            <SelectItem value="sold">Sold</SelectItem>
                                            <SelectItem value="off_farm">Off Farm</SelectItem>
                                            <SelectItem value="deceased">Deceased</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.status && (
                                        <p className="text-sm text-red-500 mt-1">{errors.status}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Financial Information */}
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardHeader className="border-b border-amber-200 dark:border-amber-800/50 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                    <DollarSign className="h-5 w-5 text-white" />
                                </div>
                                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Financial Information</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="original_purchase_price" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                        <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        Original Purchase Price
                                    </Label>
                                    <Input
                                        id="original_purchase_price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.original_purchase_price}
                                        onChange={(e) => setData('original_purchase_price', e.target.value)}
                                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                        placeholder="0.00"
                                    />
                                    {errors.original_purchase_price && (
                                        <p className="text-sm text-red-500 mt-1">{errors.original_purchase_price}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="current_market_value" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                        <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        Current Market Value
                                    </Label>
                                    <Input
                                        id="current_market_value"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.current_market_value}
                                        onChange={(e) => setData('current_market_value', e.target.value)}
                                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                        placeholder="0.00"
                                    />
                                    {errors.current_market_value && (
                                        <p className="text-sm text-red-500 mt-1">{errors.current_market_value}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Additional Information */}
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardHeader className="border-b border-amber-200 dark:border-amber-800/50 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                    <FileText className="h-5 w-5 text-white" />
                                </div>
                                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Additional Information</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div>
                                <Label htmlFor="notes" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                    <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    Notes
                                </Label>
                                <Textarea
                                    id="notes"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    rows={4}
                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                    placeholder="Add any additional notes about this animal..."
                                />
                                {errors.notes && (
                                    <p className="text-sm text-red-500 mt-1">{errors.notes}</p>
                                )}
                            </div>

                            <div>
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                                    <ImageIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    Photos
                                </Label>
                                
                                {/* Drag and Drop Area */}
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={`relative border-2 border-dashed rounded-lg transition-all ${
                                        isDragging
                                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
                                            : 'border-amber-200 dark:border-amber-800/50 bg-gray-50 dark:bg-gray-900/50 hover:border-amber-300 dark:hover:border-amber-700'
                                    } ${(existingPhotos.length > 0 || photoPreviews.length > 0) ? 'p-4' : 'p-8'}`}
                                >
                                    <input
                                        id="photos"
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        className="hidden"
                                        ref={fileInputRef}
                                    />
                                    
                                    {(existingPhotos.length > 0 || photoPreviews.length > 0) ? (
                                        <div className="space-y-4">
                                            {/* All Photos Grid - Existing + New */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {/* Existing Photos */}
                                                {existingPhotos.map((photo) => (
                                                    <div
                                                        key={photo.id}
                                                        className="relative group aspect-square rounded-lg overflow-hidden border-2 border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800"
                                                    >
                                                        <img
                                                            src={photo.url}
                                                            alt={`Animal photo ${photo.id}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        {photo.is_primary && (
                                                            <div className="absolute top-2 left-2 px-2 py-1 bg-amber-600 text-white text-xs rounded">
                                                                Primary
                                                            </div>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => markPhotoForDeletion(photo.id)}
                                                            className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                            title="Remove photo"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                
                                                {/* New Photo Previews */}
                                                {photoPreviews.map((preview, index) => (
                                                    <div
                                                        key={`new-${index}`}
                                                        className="relative group aspect-square rounded-lg overflow-hidden border-2 border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800"
                                                    >
                                                        <img
                                                            src={preview}
                                                            alt={`Preview ${index + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeNewPhoto(index)}
                                                            className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                            title="Remove photo"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <p className="truncate">{newPhotos[index]?.name || `Photo ${index + 1}`}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            {/* Add More Button */}
                                            <div className="flex items-center justify-center pt-2 border-t border-amber-200 dark:border-amber-800/50">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                                >
                                                    <Upload className="h-4 w-4 mr-2" />
                                                    Add More Photos
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-4 text-center">
                                            <div className={`p-4 rounded-full ${
                                                isDragging
                                                    ? 'bg-amber-100 dark:bg-amber-900/30'
                                                    : 'bg-amber-50 dark:bg-amber-950/20'
                                            }`}>
                                                <Upload className={`h-8 w-8 ${
                                                    isDragging
                                                        ? 'text-amber-600 dark:text-amber-400'
                                                        : 'text-amber-500 dark:text-amber-500'
                                                }`} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {isDragging ? 'Drop images here' : 'Drag and drop images here'}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    or click to browse
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                            >
                                                <Upload className="h-4 w-4 mr-2" />
                                                Select Photos
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Link href={`/animals/${animal.id}`}>
                        <Button type="button" variant="outline" className="border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20">
                            Cancel
                        </Button>
                    </Link>
                    <Button 
                        type="submit" 
                        disabled={processing}
                        className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30"
                    >
                        <Edit className="h-4 w-4 mr-2" />
                        {processing ? 'Updating...' : 'Update Animal'}
                    </Button>
                </div>
            </form>
        </LivestockDashboardLayout>
    )
}

