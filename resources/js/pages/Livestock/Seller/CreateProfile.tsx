"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Link, useForm, Head } from "@inertiajs/react"
import { showSuccessToast, showErrorToast } from '@/lib/toast'
import { 
    Building2, 
    MapPin, 
    Phone, 
    CreditCard, 
    User, 
    Banknote,
    PlusCircle,
    ArrowLeft,
    FileText
} from "lucide-react"

export default function CreateSellerProfile() {
    const { data, setData, post, processing, errors } = useForm({
        farm_name: '',
        address: '',
        description: '',
        phone: '',
        national_id_number: '',
        payee_type: 'individual' as 'individual' | 'business' | 'bank',
        payee_details: {} as Record<string, any>,
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        post("/seller/create", {
            onSuccess: () => {
                showSuccessToast('Seller profile created! Waiting for admin verification.')
            },
            onError: () => {
                showErrorToast('Failed to create profile. Please check the form.')
            }
        })
    }

    return (
        <LivestockDashboardLayout>
            <Head title="Create Seller Profile - Livestock" />
            
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/seller/dashboard">
                            <Button variant="ghost" size="sm" className="border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Dashboard
                            </Button>
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                            <PlusCircle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Seller Profile</h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                                Set up your farm information and payment details to start selling livestock on our platform
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
                                    <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    Description
                                </Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={4}
                                    placeholder="Tell us about your farm, experience, and what makes your livestock special..."
                                    className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500 ${errors.description ? 'border-red-500 dark:border-red-500' : ''}`}
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-500 mt-1">{errors.description}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                    <Phone className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    Phone *
                                </Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500 ${errors.phone ? 'border-red-500 dark:border-red-500' : ''}`}
                                    required
                                />
                                {errors.phone && (
                                    <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="national_id_number" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                    <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    National ID Number
                                </Label>
                                <Input
                                    id="national_id_number"
                                    value={data.national_id_number}
                                    onChange={(e) => setData('national_id_number', e.target.value)}
                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                    placeholder="Optional"
                                />
                                {errors.national_id_number && (
                                    <p className="text-sm text-red-500 mt-1">{errors.national_id_number}</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Information Section */}
                <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="border-b border-amber-200 dark:border-amber-800/50 pb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                <Banknote className="h-5 w-5 text-white" />
                            </div>
                            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Payment Information</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-6">
                            <div>
                                <Label htmlFor="payee_type" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                                    <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    Payee Type *
                                </Label>
                                <select
                                    id="payee_type"
                                    value={data.payee_type}
                                    onChange={(e) => setData('payee_type', e.target.value as any)}
                                    className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2.5 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500 focus:outline-none transition-colors"
                                    required
                                >
                                    <option value="individual">Individual</option>
                                    <option value="business">Business</option>
                                    <option value="bank">Bank Account</option>
                                </select>
                                {errors.payee_type && (
                                    <p className="text-sm text-red-500 mt-1">{errors.payee_type}</p>
                                )}
                            </div>

                            <div>
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
                                    Payment Details *
                                </Label>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {data.payee_type === 'individual' && (
                                        <>
                                            <div>
                                                <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Full Name</Label>
                                            <Input
                                                    placeholder="Enter full name"
                                                value={data.payee_details.name || ''}
                                                onChange={(e) => setData('payee_details', { ...data.payee_details, name: e.target.value })}
                                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                            />
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Bank Account Number</Label>
                                            <Input
                                                    placeholder="Enter account number"
                                                value={data.payee_details.account_number || ''}
                                                onChange={(e) => setData('payee_details', { ...data.payee_details, account_number: e.target.value })}
                                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                            />
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Routing Number</Label>
                                            <Input
                                                    placeholder="Enter routing number"
                                                value={data.payee_details.routing_number || ''}
                                                onChange={(e) => setData('payee_details', { ...data.payee_details, routing_number: e.target.value })}
                                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                            />
                                            </div>
                                        </>
                                    )}
                                    {data.payee_type === 'business' && (
                                        <>
                                            <div>
                                                <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Business Name</Label>
                                            <Input
                                                    placeholder="Enter business name"
                                                value={data.payee_details.business_name || ''}
                                                onChange={(e) => setData('payee_details', { ...data.payee_details, business_name: e.target.value })}
                                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                            />
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">EIN/Tax ID</Label>
                                            <Input
                                                    placeholder="Enter tax ID"
                                                value={data.payee_details.tax_id || ''}
                                                onChange={(e) => setData('payee_details', { ...data.payee_details, tax_id: e.target.value })}
                                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                            />
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Bank Account Number</Label>
                                            <Input
                                                    placeholder="Enter account number"
                                                value={data.payee_details.account_number || ''}
                                                onChange={(e) => setData('payee_details', { ...data.payee_details, account_number: e.target.value })}
                                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                            />
                                            </div>
                                        </>
                                    )}
                                    {data.payee_type === 'bank' && (
                                        <>
                                            <div>
                                                <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Bank Name</Label>
                                            <Input
                                                    placeholder="Enter bank name"
                                                value={data.payee_details.bank_name || ''}
                                                onChange={(e) => setData('payee_details', { ...data.payee_details, bank_name: e.target.value })}
                                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                            />
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Account Number</Label>
                                            <Input
                                                    placeholder="Enter account number"
                                                value={data.payee_details.account_number || ''}
                                                onChange={(e) => setData('payee_details', { ...data.payee_details, account_number: e.target.value })}
                                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                            />
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Routing Number</Label>
                                            <Input
                                                    placeholder="Enter routing number"
                                                value={data.payee_details.routing_number || ''}
                                                onChange={(e) => setData('payee_details', { ...data.payee_details, routing_number: e.target.value })}
                                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                            />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Link href="/seller/dashboard">
                        <Button type="button" variant="outline" className="border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20">
                            Cancel
                        </Button>
                    </Link>
                                <Button 
                                    type="submit" 
                                    disabled={processing}
                        className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30"
                                >
                        <PlusCircle className="h-4 w-4 mr-2" />
                                    {processing ? 'Creating...' : 'Create Profile'}
                                </Button>
                            </div>
                        </form>
        </LivestockDashboardLayout>
    )
}
