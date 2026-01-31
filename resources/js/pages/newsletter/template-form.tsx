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

// Variable Item Component
function VariableItem({ variable, description, sampleValue, onCopy }: { 
    variable: string
    description: string
    sampleValue: string
    onCopy: () => void
}) {
    const [copied, setCopied] = useState(false)
    
    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onCopy()
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    
    return (
        <div className="group flex items-start justify-between gap-2 p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded transition-colors">
            <div className="flex-1 min-w-0">
                <button
                    type="button"
                    onClick={handleCopy}
                    className="text-left w-full"
                    title={`Click to copy ${variable}`}
                >
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono block mb-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        {variable}
                    </code>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                        <span>{description}</span>
                        <span className="ml-2 text-gray-500 dark:text-gray-500">
                            → {sampleValue}
                        </span>
                    </div>
                </button>
            </div>
            <button
                type="button"
                onClick={handleCopy}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
                title="Copy variable"
            >
                {copied ? (
                    <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                ) : (
                    <Copy className="h-3 w-3" />
                )}
            </button>
        </div>
    )
}
import { ArrowLeft, Save, Eye, Code, Copy, Check } from "lucide-react"
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

interface PreviewData {
    organization_name: string
    organization_email: string
    organization_phone: string
    organization_address: string
    recipient_name: string
    recipient_email: string
    current_date: string
    current_year: string
    unsubscribe_link: string
}

interface NewsletterTemplateFormProps {
    template?: Template
    previewData?: PreviewData
}

export default function NewsletterTemplateForm({ template, previewData }: NewsletterTemplateFormProps) {
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

    // Use real data from backend, fallback to demo data if not available
    const sampleData: PreviewData = previewData || {
        organization_name: 'Your Organization',
        organization_email: 'contact@example.com',
        organization_phone: '+1 (555) 000-0000',
        organization_address: 'Your Organization Address',
        recipient_name: 'Recipient Name',
        recipient_email: 'recipient@example.com',
        current_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        current_year: new Date().getFullYear().toString(),
        unsubscribe_link: 'https://example.com/unsubscribe?token=preview_token',
    }

    // Function to replace variables with sample data
    const replaceVariables = (text: string): string => {
        if (!text) return ''
        
        let result = text
        Object.entries(sampleData).forEach(([key, value]) => {
            const regex = new RegExp(`\\{${key}\\}`, 'g')
            result = result.replace(regex, value)
        })
        
        return result
    }

    // Get preview of subject and content with variables replaced
    const previewSubject = replaceVariables(data.subject)
    const previewContent = replaceVariables(data.content)
    const previewHtmlContent = replaceVariables(data.html_content || '')

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
                                                <div className="space-y-4">
                                                    <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
                                                        <div className="mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Subject Preview:</p>
                                                            <h3 className="font-semibold text-lg">
                                                                {previewSubject || 'Template Preview'}
                                                            </h3>
                                                        </div>
                                                        <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                                            {previewContent || 'No content yet...'}
                                                        </div>
                                                        {previewHtmlContent && (
                                                            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded">
                                                                <h4 className="font-medium mb-2">HTML Preview:</h4>
                                                                <div 
                                                                    className="text-sm prose prose-sm max-w-none dark:prose-invert"
                                                                    dangerouslySetInnerHTML={{ __html: previewHtmlContent }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Variable Replacement Info */}
                                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                                        <p className="text-xs text-blue-800 dark:text-blue-300 font-medium mb-1">
                                                            💡 Variables replaced with real data
                                                        </p>
                                                        <p className="text-xs text-blue-700 dark:text-blue-400">
                                                            Variables like {'{organization_name}'}, {'{recipient_name}'} are shown with your actual organization and recipient data in the preview above.
                                                        </p>
                                                    </div>
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
                                            <CardTitle className="flex items-center gap-2">
                                                <Code className="h-4 w-4" />
                                                Available Variables
                                            </CardTitle>
                                            <CardDescription>
                                                Click to copy, use in subject or content
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Organization</p>
                                                    <div className="space-y-1.5">
                                                        <VariableItem 
                                                            variable="{organization_name}" 
                                                            description="Organization name"
                                                            sampleValue={sampleData.organization_name}
                                                            onCopy={() => navigator.clipboard.writeText('{organization_name}')}
                                                        />
                                                        <VariableItem 
                                                            variable="{organization_email}" 
                                                            description="Organization email"
                                                            sampleValue={sampleData.organization_email}
                                                            onCopy={() => navigator.clipboard.writeText('{organization_email}')}
                                                        />
                                                        <VariableItem 
                                                            variable="{organization_phone}" 
                                                            description="Organization phone"
                                                            sampleValue={sampleData.organization_phone}
                                                            onCopy={() => navigator.clipboard.writeText('{organization_phone}')}
                                                        />
                                                        <VariableItem 
                                                            variable="{organization_address}" 
                                                            description="Organization address"
                                                            sampleValue={sampleData.organization_address}
                                                            onCopy={() => navigator.clipboard.writeText('{organization_address}')}
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Recipient</p>
                                                    <div className="space-y-1.5">
                                                        <VariableItem 
                                                            variable="{recipient_name}" 
                                                            description="Recipient name"
                                                            sampleValue={sampleData.recipient_name}
                                                            onCopy={() => navigator.clipboard.writeText('{recipient_name}')}
                                                        />
                                                        <VariableItem 
                                                            variable="{recipient_email}" 
                                                            description="Recipient email"
                                                            sampleValue={sampleData.recipient_email}
                                                            onCopy={() => navigator.clipboard.writeText('{recipient_email}')}
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">System</p>
                                                    <div className="space-y-1.5">
                                                        <VariableItem 
                                                            variable="{current_date}" 
                                                            description="Current date"
                                                            sampleValue={sampleData.current_date}
                                                            onCopy={() => navigator.clipboard.writeText('{current_date}')}
                                                        />
                                                        <VariableItem 
                                                            variable="{current_year}" 
                                                            description="Current year"
                                                            sampleValue={sampleData.current_year}
                                                            onCopy={() => navigator.clipboard.writeText('{current_year}')}
                                                        />
                                                        <VariableItem 
                                                            variable="{unsubscribe_link}" 
                                                            description="Unsubscribe link"
                                                            sampleValue={sampleData.unsubscribe_link}
                                                            onCopy={() => navigator.clipboard.writeText('{unsubscribe_link}')}
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                                                    <p className="text-xs text-blue-800 dark:text-blue-300">
                                                        💡 <strong>Tip:</strong> Variables are automatically replaced in the Preview tab with your actual organization and recipient data
                                                    </p>
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
