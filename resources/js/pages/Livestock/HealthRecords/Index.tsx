"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Link, Head } from "@inertiajs/react"
import { Plus, Eye, Edit, Trash2, Calendar, FileText } from "lucide-react"
import { format } from "date-fns"
import { router } from "@inertiajs/react"
import { showSuccessToast, showErrorToast } from '@/lib/toast'
import type { BreadcrumbItem } from "@/types"

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Livestock", href: "#" },
    { title: "Animals", href: route('animals.index') },
    { title: "Health Records", href: "#" },
]

interface Animal {
    id: number
    breed: string
    primary_photo?: { url: string } | null
}

interface HealthRecord {
    id: number
    record_type: string
    description: string
    medication: string | null
    vet_name: string | null
    record_date: string
}

interface HealthRecordsIndexProps {
    animal: Animal
    records: {
        data: HealthRecord[]
        links: { url: string | null; label: string; active: boolean }[]
        current_page: number
        last_page: number
        total: number
    }
}

export default function HealthRecordsIndex({ animal, records }: HealthRecordsIndexProps) {
    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this health record?')) {
            router.delete(route('health.destroy', [animal.id, id]), {
                onSuccess: () => {
                    showSuccessToast('Health record deleted successfully.')
                },
                onError: () => {
                    showErrorToast('Failed to delete health record.')
                }
            })
        }
    }

    return (
        <LivestockDashboardLayout breadcrumbs={breadcrumbs}>
            <Head title={`Health Records - ${animal.breed}`} />
            
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Health Records</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            {animal.breed}
                        </p>
                    </div>
                    <Link href={route('animals.show', animal.id)}>
                        <Button variant="outline">
                            View Animal
                        </Button>
                    </Link>
                    <Link href={route('health.create', animal.id)}>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Record
                        </Button>
                    </Link>
                </div>

                {records.data.length > 0 ? (
                    <div className="space-y-4">
                        {records.data.map((record) => (
                            <Card key={record.id}>
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Badge variant="outline">{record.record_type}</Badge>
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <Calendar className="h-4 w-4" />
                                                    {format(new Date(record.record_date), 'MMM dd, yyyy')}
                                                </div>
                                            </div>
                                            <p className="text-gray-700 dark:text-gray-300 mb-2">
                                                {record.description}
                                            </p>
                                            {record.medication && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                                    <strong>Medication:</strong> {record.medication}
                                                </p>
                                            )}
                                            {record.vet_name && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    <strong>Vet:</strong> {record.vet_name}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Link href={route('health.show', [animal.id, record.id])}>
                                                <Button variant="outline" size="sm">
                                                    <Eye className="h-3 w-3" />
                                                </Button>
                                            </Link>
                                            <Link href={route('health.edit', [animal.id, record.id])}>
                                                <Button variant="outline" size="sm">
                                                    <Edit className="h-3 w-3" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDelete(record.id)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                                No health records yet
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                Start tracking health by adding your first record.
                            </p>
                            <Link href={route('health.create', animal.id)}>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Record
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}
            </div>
        </LivestockDashboardLayout>
    )
}

