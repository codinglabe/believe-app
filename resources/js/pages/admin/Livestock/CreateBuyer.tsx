"use client"

import AppLayout from "@/layouts/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { CardDescription } from "@/components/ui/card"
import { Button } from "@/components/admin/ui/button"
import { Input } from "@/components/admin/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/admin/ui/textarea"
import { router, Head, useForm } from "@inertiajs/react"
import { ArrowLeft, PlusCircle, Building2, User, Mail, Phone, MapPin, FileText, Hash, Link2 } from "lucide-react"
import { showSuccessToast, showErrorToast } from '@/lib/toast'
import type { BreadcrumbItem } from "@/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface FractionalAsset {
    id: number
    name: string
    type: string
}

interface CreateBuyerProps {
    availableAssets: FractionalAsset[]
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Admin", href: "/dashboard" },
    { title: "Livestock", href: "/admin/livestock" },
    { title: "Buyers", href: "/admin/livestock/buyers" },
    { title: "Add Buyer", href: "#" },
]

export default function CreateBuyer({ availableAssets = [] }: CreateBuyerProps) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        phone: '',
        farm_name: '',
        address: '',
        description: '',
        email_buyer: '',
        city: '',
        state: '',
        zip_code: '',
        country: '',
        national_id_number: '',
        farm_type: '',
        farm_size_acres: '',
        number_of_animals: '',
        specialization: '',
        fractional_asset_id: '',
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        post('/admin/livestock/buyers', {
            onSuccess: () => {
                showSuccessToast('Buyer created successfully.')
            },
            onError: () => {
                showErrorToast('Failed to create buyer. Please check the form for errors.')
            }
        })
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add Buyer - Livestock Management" />
            
            <div className="m-2 md:m-4 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.visit('/admin/livestock/buyers')}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-semibold">Create New Buyer</h1>
                        <p className="text-sm text-muted-foreground">Create a new buyer account with farm information.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* User Account Information */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <User className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <CardTitle>User Account Information</CardTitle>
                                    <CardDescription>Basic account details for the buyer</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name *</Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            className={errors.name ? "border-red-500" : ""}
                                            placeholder="Enter full name"
                                            required
                                        />
                                        {errors.name && (
                                            <p className="text-sm text-red-500">{errors.name}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email *</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            className={errors.email ? "border-red-500" : ""}
                                            placeholder="Enter email address"
                                            required
                                        />
                                        {errors.email && (
                                            <p className="text-sm text-red-500">{errors.email}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Password *</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            className={errors.password ? "border-red-500" : ""}
                                            placeholder="Enter password"
                                            required
                                        />
                                        {errors.password && (
                                            <p className="text-sm text-red-500">{errors.password}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password_confirmation">Confirm Password *</Label>
                                        <Input
                                            id="password_confirmation"
                                            type="password"
                                            value={data.password_confirmation}
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                            className={errors.password_confirmation ? "border-red-500" : ""}
                                            placeholder="Confirm password"
                                            required
                                        />
                                        {errors.password_confirmation && (
                                            <p className="text-sm text-red-500">{errors.password_confirmation}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number *</Label>
                                        <Input
                                            id="phone"
                                            value={data.phone}
                                            onChange={(e) => setData('phone', e.target.value)}
                                            className={errors.phone ? "border-red-500" : ""}
                                            placeholder="Enter phone number"
                                            required
                                        />
                                        {errors.phone && (
                                            <p className="text-sm text-red-500">{errors.phone}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Farm Information */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <CardTitle>Farm Information</CardTitle>
                                    <CardDescription>Details about the buyer's farm</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="farm_name">Farm Name *</Label>
                                    <Input
                                        id="farm_name"
                                        value={data.farm_name}
                                        onChange={(e) => setData('farm_name', e.target.value)}
                                        className={errors.farm_name ? "border-red-500" : ""}
                                        placeholder="Enter farm name"
                                        required
                                    />
                                    {errors.farm_name && (
                                        <p className="text-sm text-red-500">{errors.farm_name}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Address *</Label>
                                    <Textarea
                                        id="address"
                                        value={data.address}
                                        onChange={(e) => setData('address', e.target.value)}
                                        placeholder="Enter farm address"
                                        rows={3}
                                        required
                                        className={errors.address ? "border-red-500" : ""}
                                    />
                                    {errors.address && (
                                        <p className="text-sm text-red-500">{errors.address}</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            value={data.city}
                                            onChange={(e) => setData('city', e.target.value)}
                                            className={errors.city ? "border-red-500" : ""}
                                            placeholder="Enter city"
                                        />
                                        {errors.city && (
                                            <p className="text-sm text-red-500">{errors.city}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="state">State</Label>
                                        <Input
                                            id="state"
                                            value={data.state}
                                            onChange={(e) => setData('state', e.target.value)}
                                            className={errors.state ? "border-red-500" : ""}
                                            placeholder="Enter state"
                                        />
                                        {errors.state && (
                                            <p className="text-sm text-red-500">{errors.state}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="zip_code">Zip Code</Label>
                                        <Input
                                            id="zip_code"
                                            value={data.zip_code}
                                            onChange={(e) => setData('zip_code', e.target.value)}
                                            className={errors.zip_code ? "border-red-500" : ""}
                                            placeholder="Enter zip code"
                                        />
                                        {errors.zip_code && (
                                            <p className="text-sm text-red-500">{errors.zip_code}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="country">Country</Label>
                                        <Input
                                            id="country"
                                            value={data.country}
                                            onChange={(e) => setData('country', e.target.value)}
                                            className={errors.country ? "border-red-500" : ""}
                                            placeholder="Enter country"
                                        />
                                        {errors.country && (
                                            <p className="text-sm text-red-500">{errors.country}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email_buyer">Farm Email</Label>
                                        <Input
                                            id="email_buyer"
                                            type="email"
                                            value={data.email_buyer}
                                            onChange={(e) => setData('email_buyer', e.target.value)}
                                            className={errors.email_buyer ? "border-red-500" : ""}
                                            placeholder="Enter farm email (optional)"
                                        />
                                        {errors.email_buyer && (
                                            <p className="text-sm text-red-500">{errors.email_buyer}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="national_id_number">National ID Number</Label>
                                        <Input
                                            id="national_id_number"
                                            value={data.national_id_number}
                                            onChange={(e) => setData('national_id_number', e.target.value)}
                                            className={errors.national_id_number ? "border-red-500" : ""}
                                            placeholder="Enter national ID (optional)"
                                        />
                                        {errors.national_id_number && (
                                            <p className="text-sm text-red-500">{errors.national_id_number}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="farm_type">Farm Type</Label>
                                        <Input
                                            id="farm_type"
                                            value={data.farm_type}
                                            onChange={(e) => setData('farm_type', e.target.value)}
                                            className={errors.farm_type ? "border-red-500" : ""}
                                            placeholder="e.g., Dairy, Meat, Breeding"
                                        />
                                        {errors.farm_type && (
                                            <p className="text-sm text-red-500">{errors.farm_type}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="farm_size_acres">Farm Size (Acres)</Label>
                                        <Input
                                            id="farm_size_acres"
                                            type="number"
                                            min="0"
                                            value={data.farm_size_acres}
                                            onChange={(e) => setData('farm_size_acres', e.target.value)}
                                            className={errors.farm_size_acres ? "border-red-500" : ""}
                                            placeholder="Enter farm size in acres"
                                        />
                                        {errors.farm_size_acres && (
                                            <p className="text-sm text-red-500">{errors.farm_size_acres}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="number_of_animals">Number of Animals</Label>
                                        <Input
                                            id="number_of_animals"
                                            type="number"
                                            min="0"
                                            value={data.number_of_animals}
                                            onChange={(e) => setData('number_of_animals', e.target.value)}
                                            className={errors.number_of_animals ? "border-red-500" : ""}
                                            placeholder="Enter number of animals"
                                        />
                                        {errors.number_of_animals && (
                                            <p className="text-sm text-red-500">{errors.number_of_animals}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="specialization">Specialization</Label>
                                        <Input
                                            id="specialization"
                                            value={data.specialization}
                                            onChange={(e) => setData('specialization', e.target.value)}
                                            className={errors.specialization ? "border-red-500" : ""}
                                            placeholder="e.g., Goat breeding, Sheep farming"
                                        />
                                        {errors.specialization && (
                                            <p className="text-sm text-red-500">{errors.specialization}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        placeholder="Enter farm description (optional)"
                                        rows={4}
                                        className={errors.description ? "border-red-500" : ""}
                                    />
                                    {errors.description && (
                                        <p className="text-sm text-red-500">{errors.description}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Asset Link Section */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Link2 className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <CardTitle>Link Fractional Asset</CardTitle>
                                    <CardDescription>Link a fractional asset to this buyer. When the buyer creates listings, this asset will be automatically used.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label htmlFor="fractional_asset_id">Fractional Asset (Optional)</Label>
                                <Select
                                    value={data.fractional_asset_id || "none"}
                                    onValueChange={(value) => setData('fractional_asset_id', value === "none" ? "" : value)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select an asset to link" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Asset</SelectItem>
                                        {availableAssets.map((asset) => (
                                            <SelectItem key={asset.id} value={asset.id.toString()}>
                                                {asset.name} ({asset.type})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.fractional_asset_id && (
                                    <p className="text-sm text-red-500">{errors.fractional_asset_id}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Only livestock/animal assets (goat, livestock) can be linked. When the buyer creates a fractional listing, this asset ID will be automatically stored in the listing.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-4 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.visit('/admin/livestock/buyers')}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing}
                        >
                            {processing ? 'Creating...' : 'Create Buyer'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    )
}

