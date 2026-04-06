"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Link, useForm, Head } from "@inertiajs/react"
import { showSuccessToast, showErrorToast } from '@/lib/toast'
import type { BreadcrumbItem } from "@/types"

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Livestock", href: "#" },
    { title: "Animals", href: route('animals.index') },
    { title: "Edit Health Record", href: "#" },
]

interface Animal {
    id: number
    breed: string
}

interface HealthRecord {
    id: number
    record_type: string
    description: string
    medication: string | null
    vet_name: string | null
    record_date: string
}

interface EditProps {
    animal: Animal
    record: HealthRecord
}

export default function EditHealthRecord({ animal, record }: EditProps) {
    const { data, setData, put, processing, errors } = useForm({
        record_type: record.record_type || 'checkup',
        description: record.description || '',
        medication: record.medication || '',
        vet_name: record.vet_name || '',
        record_date: record.record_date || new Date().toISOString().split('T')[0],
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        put(route('health.update', [animal.id, record.id]), {
            onSuccess: () => {
                showSuccessToast('Health record updated successfully.')
            },
            onError: () => {
                showErrorToast('Failed to update health record.')
            }
        })
    }

    return (
        <LivestockDashboardLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit Health Record - ${animal.breed}`} />
            
            <div className="max-w-3xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Edit Health Record for {animal.breed}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="record_type">Record Type *</Label>
                                    <select
                                        id="record_type"
                                        value={data.record_type}
                                        onChange={(e) => setData('record_type', e.target.value)}
                                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
                                        required
                                    >
                                        <option value="vaccination">Vaccination</option>
                                        <option value="treatment">Treatment</option>
                                        <option value="checkup">Checkup</option>
                                        <option value="surgery">Surgery</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <Label htmlFor="record_date">Record Date *</Label>
                                    <Input
                                        id="record_date"
                                        type="date"
                                        value={data.record_date}
                                        onChange={(e) => setData('record_date', e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="medication">Medication</Label>
                                    <Input
                                        id="medication"
                                        value={data.medication}
                                        onChange={(e) => setData('medication', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="vet_name">Vet Name</Label>
                                    <Input
                                        id="vet_name"
                                        value={data.vet_name}
                                        onChange={(e) => setData('vet_name', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="description">Description *</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={6}
                                    required
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-500 mt-1">{errors.description}</p>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Updating...' : 'Update Record'}
                                </Button>
                                <Link href={route('health.show', [animal.id, record.id])}>
                                    <Button type="button" variant="outline">Cancel</Button>
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </LivestockDashboardLayout>
    )
}

