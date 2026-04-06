"use client"

import React from "react"
import { Head, Link } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
    Edit, 
    MessageCircle,
    HelpCircle,
    Clock,
    MapPin,
    Users,
    FileText,
} from "lucide-react"
import type { BreadcrumbItem } from "@/types"

interface Section {
    id?: number
    section: string
    content: any
    is_active?: boolean
}

interface ContactPageIndexProps {
    sections: {
        hero?: Section
        contact_methods?: Section[]
        faq?: Section[]
        office_hours?: Section
        office_location?: Section
        cta?: Section
    }
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Contact Page', href: '/admin/contact-page' },
]

const sectionInfo = [
    {
        key: 'hero',
        title: 'Hero Section',
        description: 'Main heading and description at the top of the page',
        icon: FileText,
        color: 'bg-blue-500',
    },
    {
        key: 'contact_methods',
        title: 'Contact Methods',
        description: 'Email, phone, and live chat information',
        icon: MessageCircle,
        color: 'bg-green-500',
    },
    {
        key: 'faq',
        title: 'FAQ Section',
        description: 'Frequently asked questions and answers',
        icon: HelpCircle,
        color: 'bg-purple-500',
    },
    {
        key: 'office_hours',
        title: 'Office Hours',
        description: 'Business hours information',
        icon: Clock,
        color: 'bg-orange-500',
    },
    {
        key: 'office_location',
        title: 'Office Location',
        description: 'Physical address and location details',
        icon: MapPin,
        color: 'bg-red-500',
    },
    {
        key: 'cta',
        title: 'Call to Action',
        description: 'Bottom section with action buttons',
        icon: Users,
        color: 'bg-indigo-500',
    },
]

export default function AdminContactPageIndex({ sections }: ContactPageIndexProps) {
    const getSectionData = (key: string) => {
        return sections[key as keyof typeof sections]
    }

    const hasContent = (key: string) => {
        const data = getSectionData(key)
        if (Array.isArray(data)) {
            return data.length > 0
        }
        return data !== null && data !== undefined
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Contact Page Management" />
            
            <div className="space-y-6 p-4 sm:p-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contact Page Management</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                            Manage all content sections of the contact page
                        </p>
                    </div>
                </div>

                {/* Sections Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sectionInfo.map((section) => {
                        const Icon = section.icon
                        const hasData = hasContent(section.key)
                        const data = getSectionData(section.key)
                        const itemCount = Array.isArray(data) ? data.length : (data ? 1 : 0)

                        return (
                            <Card 
                                key={section.key}
                                className="hover:shadow-lg transition-shadow duration-200 border-gray-200 dark:border-gray-700"
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${section.color} text-white`}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {section.title}
                                                </CardTitle>
                                                <CardDescription className="text-sm mt-1">
                                                    {section.description}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            {hasData ? (
                                                <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                                                    {Array.isArray(data) ? `${itemCount} items` : 'Configured'}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700">
                                                    Not configured
                                                </Badge>
                                            )}
                                        </div>
                                        <Link href={`/admin/contact-page/${section.key}/edit`}>
                                            <Button variant="outline" size="sm">
                                                <Edit className="h-4 w-4 mr-2" />
                                                {hasData ? 'Edit' : 'Configure'}
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </AppLayout>
    )
}

