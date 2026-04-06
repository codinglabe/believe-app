"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Link, Head } from "@inertiajs/react"
import { ArrowLeft, Edit, Calendar, FileText } from "lucide-react"
import { format } from "date-fns"
import type { BreadcrumbItem } from "@/types"

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Livestock", href: "#" },
    { title: "Animals", href: route('animals.index') },
    { title: "Health Record", href: "#" },
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

interface ShowProps {
    animal: Animal
    record: HealthRecord
}

export default function HealthRecordShow({ animal, record }: ShowProps) {
    return (
        <LivestockDashboardLayout breadcrumbs={breadcrumbs}>
            <Head title={`Health Record - ${animal.breed}`} />
            
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <Link href={route('health.index', animal.id)}>
                        <Button variant="ghost">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Records
                        </Button>
                    </Link>
                    <Link href={route('health.update', [animal.id, record.id])}>
                        <Button>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Record
                        </Button>
                    </Link>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Health Record Details</CardTitle>
                            <Badge variant="outline">{record.record_type}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Record Date</p>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <p className="font-semibold text-gray-900 dark:text-white">
                                    {format(new Date(record.record_date), 'MMM dd, yyyy')}
                                </p>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Description</p>
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                                {record.description}
                            </p>
                        </div>

                        {record.medication && (
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Medication</p>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                    {record.medication}
                                </p>
                            </div>
                        )}

                        {record.vet_name && (
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Veterinarian</p>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                    {record.vet_name}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </LivestockDashboardLayout>
    )
}

