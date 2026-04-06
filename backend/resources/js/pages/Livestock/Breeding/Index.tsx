"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Link, Head, router } from "@inertiajs/react"
import { Plus, Eye, Calendar, Heart, Activity, DollarSign, Baby } from "lucide-react"
import { format } from "date-fns"
import type { BreadcrumbItem } from "@/types"
import { useMemo } from "react"

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Livestock", href: "#" },
    { title: "Breeding Events", href: route('breeding.index') },
]

interface Animal {
    id: number
    breed: string
    ear_tag: string | null
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
    male: Animal
    female: Animal
}

interface BreedingIndexProps {
    events: {
        data: BreedingEvent[]
        links: { url: string | null; label: string; active: boolean }[]
        current_page: number
        last_page: number
        total: number
    }
}

export default function BreedingIndex({ events }: BreedingIndexProps) {
    // Calculate stats
    const stats = useMemo(() => {
        const total = events.total
        const completed = events.data.filter(e => e.actual_kidding_date !== null).length
        const pending = events.data.filter(e => e.actual_kidding_date === null && e.expected_kidding_date !== null).length
        const totalKids = events.data.reduce((sum, e) => sum + (e.number_of_kids || 0), 0)
        
        return { total, completed, pending, totalKids }
    }, [events])

    return (
        <LivestockDashboardLayout>
            <Head title="Breeding Events - Livestock Management" />
            
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Breeding Events</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Track and manage breeding activities
                        </p>
                    </div>
                    <Link href={route('breeding.create')}>
                        <Button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30">
                            <Plus className="h-4 w-4 mr-2" />
                            Record Breeding
                        </Button>
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Events</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
                                </div>
                                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                                    <Activity className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-green-200 dark:border-green-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.completed}</p>
                                </div>
                                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                                    <Heart className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-yellow-200 dark:border-yellow-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.pending}</p>
                                </div>
                                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                                    <Calendar className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-blue-200 dark:border-blue-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Kids</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalKids}</p>
                                </div>
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                    <Baby className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Breeding Events Grid */}
                {events.data.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.data.map((event) => (
                            <Card 
                                key={event.id} 
                                className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-all"
                            >
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg text-gray-900 dark:text-white">
                                            {event.male.breed} × {event.female.breed}
                                        </CardTitle>
                                        <Badge 
                                            variant="outline" 
                                            className="border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                                        >
                                            {event.breeding_method}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded">
                                                <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <span className="text-gray-700 dark:text-gray-300">
                                                Bred: <span className="font-semibold text-gray-900 dark:text-white">
                                                    {format(new Date(event.breeding_date), 'MMM dd, yyyy')}
                                                </span>
                                            </span>
                                        </div>
                                        {event.expected_kidding_date && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded">
                                                    <Heart className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                                </div>
                                                <span className="text-gray-700 dark:text-gray-300">
                                                    Expected: <span className="font-semibold text-gray-900 dark:text-white">
                                                        {format(new Date(event.expected_kidding_date), 'MMM dd, yyyy')}
                                                    </span>
                                                </span>
                                            </div>
                                        )}
                                        {event.actual_kidding_date && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded">
                                                    <Heart className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                </div>
                                                <span className="text-gray-700 dark:text-gray-300">
                                                    Kidded: <span className="font-semibold text-green-600 dark:text-green-400">
                                                        {format(new Date(event.actual_kidding_date), 'MMM dd, yyyy')}
                                                    </span>
                                                </span>
                                            </div>
                                        )}
                                        {event.number_of_kids && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded">
                                                    <Baby className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <span className="text-gray-900 dark:text-white font-bold">
                                                    {event.number_of_kids} kid(s) born
                                                </span>
                                            </div>
                                        )}
                                        {event.stud_fee && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded">
                                                    <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                                </div>
                                                <span className="text-gray-700 dark:text-gray-300">
                                                    Stud Fee: <span className="font-semibold text-gray-900 dark:text-white">
                                                        ${event.stud_fee.toLocaleString()}
                                                    </span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <Link href={route('breeding.show', event.id)}>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="w-full border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:border-amber-300 dark:hover:border-amber-700 font-medium"
                                            >
                                                <Eye className="h-3 w-3 mr-1.5" />
                                                View Details
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg">
                        <CardContent className="p-16 text-center">
                            <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full w-fit mx-auto mb-6">
                                <Heart className="h-16 w-16 text-amber-600 dark:text-amber-400" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                                No breeding events yet
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                                Start tracking breeding activities by recording your first event.
                            </p>
                            <Link href={route('breeding.create')}>
                                <Button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Record Breeding
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}

                {/* Pagination */}
                {events.last_page > 1 && (
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        {events.links.map((link, index) => (
                            <Button
                                key={index}
                                variant={link.active ? "default" : "outline"}
                                disabled={!link.url}
                                onClick={() => link.url && router.get(link.url)}
                                className={link.active ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30" : "border-gray-200 dark:border-gray-700"}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </LivestockDashboardLayout>
    )
}

