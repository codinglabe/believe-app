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
import { ArrowLeft, Save, Send, Calendar } from "lucide-react"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"

interface Template {
    id: number
    name: string
    subject: string
    content: string
    html_content?: string
    template_type: string
}

interface NewsletterCreateProps {
    templates: Template[]
}

export default function NewsletterCreate({ templates }: NewsletterCreateProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
    const [isScheduled, setIsScheduled] = useState(false)

    const { data, setData, post, processing, errors } = useForm({
        newsletter_template_id: '',
        subject: '',
        content: '',
        html_content: '',
        scheduled_at: ''
    })

    const handleTemplateChange = (templateId: string) => {
        const template = templates.find(t => t.id === parseInt(templateId))
        if (template) {
            setSelectedTemplate(template)
            setData({
                newsletter_template_id: templateId,
                subject: template.subject,
                content: template.content,
                html_content: template.html_content || '',
                scheduled_at: ''
            })
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        post(route('newsletter.store'))
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
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id="schedule"
                                                    checked={isScheduled}
                                                    onChange={(e) => setIsScheduled(e.target.checked)}
                                                    className="rounded"
                                                />
                                                <Label htmlFor="schedule">Schedule for later</Label>
                                            </div>

                                            {isScheduled && (
                                                <div>
                                                    <Label htmlFor="scheduled_at">Send Date & Time</Label>
                                                    <Input
                                                        id="scheduled_at"
                                                        type="datetime-local"
                                                        value={data.scheduled_at}
                                                        onChange={(e) => setData('scheduled_at', e.target.value)}
                                                        className="mt-1"
                                                        min={new Date().toISOString().slice(0, 16)}
                                                    />
                                                    {errors.scheduled_at && (
                                                        <p className="text-sm text-red-600 mt-1">{errors.scheduled_at}</p>
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
                                                disabled={processing}
                                            >
                                                <Save className="h-4 w-4 mr-2" />
                                                {isScheduled ? 'Schedule Newsletter' : 'Save as Draft'}
                                            </Button>

                                            {!isScheduled && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="w-full"
                                                    onClick={() => {
                                                        setIsScheduled(false)
                                                        post(route('newsletter.store'), {
                                                            data: { ...data, send_immediately: true }
                                                        })
                                                    }}
                                                    disabled={processing}
                                                >
                                                    <Send className="h-4 w-4 mr-2" />
                                                    Send Now
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>

                                {/* Preview */}
                                {selectedTemplate && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: 0.5 }}
                                    >
                                        <Card className="shadow-lg">
                                            <CardHeader>
                                                <CardTitle>Template Preview</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
                                                    <h3 className="font-semibold text-lg mb-2">
                                                        {data.subject || selectedTemplate.subject}
                                                    </h3>
                                                    <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                                        {data.content || selectedTemplate.content}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </form>
            </div>
        </AppSidebarLayout>
    )
}
