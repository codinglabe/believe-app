"use client"

import React from "react"
import { Head, Link, useForm } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
    ArrowLeft,
    Mail,
    Clock,
    CheckCircle2,
    MessageSquare,
    Archive,
    Save,
} from "lucide-react"
import type { BreadcrumbItem } from "@/types"

interface ContactSubmission {
    id: number
    first_name: string
    last_name: string
    email: string
    subject: string
    message: string
    status: 'new' | 'read' | 'replied' | 'archived'
    read_at: string | null
    read_by: {
        id: number
        name: string
        email: string
    } | null
    admin_notes: string | null
    reply_message: string | null
    created_at: string
    updated_at: string
}

interface ContactSubmissionShowProps {
    submission: ContactSubmission
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Contact Submissions', href: '/admin/contact-submissions' },
    { title: 'View Submission', href: '#' },
]

export default function AdminContactSubmissionShow({ submission }: ContactSubmissionShowProps) {
    const { data, setData, put, processing, errors } = useForm({
        status: submission.status,
        admin_notes: submission.admin_notes || '',
        reply_message: submission.reply_message || '',
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        put(`/admin/contact-submissions/${submission.id}/status`, {
            onSuccess: () => {
                // Optionally show success message
            },
        })
    }

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { className: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
            new: {
                className: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
                icon: Clock,
                label: 'New',
            },
            read: {
                className: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
                icon: CheckCircle2,
                label: 'Read',
            },
            replied: {
                className: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
                icon: MessageSquare,
                label: 'Replied',
            },
            archived: {
                className: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700',
                icon: Archive,
                label: 'Archived',
            },
        }

        const config = variants[status] || variants.new
        const Icon = config.icon

        return (
            <Badge variant="outline" className={config.className}>
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
            </Badge>
        )
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Contact Submission - ${submission.subject}`} />
            
            <div className="space-y-6 p-4 sm:p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/contact-submissions">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contact Submission</h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                                View and manage submission details
                            </p>
                        </div>
                    </div>
                    {getStatusBadge(submission.status)}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Submission Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Mail className="h-5 w-5" />
                                    Submission Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm text-gray-600 dark:text-gray-400">Name</Label>
                                        <p className="font-semibold text-gray-900 dark:text-white mt-1">
                                            {submission.first_name} {submission.last_name}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-sm text-gray-600 dark:text-gray-400">Email</Label>
                                        <p className="font-semibold text-gray-900 dark:text-white mt-1 flex items-center gap-2">
                                            <Mail className="h-4 w-4" />
                                            <a href={`mailto:${submission.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                                                {submission.email}
                                            </a>
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-sm text-gray-600 dark:text-gray-400">Subject</Label>
                                    <p className="font-semibold text-gray-900 dark:text-white mt-1">
                                        {submission.subject}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-sm text-gray-600 dark:text-gray-400">Message</Label>
                                    <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                                            {submission.message}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <div>
                                        <Label className="text-sm text-gray-600 dark:text-gray-400">Submitted</Label>
                                        <p className="text-sm text-gray-900 dark:text-white mt-1">
                                            {new Date(submission.created_at).toLocaleString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                    {submission.read_by && (
                                        <div>
                                            <Label className="text-sm text-gray-600 dark:text-gray-400">Read By</Label>
                                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                                                {submission.read_by.name}
                                                {submission.read_at && (
                                                    <span className="text-gray-500 ml-2">
                                                        ({new Date(submission.read_at).toLocaleDateString()})
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Status Management */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Manage Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="status">Status</Label>
                                        <Select value={data.status} onValueChange={(value) => setData('status', value as 'new' | 'read' | 'replied' | 'archived')}>
                                            <SelectTrigger id="status">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="new">New</SelectItem>
                                                <SelectItem value="read">Read</SelectItem>
                                                <SelectItem value="replied">Replied</SelectItem>
                                                <SelectItem value="archived">Archived</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="admin_notes">Admin Notes</Label>
                                        <Textarea
                                            id="admin_notes"
                                            value={data.admin_notes}
                                            onChange={(e) => setData('admin_notes', e.target.value)}
                                            placeholder="Add internal notes about this submission..."
                                            rows={4}
                                            className={errors.admin_notes ? 'border-red-500' : ''}
                                        />
                                        {errors.admin_notes && (
                                            <p className="text-sm text-red-500">{errors.admin_notes}</p>
                                        )}
                                    </div>
                                    {data.status === 'replied' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="reply_message">
                                                Reply Message <span className="text-red-500">*</span>
                                            </Label>
                                            <Textarea
                                                id="reply_message"
                                                value={data.reply_message}
                                                onChange={(e) => setData('reply_message', e.target.value)}
                                                placeholder="Enter your reply message to send to the submitter..."
                                                rows={6}
                                                className={errors.reply_message ? 'border-red-500' : ''}
                                                required
                                            />
                                            {errors.reply_message && (
                                                <p className="text-sm text-red-500">{errors.reply_message}</p>
                                            )}
                                            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                                                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                                    This message will be sent via email to <strong>{submission.email}</strong> when you save.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <Button type="submit" disabled={processing} className="w-full">
                                        {processing ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4 mr-2" />
                                                Save Changes
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}

