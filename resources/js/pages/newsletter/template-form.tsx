"use client"

import { Head } from "@inertiajs/react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TextArea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm } from "@inertiajs/react"
import { useState } from "react"
import { ArrowLeft, Save, Eye, Code } from "lucide-react"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"

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
}

interface NewsletterTemplateFormProps {
    template?: Template
}

export default function NewsletterTemplateForm({ template }: NewsletterTemplateFormProps) {
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
    const isEditing = !!template

    const { data, setData, post, put, processing, errors } = useForm({
        name: template?.name || '',
        subject: template?.subject || '',
        content: template?.content || '',
        html_content: template?.html_content || '',
        template_type: template?.template_type || 'newsletter',
        settings: template?.settings || {
            frequency: 'weekly',
            timing: 'morning'
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (isEditing && template) {
            put(route('newsletter.templates.update', template.id))
        } else {
            post(route('newsletter.templates.store'))
        }
    }

    const templateTypes = [
        { value: 'newsletter', label: 'Newsletter' },
        { value: 'announcement', label: 'Announcement' },
        { value: 'event', label: 'Event' }
    ]

    return (
        <AppSidebarLayout>
            <Head title={isEditing ? `Edit Template: ${template.name}` : "Create Template"} />
            
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
                                    {isEditing ? 'Edit Template' : 'Create Template'}
                                </h1>
                                <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400">
                                    {isEditing ? 'Update your email template' : 'Create a reusable email template'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Main Content */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Template Details */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.1 }}
                                >
                                    <Card className="shadow-lg">
                                        <CardHeader>
                                            <CardTitle>Template Details</CardTitle>
                                            <CardDescription>
                                                Basic information about your template
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor="name">Template Name</Label>
                                                    <Input
                                                        id="name"
                                                        value={data.name}
                                                        onChange={(e) => setData('name', e.target.value)}
                                                        placeholder="e.g., Weekly Newsletter"
                                                        className="mt-1"
                                                    />
                                                    {errors.name && (
                                                        <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                                                    )}
                                                </div>

                                                <div>
                                                    <Label htmlFor="template_type">Template Type</Label>
                                                    <Select value={data.template_type} onValueChange={(value) => setData('template_type', value)}>
                                                        <SelectTrigger className="mt-1">
                                                            <SelectValue placeholder="Select template type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {templateTypes.map((type) => (
                                                                <SelectItem key={type.value} value={type.value}>
                                                                    {type.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {errors.template_type && (
                                                        <p className="text-sm text-red-600 mt-1">{errors.template_type}</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <Label htmlFor="subject">Default Subject Line</Label>
                                                <Input
                                                    id="subject"
                                                    value={data.subject}
                                                    onChange={(e) => setData('subject', e.target.value)}
                                                    placeholder="e.g., Weekly Update from {organization_name}"
                                                    className="mt-1"
                                                />
                                                {errors.subject && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.subject}</p>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>

                                {/* Content Editor */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                >
                                    <Card className="shadow-lg">
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <CardTitle>Content</CardTitle>
                                                    <CardDescription>
                                                        Create your email content
                                                    </CardDescription>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant={viewMode === 'edit' ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => setViewMode('edit')}
                                                    >
                                                        <Code className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant={viewMode === 'preview' ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => setViewMode('preview')}
                                                    >
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        Preview
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            {viewMode === 'edit' ? (
                                                <div className="space-y-4">
                                                    <div>
                                                        <Label htmlFor="content">Plain Text Content</Label>
                                                        <TextArea
                                                            id="content"
                                                            value={data.content}
                                                            onChange={(e) => setData('content', e.target.value)}
                                                            placeholder="Enter your email content in plain text..."
                                                            rows={10}
                                                            className="mt-1"
                                                        />
                                                        {errors.content && (
                                                            <p className="text-sm text-red-600 mt-1">{errors.content}</p>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <Label htmlFor="html_content">HTML Content (Optional)</Label>
                                                        <TextArea
                                                            id="html_content"
                                                            value={data.html_content}
                                                            onChange={(e) => setData('html_content', e.target.value)}
                                                            placeholder="Enter HTML content for rich formatting..."
                                                            rows={10}
                                                            className="mt-1 font-mono text-sm"
                                                        />
                                                        {errors.html_content && (
                                                            <p className="text-sm text-red-600 mt-1">{errors.html_content}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
                                                    <h3 className="font-semibold text-lg mb-4">
                                                        {data.subject || 'Template Preview'}
                                                    </h3>
                                                    <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                                        {data.content || 'No content yet...'}
                                                    </div>
                                                    {data.html_content && (
                                                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded">
                                                            <h4 className="font-medium mb-2">HTML Preview:</h4>
                                                            <div 
                                                                className="text-sm"
                                                                dangerouslySetInnerHTML={{ __html: data.html_content }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                {/* Template Settings */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.3 }}
                                >
                                    <Card className="shadow-lg">
                                        <CardHeader>
                                            <CardTitle>Template Settings</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div>
                                                <Label htmlFor="frequency">Default Frequency</Label>
                                                <Select 
                                                    value={data.settings.frequency} 
                                                    onValueChange={(value) => setData('settings', { ...data.settings, frequency: value })}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="daily">Daily</SelectItem>
                                                        <SelectItem value="weekly">Weekly</SelectItem>
                                                        <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                                                        <SelectItem value="monthly">Monthly</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div>
                                                <Label htmlFor="timing">Default Timing</Label>
                                                <Select 
                                                    value={data.settings.timing} 
                                                    onValueChange={(value) => setData('settings', { ...data.settings, timing: value })}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="morning">Morning (9 AM)</SelectItem>
                                                        <SelectItem value="afternoon">Afternoon (2 PM)</SelectItem>
                                                        <SelectItem value="evening">Evening (6 PM)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>

                                {/* Actions */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.4 }}
                                >
                                    <Card className="shadow-lg">
                                        <CardHeader>
                                            <CardTitle>Actions</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <Button
                                                type="submit"
                                                className="w-full"
                                                disabled={processing}
                                            >
                                                <Save className="h-4 w-4 mr-2" />
                                                {processing 
                                                    ? (isEditing ? 'Updating...' : 'Creating...') 
                                                    : (isEditing ? 'Update Template' : 'Create Template')
                                                }
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </motion.div>

                                {/* Template Variables */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.5 }}
                                >
                                    <Card className="shadow-lg">
                                        <CardHeader>
                                            <CardTitle>Available Variables</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                                                        {`{organization_name}`}
                                                    </code>
                                                    <span className="text-gray-600 dark:text-gray-400">Organization name</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                                                        {`{recipient_name}`}
                                                    </code>
                                                    <span className="text-gray-600 dark:text-gray-400">Recipient name</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                                                        {`{unsubscribe_link}`}
                                                    </code>
                                                    <span className="text-gray-600 dark:text-gray-400">Unsubscribe link</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                                                        {`{current_date}`}
                                                    </code>
                                                    <span className="text-gray-600 dark:text-gray-400">Current date</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </div>
                        </div>
                    </form>
            </div>
        </AppSidebarLayout>
    )
}
