"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/admin/ui/textarea"
import { Link, useForm, Head } from "@inertiajs/react"
import { showSuccessToast, showErrorToast } from '@/lib/toast'
import { 
    Building2, 
    MapPin, 
    Phone, 
    Mail,
    User,
    Edit,
    ArrowLeft,
    Save,
    Hash,
    TrendingUp,
    Users
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/admin/ui/combobox"

interface Profile {
    id: number
    farm_name: string
    address: string
    description: string | null
    phone: string | null
    email: string | null
    city: string | null
    state: string | null
    zip_code: string | null
    country: string | null
    national_id_number: string | null
    farm_type: string | null
    farm_size_acres: number | null
    number_of_animals: number | null
    specialization: string | null
}

interface EditProfileProps {
    profile: Profile
    countriesApiUrl?: string
    initialCountryOption?: { value: string; label: string } | null
}

export default function EditBuyerProfile({ profile, countriesApiUrl, initialCountryOption }: EditProfileProps) {
    const { data, setData, put, processing, errors } = useForm({
        farm_name: profile.farm_name || '',
        address: profile.address || '',
        description: profile.description || '',
        phone: profile.phone || '',
        email: profile.email || '',
        city: profile.city || '',
        state: profile.state || '',
        zip_code: profile.zip_code || '',
        country: profile.country || '',
        national_id_number: profile.national_id_number || '',
        farm_type: profile.farm_type || '',
        farm_size_acres: profile.farm_size_acres || '',
        number_of_animals: profile.number_of_animals || '',
        specialization: profile.specialization || '',
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        put("/buyer/update", {
            onSuccess: () => {
                showSuccessToast('Profile updated successfully.')
            },
            onError: () => {
                showErrorToast('Failed to update profile. Please check the form.')
            }
        })
    }

    return (
        <LivestockDashboardLayout>
            <Head title="Edit Buyer Profile - Livestock" />
            
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <Link href={route('buyer.dashboard')}>
                            <Button variant="ghost" size="sm" className="border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Dashboard
                            </Button>
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                            <Edit className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Buyer Profile</h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                                Update your farm information and details
                            </p>
                        </div>
                    </div>
                </div>

                {/* Farm Information Section */}
                <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="border-b border-amber-200 dark:border-amber-800/50 pb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                <Building2 className="h-5 w-5 text-white" />
                            </div>
                            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Farm Information</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="lg:col-span-2">
                                <Label htmlFor="farm_name" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                    <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    Farm Name *
                                </Label>
                                <Input
                                    id="farm_name"
                                    value={data.farm_name}
                                    onChange={(e) => setData('farm_name', e.target.value)}
                                    className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500 ${errors.farm_name ? 'border-red-500 dark:border-red-500' : ''}`}
                                    required
                                />
                                {errors.farm_name && (
                                    <p className="text-sm text-red-500 mt-1">{errors.farm_name}</p>
                                )}
                            </div>

                            <div className="lg:col-span-2">
                                <Label htmlFor="address" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                    <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    Address *
                                </Label>
                                <Textarea
                                    id="address"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    rows={3}
                                    className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500 ${errors.address ? 'border-red-500 dark:border-red-500' : ''}`}
                                    required
                                />
                                {errors.address && (
                                    <p className="text-sm text-red-500 mt-1">{errors.address}</p>
                                )}
                            </div>

                            <div className="lg:col-span-2">
                                <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                    <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    Description
                                </Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={4}
                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                    placeholder="Describe your farm..."
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-500 mt-1">{errors.description}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="city" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                    <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    City
                                </Label>
                                <Input
                                    id="city"
                                    value={data.city}
                                    onChange={(e) => setData('city', e.target.value)}
                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                />
                                {errors.city && (
                                    <p className="text-sm text-red-500 mt-1">{errors.city}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="state" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                    <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    State/Region
                                </Label>
                                <Input
                                    id="state"
                                    value={data.state}
                                    onChange={(e) => setData('state', e.target.value)}
                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                />
                                {errors.state && (
                                    <p className="text-sm text-red-500 mt-1">{errors.state}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="zip_code" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                    <Hash className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    Zip Code
                                </Label>
                                <Input
                                    id="zip_code"
                                    value={data.zip_code}
                                    onChange={(e) => setData('zip_code', e.target.value)}
                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                />
                                {errors.zip_code && (
                                    <p className="text-sm text-red-500 mt-1">{errors.zip_code}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="country" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                    <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    Country
                                </Label>
                                {countriesApiUrl ? (
                                    <Combobox
                                        value={data.country || ''}
                                        onValueChange={(value) => setData('country', value)}
                                        placeholder="Select country..."
                                        searchPlaceholder="Search countries..."
                                        emptyText="No country found."
                                        fetchUrl={countriesApiUrl}
                                        initialOptions={initialCountryOption ? [initialCountryOption] : []}
                                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                    />
                                ) : (
                                    <Input
                                        id="country"
                                        value={data.country}
                                        onChange={(e) => setData('country', e.target.value)}
                                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                    />
                                )}
                                {errors.country && (
                                    <p className="text-sm text-red-500 mt-1">{errors.country}</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Contact Information Section */}
                <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="border-b border-amber-200 dark:border-amber-800/50 pb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                <Phone className="h-5 w-5 text-white" />
                            </div>
                            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Contact Information</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <Label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                    <Phone className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    Phone
                                </Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                />
                                {errors.phone && (
                                    <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                    <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    Farm Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                />
                                {errors.email && (
                                    <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Farm Details Section */}
                <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="border-b border-amber-200 dark:border-amber-800/50 pb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Farm Details</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <Label htmlFor="farm_type" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                    <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    Farm Type
                                </Label>
                                <Select value={data.farm_type || ''} onValueChange={(value) => setData('farm_type', value)}>
                                    <SelectTrigger className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500">
                                        <SelectValue placeholder="Select farm type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="dairy">Dairy</SelectItem>
                                        <SelectItem value="meat">Meat</SelectItem>
                                        <SelectItem value="breeding">Breeding</SelectItem>
                                        <SelectItem value="mixed">Mixed</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.farm_type && (
                                    <p className="text-sm text-red-500 mt-1">{errors.farm_type}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="farm_size_acres" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                    <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    Farm Size (Acres)
                                </Label>
                                <Input
                                    id="farm_size_acres"
                                    type="number"
                                    min="0"
                                    value={data.farm_size_acres}
                                    onChange={(e) => setData('farm_size_acres', e.target.value ? parseInt(e.target.value) : '')}
                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                />
                                {errors.farm_size_acres && (
                                    <p className="text-sm text-red-500 mt-1">{errors.farm_size_acres}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="number_of_animals" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                    <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    Number of Animals
                                </Label>
                                <Input
                                    id="number_of_animals"
                                    type="number"
                                    min="0"
                                    value={data.number_of_animals}
                                    onChange={(e) => setData('number_of_animals', e.target.value ? parseInt(e.target.value) : '')}
                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                />
                                {errors.number_of_animals && (
                                    <p className="text-sm text-red-500 mt-1">{errors.number_of_animals}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="specialization" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                    <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    Specialization
                                </Label>
                                <Input
                                    id="specialization"
                                    value={data.specialization}
                                    onChange={(e) => setData('specialization', e.target.value)}
                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                    placeholder="e.g., Goat breeding, Sheep farming"
                                />
                                {errors.specialization && (
                                    <p className="text-sm text-red-500 mt-1">{errors.specialization}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="national_id_number" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                    <Hash className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    National ID Number
                                </Label>
                                <Input
                                    id="national_id_number"
                                    value={data.national_id_number}
                                    onChange={(e) => setData('national_id_number', e.target.value)}
                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                />
                                {errors.national_id_number && (
                                    <p className="text-sm text-red-500 mt-1">{errors.national_id_number}</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Link href={route('buyer.dashboard')}>
                        <Button type="button" variant="outline" className="border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20">
                            Cancel
                        </Button>
                    </Link>
                    <Button 
                        type="submit" 
                        disabled={processing}
                        className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {processing ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </LivestockDashboardLayout>
    )
}







