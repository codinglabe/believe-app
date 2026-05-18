"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Link, useForm, Head, router } from "@inertiajs/react"
import { useState, useRef } from "react"
import { showSuccessToast, showErrorToast } from '@/lib/toast'
import { 
    PlusCircle, 
    Tag, 
    Calendar, 
    Scale, 
    Palette, 
    MapPin, 
    Heart, 
    Baby, 
    DollarSign, 
    FileText, 
    Image as ImageIcon,
    Upload,
    X,
    Trash2,
    Save
} from "lucide-react"
import type { BreadcrumbItem } from "@/types"

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Livestock", href: "#" },
    { title: "Animals", href: route('animals.index') },
    { title: "Add Animal", href: route('animals.create') },
]

export default function CreateAnimal() {
    const [photos, setPhotos] = useState<File[]>([])
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    
    const { data, setData, post, processing, errors } = useForm({
        species: 'goat',
        breed: '',
        sex: 'male',
        ear_tag: '',
        date_of_birth: '',
        age_months: '',
        weight_kg: '',
        color_markings: '',
        location: '',
        health_status: 'good',
        fertility_status: 'unknown',
        original_purchase_price: '',
        current_market_value: '',
        notes: '',
        photos: [] as File[],
    })

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files)
            setPhotos(files)
            setData('photos', files)
            
            // Create previews
            const previews = files.map(file => URL.createObjectURL(file))
            setPhotoPreviews(previews)
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
            setPhotos(files)
            setData('photos', files)
            
            // Create previews
            const previews = files.map(file => URL.createObjectURL(file))
            setPhotoPreviews(previews)
        }
    }

    const removePhoto = (index: number) => {
        const newPhotos = photos.filter((_, i) => i !== index)
        const newPreviews = photoPreviews.filter((_, i) => i !== index)
        setPhotos(newPhotos)
        setPhotoPreviews(newPreviews)
        setData('photos', newPhotos)
        
        // Revoke object URL to free memory
        URL.revokeObjectURL(photoPreviews[index])
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        post(route('animals.store'), {
            forceFormData: true,
            onSuccess: () => {
                showSuccessToast('Animal added successfully.')
            },
            onError: () => {
                showErrorToast('Failed to add animal. Please check the form.')
            }
        })
    }

    return (
        <LivestockDashboardLayout>
            <Head title="Add Animal - Livestock Management" />
            
            <div className="w-full">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <PlusCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                        Add New Animal
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Register a new animal to your livestock inventory
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information Section */}
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardHeader className="border-b border-amber-200 dark:border-amber-800/50 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                    <Tag className="h-5 w-5 text-white" />
                                </div>
                                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Basic Information</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="species" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Tag className="h-4 w-4" />
                                        Species *
                                    </Label>
                                    <select
                                        id="species"
                                        value={data.species}
                                        onChange={(e) => setData('species', e.target.value)}
                                        className="w-full mt-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                        required
                                    >
                                        <option value="goat">Goat</option>
                                        <option value="sheep">Sheep</option>
                                        <option value="cow">Cow</option>
                                        <option value="chicken">Chicken</option>
                                        <option value="pig">Pig</option>
                                    </select>
                                    {errors.species && (
                                        <p className="text-sm text-red-500 mt-1">{errors.species}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="breed" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Tag className="h-4 w-4" />
                                        Breed *
                                    </Label>
                                    <Input
                                        id="breed"
                                        value={data.breed}
                                        onChange={(e) => setData('breed', e.target.value)}
                                        className={`mt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500 ${errors.breed ? 'border-red-500 dark:border-red-500' : ''}`}
                                        required
                                    />
                                    {errors.breed && (
                                        <p className="text-sm text-red-500 mt-1">{errors.breed}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="sex" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Baby className="h-4 w-4" />
                                        Sex *
                                    </Label>
                                    <select
                                        id="sex"
                                        value={data.sex}
                                        onChange={(e) => setData('sex', e.target.value)}
                                        className="w-full mt-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                        required
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                    {errors.sex && (
                                        <p className="text-sm text-red-500 mt-1">{errors.sex}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="ear_tag" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Tag className="h-4 w-4" />
                                        Ear Tag
                                    </Label>
                                    <Input
                                        id="ear_tag"
                                        value={data.ear_tag}
                                        onChange={(e) => setData('ear_tag', e.target.value)}
                                        className={`mt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500 ${errors.ear_tag ? 'border-red-500 dark:border-red-500' : ''}`}
                                    />
                                    {errors.ear_tag && (
                                        <p className="text-sm text-red-500 mt-1">{errors.ear_tag}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="date_of_birth" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Date of Birth
                                    </Label>
                                    <Input
                                        id="date_of_birth"
                                        type="date"
                                        value={data.date_of_birth}
                                        onChange={(e) => setData('date_of_birth', e.target.value)}
                                        className="mt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="age_months" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Age (Months)
                                    </Label>
                                    <Input
                                        id="age_months"
                                        type="number"
                                        min="0"
                                        value={data.age_months}
                                        onChange={(e) => setData('age_months', e.target.value)}
                                        className="mt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="weight_kg" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Scale className="h-4 w-4" />
                                        Weight (kg)
                                    </Label>
                                    <Input
                                        id="weight_kg"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.weight_kg}
                                        onChange={(e) => setData('weight_kg', e.target.value)}
                                        className="mt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="color_markings" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Palette className="h-4 w-4" />
                                        Color/Markings
                                    </Label>
                                    <Input
                                        id="color_markings"
                                        value={data.color_markings}
                                        onChange={(e) => setData('color_markings', e.target.value)}
                                        className="mt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="location" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        Location
                                    </Label>
                                    <Input
                                        id="location"
                                        value={data.location}
                                        onChange={(e) => setData('location', e.target.value)}
                                        className="mt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Health & Status Section */}
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardHeader className="border-b border-amber-200 dark:border-amber-800/50 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                    <Heart className="h-5 w-5 text-white" />
                                </div>
                                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Health & Status</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="health_status" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Heart className="h-4 w-4" />
                                        Health Status *
                                    </Label>
                                    <select
                                        id="health_status"
                                        value={data.health_status}
                                        onChange={(e) => setData('health_status', e.target.value)}
                                        className="w-full mt-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                        required
                                    >
                                        <option value="excellent">Excellent</option>
                                        <option value="good">Good</option>
                                        <option value="fair">Fair</option>
                                        <option value="poor">Poor</option>
                                    </select>
                                </div>

                                <div>
                                    <Label htmlFor="fertility_status" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Baby className="h-4 w-4" />
                                        Fertility Status *
                                    </Label>
                                    <select
                                        id="fertility_status"
                                        value={data.fertility_status}
                                        onChange={(e) => setData('fertility_status', e.target.value)}
                                        className="w-full mt-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                        required
                                    >
                                        <option value="fertile">Fertile</option>
                                        <option value="infertile">Infertile</option>
                                        <option value="unknown">Unknown</option>
                                    </select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Financial Information Section */}
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
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="original_purchase_price" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" />
                                        Original Purchase Price
                                    </Label>
                                    <Input
                                        id="original_purchase_price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.original_purchase_price}
                                        onChange={(e) => setData('original_purchase_price', e.target.value)}
                                        className="mt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="current_market_value" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" />
                                        Current Market Value
                                    </Label>
                                    <Input
                                        id="current_market_value"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.current_market_value}
                                        onChange={(e) => setData('current_market_value', e.target.value)}
                                        className="mt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Additional Information Section */}
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
                                <Label htmlFor="notes" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Notes
                                </Label>
                                <Textarea
                                    id="notes"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    rows={4}
                                    className="mt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                />
                            </div>

                            <div>
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                                    <ImageIcon className="h-4 w-4" />
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
                                    } ${photoPreviews.length > 0 ? 'p-4' : 'p-8'}`}
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
                                    
                                    {photoPreviews.length > 0 ? (
                                        <div className="space-y-4">
                                            {/* Photo Previews Grid */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {photoPreviews.map((preview, index) => (
                                                    <div
                                                        key={index}
                                                        className="relative group aspect-square rounded-lg overflow-hidden border-2 border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800"
                                                    >
                                                        <img
                                                            src={preview}
                                                            alt={`Preview ${index + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removePhoto(index)}
                                                            className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                            title="Remove photo"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <p className="truncate">{photos[index]?.name || `Photo ${index + 1}`}</p>
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
                    <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-800">
                        <Link href={route('animals.index')}>
                            <Button type="button" variant="outline" className="flex items-center gap-2">
                                <X className="h-4 w-4" />
                                Cancel
                            </Button>
                        </Link>
                        <Button 
                            type="submit" 
                            disabled={processing}
                            className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2"
                        >
                            <Save className="h-4 w-4" />
                            {processing ? 'Adding...' : 'Add Animal'}
                        </Button>
                    </div>
                </form>
            </div>
        </LivestockDashboardLayout>
    )
}

