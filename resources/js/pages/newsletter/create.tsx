"use client"

import { Head, router } from "@inertiajs/react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TextArea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm } from "@inertiajs/react"
import { useState } from "react"
import { ArrowLeft, Save, Send, Calendar, Clock, Eye, AlertCircle, Code, Copy, Check } from "lucide-react"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import { getBrowserTimezone, convertUserTimezoneToUTC } from "@/lib/timezone-detection"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Template {
    id: number
    name: string
    subject: string
    content: string
    html_content?: string
    template_type: string
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
    public_view_link: string
}

interface NewsletterCreateProps {
    templates: Template[]
    previewData?: PreviewData
}

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
        <div className="group flex items-start justify-between gap-2 p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded transition-colors w-full">
            <div className="flex-1 min-w-0 flex-grow">
                <button
                    type="button"
                    onClick={handleCopy}
                    className="text-left w-full"
                    title={`Click to copy ${variable}`}
                >
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono block mb-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors break-all">
                        {variable}
                    </code>
                    <div className="text-xs text-gray-600 dark:text-gray-400 break-words">
                        <span>{description}</span>
                        {sampleValue && (
                            <span className="ml-2 text-gray-500 dark:text-gray-500 break-all">
                                → {sampleValue.length > 50 ? sampleValue.substring(0, 50) + '...' : sampleValue}
                            </span>
                        )}
                    </div>
                </button>
            </div>
            <button
                type="button"
                onClick={handleCopy}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0 flex-shrink-0"
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

export default function NewsletterCreate({ templates, previewData }: NewsletterCreateProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
    const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled'>('immediate')
    const [showPreview, setShowPreview] = useState(false)

    const { data, setData, post, processing, errors } = useForm({
        newsletter_template_id: '',
        subject: '',
        content: '',
        html_content: '',
        schedule_type: 'immediate' as 'immediate' | 'scheduled',
        send_date: '',
        target_type: 'all' as 'all',
        target_users: [] as number[],
        target_organizations: [] as number[],
        target_roles: [] as string[],
        is_public: false,
    })

    // Use real data from backend, fallback to demo data if not available
    // Ensure all properties have fallback values to prevent undefined errors
    const sampleData: PreviewData = {
        organization_name: previewData?.organization_name || 'Your Organization',
        organization_email: previewData?.organization_email || 'wendhi@stuttiegroup.com',
        organization_phone: previewData?.organization_phone || '+1 (555) 000-0000',
        organization_address: previewData?.organization_address || 'Your Organization Address',
        recipient_name: previewData?.recipient_name || 'Recipient Name',
        recipient_email: previewData?.recipient_email || 'recipient@example.com',
        current_date: previewData?.current_date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        current_year: previewData?.current_year || new Date().getFullYear().toString(),
        unsubscribe_link: previewData?.unsubscribe_link || 'https://example.com/unsubscribe?token=preview_token',
        public_view_link: previewData?.public_view_link || 'https://example.com/newsletter/public/preview',
    }

    // Function to replace variables with real data
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

    const handleTemplateChange = (templateId: string) => {
        const template = templates.find(t => t.id === parseInt(templateId))
        if (template) {
            setSelectedTemplate(template)
            setData({
                ...data,
                newsletter_template_id: templateId,
                subject: template.subject,
                content: template.content,
                html_content: template.html_content || '',
            })
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        // Prepare submit data
        const submitData: any = {
            ...data,
            schedule_type: scheduleType,
        }

        // Only include send_date if scheduled
        if (scheduleType === 'scheduled') {
            if (!data.send_date) {
                alert('Please select a send date and time for scheduled newsletters.')
                return
            }
            // Convert user's timezone to UTC before sending
            const utcDate = convertUserTimezoneToUTC(data.send_date, getBrowserTimezone())
            submitData.send_date = utcDate.toISOString()
        } else {
            // Remove send_date for immediate
            delete submitData.send_date
        }

        post(route('newsletter.store'), {
            data: submitData,
            onSuccess: () => {
                router.visit(route('newsletter.index'), {
                    only: ['newsletters', 'stats']
                })
            }
        })
    }

    return (
        <AppSidebarLayout>
            <Head title="Create Newsletter" />

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
                                    Create Newsletter
                                </h1>
                                <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400">
                                    Create a new email campaign
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                                {/* Template Selection */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.1 }}
                                >
                                    <Card className="shadow-lg">
                                        <CardHeader>
                                            <CardTitle>Choose Template</CardTitle>
                                            <CardDescription>
                                                Select a template to start your newsletter
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label htmlFor="template">Template</Label>
                                                    <Select value={data.newsletter_template_id} onValueChange={handleTemplateChange}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a template" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {templates.map((template) => (
                                                                <SelectItem key={template.id} value={template.id.toString()}>
                                                                    {template.name} ({template.template_type})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {errors.newsletter_template_id && (
                                                        <p className="text-sm text-red-600 mt-1">{errors.newsletter_template_id}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>

                                {/* Newsletter Content */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                >
                                    <Card className="shadow-lg">
                                        <CardHeader>
                                            <CardTitle>Newsletter Content</CardTitle>
                                            <CardDescription>
                                                Customize your newsletter content
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div>
                                                <Label htmlFor="subject">Subject Line</Label>
                                                <Input
                                                    id="subject"
                                                    value={data.subject}
                                                    onChange={(e) => setData('subject', e.target.value)}
                                                    placeholder="Enter newsletter subject"
                                                    className="mt-1"
                                                />
                                                {errors.subject && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.subject}</p>
                                                )}
                                            </div>

                                            <div>
                                                <Label htmlFor="content">Content</Label>
                                                <TextArea
                                                    id="content"
                                                    value={data.content}
                                                    onChange={(e) => setData('content', e.target.value)}
                                                    placeholder="Enter newsletter content"
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
                                                    placeholder="Enter HTML content for rich formatting"
                                                    rows={10}
                                                    className="mt-1 font-mono text-sm"
                                                />
                                                {errors.html_content && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.html_content}</p>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                {/* Scheduling */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.3 }}
                                >
                                    <Card className="shadow-lg">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Calendar className="h-5 w-5" />
                                                Scheduling
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-3">
                                                <Label>Send Schedule</Label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Button
                                                        type="button"
                                                        variant={scheduleType === 'immediate' ? 'default' : 'outline'}
                                                        onClick={() => {
                                                            setScheduleType('immediate')
                                                            setData('schedule_type', 'immediate')
                                                            setData('send_date', '')
                                                        }}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <Send className="h-4 w-4" />
                                                        Immediate
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant={scheduleType === 'scheduled' ? 'default' : 'outline'}
                                                        onClick={() => {
                                                            setScheduleType('scheduled')
                                                            setData('schedule_type', 'scheduled')
                                                        }}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <Calendar className="h-4 w-4" />
                                                        Scheduled
                                                    </Button>
                                                </div>
                                            </div>

                                            {scheduleType === 'scheduled' && (
                                                <div>
                                                    <Label htmlFor="send_date">Send Date & Time</Label>
                                                    <Input
                                                        id="send_date"
                                                        type="datetime-local"
                                                        value={data.send_date}
                                                        onChange={(e) => setData('send_date', e.target.value)}
                                                        className="mt-1"
                                                        required={scheduleType === 'scheduled'}
                                                    />
                                                    {errors.send_date && (
                                                        <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                                                            <AlertCircle className="h-3 w-3" />
                                                            {errors.send_date}
                                                        </p>
                                                    )}
                                                    {errors.scheduled_at && (
                                                        <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                                                            <AlertCircle className="h-3 w-3" />
                                                            {errors.scheduled_at}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
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
                                        <CardContent className="space-y-3">
                                            <Button
                                                type="submit"
                                                className="w-full"
                                                disabled={processing || !data.newsletter_template_id || !data.subject || !data.content}
                                            >
                                                <Save className="h-4 w-4 mr-2" />
                                                {processing ? 'Creating...' : scheduleType === 'scheduled' ? 'Schedule Newsletter' : 'Save as Draft'}
                                            </Button>

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="w-full"
                                                onClick={() => setShowPreview(true)}
                                                disabled={!data.subject && !data.content}
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                Preview
                                                </Button>
                                        </CardContent>
                                    </Card>
                                </motion.div>

                                {/* Available Variables */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.4 }}
                                >
                                    <Card className="shadow-lg w-full">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Code className="h-4 w-4" />
                                                Available Variables
                                            </CardTitle>
                                            <CardDescription>
                                                Click to copy, use in subject or content
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="w-full max-w-full overflow-x-hidden">
                                            <div className="space-y-3 w-full">
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
                                                        <VariableItem
                                                            variable="{public_view_link}"
                                                            description="Public view link"
                                                            sampleValue={sampleData.public_view_link}
                                                            onCopy={() => navigator.clipboard.writeText('{public_view_link}')}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                                                    <p className="text-xs text-blue-800 dark:text-blue-300">
                                                        💡 <strong>Tip:</strong> Variables are automatically replaced in the Preview with your actual organization and recipient data
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>

                                {/* Newsletter Summary */}
                                {(data.subject || data.content) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: 0.5 }}
                                    >
                                        <Card className="shadow-lg">
                                            <CardHeader>
                                                <CardTitle>Newsletter Summary</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <div>
                                                    <Label className="text-xs text-gray-500">Subject</Label>
                                                    <p className="text-sm font-medium">{data.subject || 'Not set'}</p>
                                                    </div>
                                                <div>
                                                    <Label className="text-xs text-gray-500">Schedule</Label>
                                                    <p className="text-sm font-medium capitalize">{scheduleType}</p>
                                                </div>
                                                {scheduleType === 'scheduled' && data.send_date && (
                                                    <div>
                                                        <Label className="text-xs text-gray-500">Send Date</Label>
                                                        <p className="text-sm font-medium">
                                                            {new Date(data.send_date).toLocaleString()}
                                                        </p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </form>

                    {/* Preview Modal */}
                    <Dialog open={showPreview} onOpenChange={setShowPreview}>
                        <DialogContent className="!max-w-[95vw] !w-[95vw] sm:!max-w-[90vw] sm:!w-[90vw] lg:!max-w-[85vw] lg:!w-[85vw] xl:!max-w-[80vw] xl:!w-[80vw] max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Newsletter Preview</DialogTitle>
                                <DialogDescription>
                                    Preview how your newsletter will look to recipients (variables replaced with real data)
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="border rounded-lg p-6 bg-white dark:bg-gray-800">
                                    <div className="mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Subject Preview:</p>
                                        <h3 className="font-semibold text-xl">
                                            {previewSubject || data.subject || selectedTemplate?.subject || 'Newsletter Subject'}
                                        </h3>
                                    </div>
                                    {previewHtmlContent ? (
                                        <div
                                            className="prose prose-sm max-w-none dark:prose-invert"
                                            dangerouslySetInnerHTML={{ __html: previewHtmlContent }}
                                        />
                                    ) : (
                                        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                            {previewContent || data.content || selectedTemplate?.content || 'Newsletter content will appear here...'}
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
                        </DialogContent>
                    </Dialog>
            </div>
        </AppSidebarLayout>
    )
}
