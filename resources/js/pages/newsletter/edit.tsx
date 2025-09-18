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
import { useState } from "react"
import { useForm, router } from "@inertiajs/react"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import { 
    ArrowLeft,
    Save,
    Send,
    Trash2,
    Mail,
    FileText
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

interface NewsletterEditProps {
    newsletter: Newsletter
    templates: Template[]
}

export default function NewsletterEdit({ newsletter, templates }: NewsletterEditProps) {
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

    const { data, setData, put, processing, errors, reset } = useForm({
        subject: newsletter.subject,
        content: newsletter.content,
        html_content: newsletter.html_content || '',
        newsletter_template_id: newsletter.newsletter_template_id,
    })

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
                                        {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject}</p>}
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
                                        {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content}</p>}
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
                                        {errors.html_content && <p className="text-red-500 text-sm mt-1">{errors.html_content}</p>}
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

                            {/* Actions */}
                            <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle>Actions</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Button 
                                        type="submit" 
                                        disabled={processing}
                                        className="w-full"
                                    >
                                        <Save className="h-4 w-4 mr-2" />
                                        {processing ? 'Saving...' : 'Save Changes'}
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
            </div>
        </AppSidebarLayout>
    )
}
