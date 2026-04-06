"use client"

import { Head } from "@inertiajs/react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TextArea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState } from "react"
import { useForm, router } from "@inertiajs/react"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import {
    ArrowLeft,
    Save,
    Send,
    Trash2,
    Mail,
    FileText,
    Eye,
    AlertCircle,
    Code,
    Copy,
    Check
} from "lucide-react"

interface Newsletter {
    id: number
    subject: string
    content: string
    html_content: string
    status: string
    newsletter_template_id: number
    template: {
        id: number
        name: string
        template_type: string
    }
}

interface Template {
    id: number
    name: string
    template_type: string
    is_active: boolean
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

interface NewsletterEditProps {
    newsletter: Newsletter
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
            <div className="flex-1 min-w-0 grow">
                <button
                    type="button"
                    onClick={handleCopy}
                    className="text-left w-full"
                    title={`Click to copy ${variable}`}
                >
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono block mb-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors break-all">
                        {variable}
                    </code>
                    <div className="text-xs text-gray-600 dark:text-gray-400 wrap-break-word">
                        <span>{description}</span>
                        <span className="ml-2 text-gray-500 dark:text-gray-500 break-all">
                            → {sampleValue.length > 50 ? sampleValue.substring(0, 50) + '...' : sampleValue}
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

export default function NewsletterEdit({ newsletter, templates, previewData }: NewsletterEditProps) {
    const [confirmationModal, setConfirmationModal] = useState<{
        isOpen: boolean
        title: string
        description: string
        onConfirm: () => void
    }>({
        isOpen: false,
        title: '',
        description: '',
        onConfirm: () => {}
    })
    const [showPreview, setShowPreview] = useState(false)

    const { data, setData, put, processing, errors, reset } = useForm({
        subject: newsletter.subject,
        content: newsletter.content,
        html_content: newsletter.html_content || '',
        newsletter_template_id: newsletter.newsletter_template_id,
    })

    // Use real data from backend, fallback to demo data if not available
    const sampleData: PreviewData = previewData || {
        organization_name: 'Your Organization',
        organization_email: 'wendhi@stuttiegroup.com',
        organization_phone: '+1 (555) 000-0000',
        organization_address: 'Your Organization Address',
        recipient_name: 'Recipient Name',
        recipient_email: 'recipient@example.com',
        current_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        current_year: new Date().getFullYear().toString(),
        unsubscribe_link: 'https://example.com/unsubscribe?token=preview_token',
        public_view_link: route('newsletter.show', newsletter.id) || 'https://example.com/newsletter/public/preview',
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        put(route('newsletter.update', newsletter.id))
    }

    const handleDelete = () => {
        setConfirmationModal({
            isOpen: true,
            title: 'Delete Newsletter',
            description: `Are you sure you want to delete "${newsletter.subject}"? This action cannot be undone.`,
            onConfirm: () => {
                router.delete(route('newsletter.destroy', newsletter.id))
            }
        })
    }

    const handleSend = () => {
        setConfirmationModal({
            isOpen: true,
            title: 'Send Newsletter',
            description: `Are you sure you want to send "${data.subject}" to all subscribers?`,
            onConfirm: () => {
                router.post(route('newsletter.send', newsletter.id))
            }
        })
    }

    return (
        <AppSidebarLayout>
            <Head title={`Edit Newsletter: ${newsletter.subject}`} />

            <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 m-10">
                {/* Header */}
                <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2 animate-in slide-in-from-left duration-700">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.get(route('newsletter.show', newsletter.id))}
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                                Edit Newsletter
                            </h1>
                        </div>
                        <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400">
                            Update your email campaign content and settings
                        </p>
                    </div>
                    <div className="animate-in slide-in-from-right duration-700">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                                variant="outline"
                                onClick={handleDelete}
                                className="text-red-600 hover:text-red-700 hover:border-red-300"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Delete</span>
                            </Button>
                            <Button
                                onClick={handleSend}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <Send className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Send Now</span>
                                <span className="sm:hidden">Send</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Edit Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Mail className="h-5 w-5" />
                                        Newsletter Content
                                    </CardTitle>
                                    <CardDescription>
                                        Update the subject and content of your newsletter
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="subject">Subject Line</Label>
                                        <Input
                                            id="subject"
                                            type="text"
                                            value={data.subject}
                                            onChange={(e) => setData('subject', e.target.value)}
                                            placeholder="Enter newsletter subject..."
                                            className="mt-1"
                                        />
                                        {errors.subject && (
                                            <p className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                {errors.subject}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="content">Text Content</Label>
                                        <TextArea
                                            id="content"
                                            value={data.content}
                                            onChange={(e) => setData('content', e.target.value)}
                                            placeholder="Enter the text version of your newsletter..."
                                            className="mt-1 min-h-[200px]"
                                        />
                                        {errors.content && (
                                            <p className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                {errors.content}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="html_content">HTML Content (Optional)</Label>
                                        <TextArea
                                            id="html_content"
                                            value={data.html_content}
                                            onChange={(e) => setData('html_content', e.target.value)}
                                            placeholder="Enter the HTML version of your newsletter..."
                                            className="mt-1 min-h-[300px] font-mono text-sm"
                                        />
                                        {errors.html_content && (
                                            <p className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                {errors.html_content}
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Template Selection */}
                            <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Template
                                    </CardTitle>
                                    <CardDescription>
                                        Choose a template for your newsletter
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div>
                                        <Label htmlFor="template">Newsletter Template</Label>
                                        <Select
                                            value={data.newsletter_template_id.toString()}
                                            onValueChange={(value) => setData('newsletter_template_id', parseInt(value))}
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="Select a template" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {templates.map((template) => (
                                                    <SelectItem key={template.id} value={template.id.toString()}>
                                                        {template.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.newsletter_template_id && (
                                            <p className="text-red-500 text-sm mt-1">{errors.newsletter_template_id}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Actions */}
                            <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle>Actions</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Button
                                        type="submit"
                                        disabled={processing || !data.subject || !data.content}
                                        className="w-full"
                                    >
                                        <Save className="h-4 w-4 mr-2" />
                                        {processing ? 'Saving...' : 'Save Changes'}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowPreview(true)}
                                        disabled={!data.subject && !data.content}
                                        className="w-full"
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        Preview
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => router.get(route('newsletter.show', newsletter.id))}
                                        className="w-full"
                                    >
                                        Cancel
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Available Variables */}
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

                            {/* Newsletter Info */}
                            <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle>Newsletter Info</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                                        <span className="text-sm font-medium capitalize">{newsletter.status}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Template:</span>
                                        <span className="text-sm font-medium">{newsletter.template.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Created:</span>
                                        <span className="text-sm font-medium">
                                            {new Date(newsletter.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>

                {/* Confirmation Modal */}
                <ConfirmationModal
                    isOpen={confirmationModal.isOpen}
                    onChange={(open) => setConfirmationModal(prev => ({ ...prev, isOpen: open }))}
                    title={confirmationModal.title}
                    description={confirmationModal.description}
                    confirmLabel="Confirm"
                    cancelLabel="Cancel"
                    onConfirm={confirmationModal.onConfirm}
                    isLoading={processing}
                />

                {/* Preview Modal */}
                <Dialog open={showPreview} onOpenChange={setShowPreview}>
                    <DialogContent className="!max-w-[95vw] !w-[95vw] sm:!max-w-[90vw] sm:!w-[90vw] lg:!max-w-[85vw] lg:!w-[85vw] xl:!max-w-[80vw] xl:!w-[80vw] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Newsletter Preview</DialogTitle>
                            <DialogDescription>
                                Preview how your newsletter will look to recipients
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="border rounded-lg p-6 bg-white dark:bg-gray-800">
                                <div className="mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Subject Preview:</p>
                                    <h3 className="font-semibold text-xl">
                                        {previewSubject || data.subject || 'Newsletter Subject'}
                                    </h3>
                                </div>
                                {previewHtmlContent ? (
                                    <div
                                        className="prose prose-sm max-w-none dark:prose-invert"
                                        dangerouslySetInnerHTML={{ __html: previewHtmlContent }}
                                    />
                                ) : (
                                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                        {previewContent || data.content || 'Newsletter content will appear here...'}
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
