"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Link, useForm, Head, router } from "@inertiajs/react"
import { showSuccessToast, showErrorToast } from '@/lib/toast'
import { 
    ArrowLeft,
    Tag,
    Heart,
    FileText,
    Image as ImageIcon,
    Globe
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

interface Animal {
    id: number
    species: string
    breed: string
    sex: string
    ear_tag: string | null
    primary_photo?: { url: string } | null
    photos?: Array<{ id: number; url: string }>
}

interface Country {
    id: number
    code: string
    name: string
}

interface CreateFractionalListingProps {
    animal: Animal
    countries: Country[]
}

export default function CreateFractionalListing({ animal, countries }: CreateFractionalListingProps) {
    const { data, setData, post, processing, errors } = useForm({
        livestock_animal_id: animal.id,
        country_code: '',
        tag_number: '',
        notes: '',
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        post('/fractional-listings/store', {
            onSuccess: () => {
                showSuccessToast('Animal listed for fractional ownership successfully.')
            },
            onError: () => {
                showErrorToast('Failed to create fractional listing. Please try again.')
            }
        })
    }

    return (
        <LivestockDashboardLayout>
            <Head title="List Animal for Fractional Ownership" />
            
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/buyer/animals">
                        <Button variant="ghost" size="sm" className="border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Livestock
                        </Button>
                    </Link>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                        <Tag className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">List for Fractional Ownership</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            List your animal for fractional ownership investment
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Animal Preview */}
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardHeader className="border-b border-amber-200 dark:border-amber-800/50 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                    <Heart className="h-5 w-5 text-white" />
                                </div>
                                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Animal Information</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="flex gap-6">
                                {/* Animal Photo */}
                                {animal.primary_photo && (
                                    <div className="w-48 h-48 rounded-lg overflow-hidden border-2 border-amber-200 dark:border-amber-800 shadow-md flex-shrink-0">
                                        <img 
                                            src={animal.primary_photo.url} 
                                            alt={animal.breed}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                                
                                {/* Animal Details */}
                                <div className="grid grid-cols-2 gap-3 flex-1">
                                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Species</p>
                                        <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">{animal.species}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Breed</p>
                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{animal.breed}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Sex</p>
                                        <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">{animal.sex}</p>
                                    </div>
                                    {animal.ear_tag && (
                                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                            <p className="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-1">Ear Tag</p>
                                            <p className="text-base font-semibold text-amber-900 dark:text-amber-100">{animal.ear_tag}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Listing Details */}
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardHeader className="border-b border-amber-200 dark:border-amber-800/50 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                    <FileText className="h-5 w-5 text-white" />
                                </div>
                                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Listing Details</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="country_code" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                        <Globe className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        Country Code *
                                    </Label>
                                    <Select value={data.country_code} onValueChange={(value) => setData('country_code', value)}>
                                        <SelectTrigger className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500">
                                            <SelectValue placeholder="Select country" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {countries.map((country) => (
                                                <SelectItem key={country.id} value={country.code}>
                                                    {country.code} - {country.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.country_code && (
                                        <p className="text-sm text-red-500 mt-1">{errors.country_code}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="tag_number" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                        <Tag className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        Tag Number *
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        {data.country_code && (
                                            <span className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-l-lg text-sm font-semibold text-amber-900 dark:text-amber-100">
                                                {data.country_code.toUpperCase()}-
                                            </span>
                                        )}
                                        <Input
                                            id="tag_number"
                                            value={data.tag_number}
                                            onChange={(e) => setData('tag_number', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                            placeholder={data.country_code ? "Enter tag number" : "Select country first"}
                                            disabled={!data.country_code}
                                            className={`${data.country_code ? '' : 'rounded-l-lg'} bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500`}
                                        />
                                    </div>
                                    {data.country_code && data.tag_number && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Full tag: <span className="font-semibold text-amber-600 dark:text-amber-400">{data.country_code.toUpperCase()}-{data.tag_number.toUpperCase()}</span>
                                        </p>
                                    )}
                                    {errors.tag_number && (
                                        <p className="text-sm text-red-500 mt-1">{errors.tag_number}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="notes" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                    Additional Notes (Optional)
                                </Label>
                                <Textarea
                                    id="notes"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    placeholder="Add any additional information about this animal for fractional ownership..."
                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500 min-h-[120px]"
                                />
                                {errors.notes && (
                                    <p className="text-sm text-red-500 mt-1">{errors.notes}</p>
                                )}
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                <p className="text-sm text-amber-700 dark:text-amber-300">
                                    <strong>Note:</strong> Your listing will be reviewed by admin before it becomes active. You will be notified once it's approved.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Link href="/buyer/animals">
                            <Button 
                                type="button"
                                variant="outline" 
                                className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                Cancel
                            </Button>
                        </Link>
                        <Button 
                            type="submit"
                            disabled={processing}
                            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30"
                        >
                            {processing ? 'Submitting...' : 'List for Fractional Ownership'}
                        </Button>
                    </div>
                </form>
            </div>
        </LivestockDashboardLayout>
    )
}

