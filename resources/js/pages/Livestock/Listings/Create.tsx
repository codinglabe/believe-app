"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Link, useForm, Head } from "@inertiajs/react"
import { showSuccessToast, showErrorToast } from '@/lib/toast'
import { 
    TrendingUp,
    FileText,
    DollarSign,
    Save,
    X,
    PlusCircle,
    Image as ImageIcon
} from "lucide-react"
import type { BreadcrumbItem } from "@/types"

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Livestock", href: "#" },
    { title: "Animals", href: route('animals.index') },
    { title: "Create Listing", href: "#" },
]

interface Animal {
    id: number
    breed: string
    species: string
    primary_photo?: { url: string } | null
}

interface CreateProps {
    animal: Animal
}

export default function CreateListing({ animal }: CreateProps) {
    const { data, setData, post, processing, errors } = useForm({
        title: `${animal.breed} - ${animal.species}`,
        description: '',
        price: '',
        currency: 'USD',
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        post(route('animals.listings.store', animal.id), {
            onSuccess: () => {
                showSuccessToast('Listing created successfully!')
            },
            onError: () => {
                showErrorToast('Failed to create listing.')
            }
        })
    }

    return (
        <LivestockDashboardLayout>
            <Head title={`Create Listing - ${animal.breed}`} />
            
            <div className="w-full">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <PlusCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                        Create Listing
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Create a marketplace listing for <span className="font-semibold text-gray-900 dark:text-white">{animal.breed}</span>
                    </p>
                </div>

                {/* Animal Preview */}
                <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow mb-6">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex-shrink-0">
                                {animal.primary_photo ? (
                                    <img
                                        src={animal.primary_photo.url}
                                        alt={animal.breed}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="h-8 w-8 text-gray-400 dark:text-gray-600" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="p-1 bg-gradient-to-r from-amber-600 to-orange-600 rounded">
                                        <ImageIcon className="h-3.5 w-3.5 text-white" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{animal.breed}</h3>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{animal.species}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Listing Information Section */}
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardHeader className="border-b border-amber-200 dark:border-amber-800/50 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                    <FileText className="h-5 w-5 text-white" />
                                </div>
                                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Listing Information</CardTitle>
                            </div>
                    </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div>
                                <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Listing Title *
                                </Label>
                                <Input
                                    id="title"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    className={`mt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500 ${errors.title ? 'border-red-500' : ''}`}
                                    required
                                    placeholder="Enter a descriptive title for your listing"
                                />
                                {errors.title && (
                                    <p className="text-sm text-red-500 mt-1">{errors.title}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Description
                                </Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={6}
                                    placeholder="Describe the animal, its health, breeding history, characteristics, and any other relevant information..."
                                    className="mt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pricing Section */}
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardHeader className="border-b border-amber-200 dark:border-amber-800/50 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                    <DollarSign className="h-5 w-5 text-white" />
                                </div>
                                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Pricing</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="price" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" />
                                        Price *
                                    </Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.price}
                                        onChange={(e) => setData('price', e.target.value)}
                                        className={`mt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500 ${errors.price ? 'border-red-500' : ''}`}
                                        required
                                        placeholder="0.00"
                                    />
                                    {errors.price && (
                                        <p className="text-sm text-red-500 mt-1">{errors.price}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="currency" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" />
                                        Currency *
                                    </Label>
                                    <Select
                                        value={data.currency}
                                        onValueChange={(value) => setData('currency', value)}
                                        required
                                    >
                                        <SelectTrigger 
                                            id="currency"
                                            className="mt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                        >
                                            <SelectValue placeholder="Select Currency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                                            <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-800">
                        <Link href={route('animals.show', animal.id)}>
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
                                    {processing ? 'Creating...' : 'Create Listing'}
                                </Button>
                            </div>
                        </form>
            </div>
        </LivestockDashboardLayout>
    )
}

