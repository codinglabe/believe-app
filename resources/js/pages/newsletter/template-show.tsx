"use client"

import { Head, Link } from "@inertiajs/react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import { 
    ArrowLeft, 
    Edit, 
    Trash2, 
    Eye, 
    Calendar,
    Mail,
    Code,
    Settings
} from "lucide-react"

interface Template {
    id: number
    name: string
    subject: string
    content: string
    html_content?: string
    template_type: string
    settings: {
        frequency?: string
        timing?: string
    }
    is_active: boolean
    created_at: string
    updated_at: string
    organization?: {
        name: string
    }
}

interface TemplateShowProps {
    template: Template
}

export default function TemplateShow({ template }: TemplateShowProps) {
    const getTemplateTypeColor = (type: string) => {
        switch (type) {
            case 'newsletter': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            case 'announcement': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            case 'event': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
        }
    }

    const getFrequencyText = (frequency: string) => {
        switch (frequency) {
            case 'daily': return 'Daily'
            case 'weekly': return 'Weekly'
            case 'bi-weekly': return 'Bi-weekly'
            case 'monthly': return 'Monthly'
            default: return 'Not set'
        }
    }

    const getTimingText = (timing: string) => {
        switch (timing) {
            case 'morning': return 'Morning (9 AM)'
            case 'afternoon': return 'Afternoon (2 PM)'
            case 'evening': return 'Evening (6 PM)'
            default: return 'Not set'
        }
    }

    return (
        <AppSidebarLayout>
            <Head title={`Template: ${template.name}`} />
            
            <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 m-10">
                {/* Header */}
                <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2 animate-in slide-in-from-left duration-700">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" size="sm" onClick={() => window.history.back()}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                            <div>
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                                    {template.name}
                                </h1>
                                <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400">
                                    Template Details
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="animate-in slide-in-from-right duration-700">
                        <div className="flex items-center gap-2">
                            <Link href={route('newsletter.templates.edit', template.id)}>
                                <Button variant="outline" className="shadow-lg hover:shadow-xl transition-all duration-300">
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                </Button>
                            </Link>
                            <form 
                                method="POST" 
                                action={route('newsletter.templates.destroy', template.id)}
                                className="inline"
                                onSubmit={(e) => {
                                    if (!confirm('Are you sure you want to delete this template?')) {
                                        e.preventDefault();
                                    }
                                }}
                            >
                                <input type="hidden" name="_method" value="DELETE" />
                                <input type="hidden" name="_token" value={document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''} />
                                <Button 
                                    type="submit"
                                    variant="destructive" 
                                    className="shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Template Info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <Card className="shadow-lg">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-3">
                                        <Mail className="h-5 w-5" />
                                        Template Information
                                    </CardTitle>
                                    <CardDescription>
                                        Basic information about this template
                                    </CardDescription>
                                </div>
                                <Badge className={getTemplateTypeColor(template.template_type)}>
                                    {template.template_type}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Template Name</label>
                                    <p className="text-gray-900 dark:text-white font-medium">{template.name}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Subject Line</label>
                                    <p className="text-gray-900 dark:text-white font-medium">{template.subject}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                                    <p className="text-gray-900 dark:text-white font-medium capitalize">{template.template_type}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                                    <Badge className={template.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                        {template.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Created</label>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        {new Date(template.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Updated</label>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        {new Date(template.updated_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Template Settings */}
                {template.settings && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    <Settings className="h-5 w-5" />
                                    Template Settings
                                </CardTitle>
                                <CardDescription>
                                    Default settings for this template
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Default Frequency</label>
                                        <p className="text-gray-900 dark:text-white font-medium">
                                            {getFrequencyText(template.settings.frequency || '')}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Default Timing</label>
                                        <p className="text-gray-900 dark:text-white font-medium">
                                            {getTimingText(template.settings.timing || '')}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Template Content */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <Eye className="h-5 w-5" />
                                Template Content
                            </CardTitle>
                            <CardDescription>
                                Preview of the template content
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Text Content</label>
                                    <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white">
                                            {template.content}
                                        </pre>
                                    </div>
                                </div>
                                
                                {template.html_content && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">HTML Content</label>
                                        <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <div 
                                                className="text-sm"
                                                dangerouslySetInnerHTML={{ __html: template.html_content }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </AppSidebarLayout>
    )
}
