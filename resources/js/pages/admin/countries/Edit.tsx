"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, useForm, Link } from "@inertiajs/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Globe, Hash } from "lucide-react"

interface Country {
    id: number
    code: string
    name: string
    is_active: boolean
    display_order: number
}

interface EditCountryProps {
    country: Country
}

export default function EditCountry({ country }: EditCountryProps) {
    const { data, setData, put, processing, errors } = useForm({
        code: country.code,
        name: country.name,
        is_active: country.is_active,
        display_order: country.display_order,
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        put(`/admin/countries/${country.id}`, {
            onSuccess: () => {
                // Success handled by redirect
            },
        })
    }

    const breadcrumbs = [
        { title: 'Dashboard', href: '/admin' },
        { title: 'Countries', href: '/admin/countries' },
        { title: 'Edit', href: `/admin/countries/${country.id}/edit` },
    ]

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${country.name} - Admin`} />
            
            <div className="m-2 md:m-4 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/admin/countries">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Country</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                            Update country information
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <Card className="border-gray-200 dark:border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Globe className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                Country Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="code" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                        <Hash className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        Country Code (ISO 3166-1 alpha-2) *
                                    </Label>
                                    <Input
                                        id="code"
                                        value={data.code}
                                        onChange={(e) => setData('code', e.target.value.toUpperCase().slice(0, 2))}
                                        placeholder="e.g., GM, US, GB"
                                        maxLength={2}
                                        className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 ${errors.code ? 'border-red-500 dark:border-red-500' : ''}`}
                                        required
                                    />
                                    {errors.code && (
                                        <p className="text-sm text-red-500 mt-1">{errors.code}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                        Country Name *
                                    </Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="e.g., Gambia, United States"
                                        className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 ${errors.name ? 'border-red-500 dark:border-red-500' : ''}`}
                                        required
                                    />
                                    {errors.name && (
                                        <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="display_order" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                        Display Order
                                    </Label>
                                    <Input
                                        id="display_order"
                                        type="number"
                                        value={data.display_order}
                                        onChange={(e) => setData('display_order', parseInt(e.target.value) || 0)}
                                        min="0"
                                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                                    />
                                    {errors.display_order && (
                                        <p className="text-sm text-red-500 mt-1">{errors.display_order}</p>
                                    )}
                                </div>

                                <div className="flex items-center space-x-2 pt-8">
                                    <Checkbox
                                        id="is_active"
                                        checked={data.is_active}
                                        onCheckedChange={(checked) => setData('is_active', checked === true)}
                                    />
                                    <Label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                        Active (visible in dropdowns)
                                    </Label>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Link href="/admin/countries">
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Updating...' : 'Update Country'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    )
}




