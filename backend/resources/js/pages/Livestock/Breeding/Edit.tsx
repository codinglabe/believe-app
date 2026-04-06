"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Link, useForm, Head } from "@inertiajs/react"
import { showSuccessToast, showErrorToast } from '@/lib/toast'
import { 
    Activity, 
    Heart, 
    Calendar, 
    DollarSign, 
    FileText, 
    Save, 
    X,
    Edit
} from "lucide-react"
import type { BreadcrumbItem } from "@/types"

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Livestock", href: "#" },
    { title: "Breeding Events", href: route('breeding.index') },
    { title: "Edit Breeding Event", href: "#" },
]

interface Animal {
    id: number
    breed: string
    ear_tag: string | null
    sex: string
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
}

interface EditProps {
    event: BreedingEvent
    males: Animal[]
    females: Animal[]
}

export default function EditBreeding({ event, males, females }: EditProps) {
    const formatDateForInput = (dateString: string | null) => {
        if (!dateString) return ''
        return new Date(dateString).toISOString().split('T')[0]
    }

    const { data, setData, put, processing, errors } = useForm({
        male_id: event.male_id.toString(),
        female_id: event.female_id.toString(),
        breeding_method: event.breeding_method,
        stud_fee: event.stud_fee?.toString() || '',
        breeding_date: formatDateForInput(event.breeding_date),
        expected_kidding_date: formatDateForInput(event.expected_kidding_date),
        notes: event.notes || '',
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        put(route('breeding.update', event.id), {
            onSuccess: () => {
                showSuccessToast('Breeding event updated successfully.')
            },
            onError: () => {
                showErrorToast('Failed to update breeding event.')
            }
        })
    }

    return (
        <LivestockDashboardLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Breeding Event - Livestock Management" />
            
            <div className="w-full">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                            <Edit className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Breeding Event</h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                                Update breeding event information
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Animal Selection Section */}
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardHeader className="border-b border-amber-200 dark:border-amber-800/50 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                    <Heart className="h-5 w-5 text-white" />
                                </div>
                                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Animal Selection</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="male_id" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Heart className="h-4 w-4" />
                                        Male Animal *
                                    </Label>
                                    <Select
                                        value={data.male_id}
                                        onValueChange={(value) => setData('male_id', value)}
                                        required
                                    >
                                        <SelectTrigger 
                                            id="male_id"
                                            className="mt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                        >
                                            <SelectValue placeholder="Select Male Animal" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {males.map((male) => (
                                                <SelectItem key={male.id} value={male.id.toString()}>
                                                    {male.breed} {male.ear_tag ? `(${male.ear_tag})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.male_id && (
                                        <p className="text-sm text-red-500 mt-1">{errors.male_id}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="female_id" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Heart className="h-4 w-4" />
                                        Female Animal *
                                    </Label>
                                    <Select
                                        value={data.female_id}
                                        onValueChange={(value) => setData('female_id', value)}
                                        required
                                    >
                                        <SelectTrigger 
                                            id="female_id"
                                            className="mt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                        >
                                            <SelectValue placeholder="Select Female Animal" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {females.map((female) => (
                                                <SelectItem key={female.id} value={female.id.toString()}>
                                                    {female.breed} {female.ear_tag ? `(${female.ear_tag})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.female_id && (
                                        <p className="text-sm text-red-500 mt-1">{errors.female_id}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Breeding Details Section */}
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardHeader className="border-b border-amber-200 dark:border-amber-800/50 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                    <Activity className="h-5 w-5 text-white" />
                                </div>
                                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Breeding Details</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="breeding_method" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Activity className="h-4 w-4" />
                                        Breeding Method *
                                    </Label>
                                    <Select
                                        value={data.breeding_method}
                                        onValueChange={(value) => setData('breeding_method', value)}
                                        required
                                    >
                                        <SelectTrigger 
                                            id="breeding_method"
                                            className="mt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                        >
                                            <SelectValue placeholder="Select Method" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="natural">Natural</SelectItem>
                                            <SelectItem value="artificial">Artificial Insemination</SelectItem>
                                            <SelectItem value="ai">AI</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="stud_fee" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" />
                                        Stud Fee
                                    </Label>
                                    <Input
                                        id="stud_fee"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.stud_fee}
                                        onChange={(e) => setData('stud_fee', e.target.value)}
                                        className="mt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="breeding_date" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Breeding Date *
                                    </Label>
                                    <Input
                                        id="breeding_date"
                                        type="date"
                                        value={data.breeding_date}
                                        onChange={(e) => setData('breeding_date', e.target.value)}
                                        required
                                        className="mt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-amber-500 dark:focus:ring-amber-500"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="expected_kidding_date" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Expected Kidding Date
                                    </Label>
                                    <Input
                                        id="expected_kidding_date"
                                        type="date"
                                        value={data.expected_kidding_date}
                                        onChange={(e) => setData('expected_kidding_date', e.target.value)}
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
                        <CardContent className="p-6">
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
                                    placeholder="Add any additional notes or observations about this breeding event..."
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-800">
                        <Link href={route('breeding.show', event.id)} className="w-full sm:w-auto">
                            <Button type="button" variant="outline" className="w-full sm:w-auto border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 flex items-center gap-2">
                                <X className="h-4 w-4" />
                                Cancel
                            </Button>
                        </Link>
                        <Button 
                            type="submit" 
                            disabled={processing}
                            className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30 flex items-center gap-2"
                        >
                            <Save className="h-4 w-4" />
                            {processing ? 'Updating...' : 'Update Breeding Event'}
                        </Button>
                    </div>
                </form>
            </div>
        </LivestockDashboardLayout>
    )
}

