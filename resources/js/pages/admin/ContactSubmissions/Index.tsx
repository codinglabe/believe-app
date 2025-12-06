"use client"

import React, { useState } from "react"
import { Head, Link, router } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { 
    Mail, 
    Trash2, 
    Eye,
    Search,
    Filter,
    Clock,
    CheckCircle2,
    MessageSquare,
    Archive,
    User,
} from "lucide-react"
import { motion } from "framer-motion"
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
    } | null
    admin_notes: string | null
    created_at: string
}

interface ContactSubmissionsIndexProps {
    submissions: {
        data: ContactSubmission[]
        links: any[]
        current_page: number
        last_page: number
        from: number
        to: number
        total: number
    }
    stats: {
        total: number
        new: number
        read: number
        replied: number
        archived: number
    }
    filters: {
        status: string
        search: string
    }
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Contact Submissions', href: '/admin/contact-submissions' },
]

export default function AdminContactSubmissionsIndex({ submissions, stats, filters }: ContactSubmissionsIndexProps) {
    const [search, setSearch] = useState(filters.search || '')
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all')
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [submissionToDelete, setSubmissionToDelete] = useState<ContactSubmission | null>(null)

    const handleSearch = (value: string) => {
        setSearch(value)
        router.get('/admin/contact-submissions', {
            search: value,
            status: statusFilter,
        }, {
            preserveState: true,
            replace: true,
        })
    }

    const handleStatusFilter = (value: string) => {
        setStatusFilter(value)
        router.get('/admin/contact-submissions', {
            search: search,
            status: value,
        }, {
            preserveState: true,
            replace: true,
        })
    }

    const handleDelete = (submission: ContactSubmission) => {
        setSubmissionToDelete(submission)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = () => {
        if (!submissionToDelete) return

        router.delete(`/admin/contact-submissions/${submissionToDelete.id}`, {
            onFinish: () => {
                setDeleteDialogOpen(false)
                setSubmissionToDelete(null)
            },
        })
    }

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any; className: string; icon: any; label: string }> = {
            new: {
                variant: 'default',
                className: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
                icon: Clock,
                label: 'New',
            },
            read: {
                variant: 'default',
                className: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
                icon: CheckCircle2,
                label: 'Read',
            },
            replied: {
                variant: 'default',
                className: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
                icon: MessageSquare,
                label: 'Replied',
            },
            archived: {
                variant: 'default',
                className: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700',
                icon: Archive,
                label: 'Archived',
            },
        }

        const config = variants[status] || variants.new
        const Icon = config.icon

        return (
            <Badge variant={config.variant} className={config.className}>
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
            </Badge>
        )
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Contact Submissions" />
            
            <div className="space-y-6 p-4 sm:p-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contact Submissions</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                            Manage and respond to contact form submissions
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                                </div>
                                <Mail className="h-8 w-8 text-gray-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">New</p>
                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.new}</p>
                                </div>
                                <Clock className="h-8 w-8 text-blue-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Read</p>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.read}</p>
                                </div>
                                <CheckCircle2 className="h-8 w-8 text-green-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Replied</p>
                                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.replied}</p>
                                </div>
                                <MessageSquare className="h-8 w-8 text-purple-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Archived</p>
                                    <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.archived}</p>
                                </div>
                                <Archive className="h-8 w-8 text-gray-400" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="Search by name, email, or subject..."
                                    value={search}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={handleStatusFilter}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <Filter className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Filter by Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="new">New</SelectItem>
                                    <SelectItem value="read">Read</SelectItem>
                                    <SelectItem value="replied">Replied</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Submissions List */}
                {submissions.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-16 text-center">
                            <Mail className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No submissions found</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                {search || statusFilter !== 'all' 
                                    ? 'Try adjusting your filters' 
                                    : 'No contact form submissions yet'}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {submissions.data.map((submission, index) => (
                            <motion.div
                                key={submission.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                                <Card className="group h-full flex flex-col hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-200 dark:border-gray-800 overflow-hidden">
                                    {/* Status Indicator Bar */}
                                    <div className={`h-1 ${
                                        submission.status === 'new'
                                            ? 'bg-blue-500'
                                            : submission.status === 'read'
                                            ? 'bg-emerald-500'
                                            : submission.status === 'replied'
                                            ? 'bg-purple-500'
                                            : 'bg-gray-400'
                                    }`} />
                                    
                                    <CardHeader className="pb-4 pt-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className={`h-10 w-10 rounded-lg ${
                                                        submission.status === 'new'
                                                            ? 'bg-blue-100 dark:bg-blue-900/30'
                                                            : submission.status === 'read'
                                                            ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                                            : submission.status === 'replied'
                                                            ? 'bg-purple-100 dark:bg-purple-900/30'
                                                            : 'bg-gray-100 dark:bg-gray-800'
                                                    } flex items-center justify-center shrink-0`}>
                                                        <User className={`h-5 w-5 ${
                                                            submission.status === 'new'
                                                                ? 'text-blue-600 dark:text-blue-400'
                                                                : submission.status === 'read'
                                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                                : submission.status === 'replied'
                                                                ? 'text-purple-600 dark:text-purple-400'
                                                                : 'text-gray-500 dark:text-gray-400'
                                                        }`} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                                                            {submission.first_name} {submission.last_name}
                                                        </h3>
                                                        {getStatusBadge(submission.status)}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                                                    <a 
                                                        href={`mailto:${submission.email}`}
                                                        className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline truncate text-xs"
                                                        title={submission.email}
                                                    >
                                                        {submission.email}
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    
                                    <CardContent className="pt-0 pb-5 flex-1 flex flex-col">
                                        {/* Subject */}
                                        <div className="mb-3">
                                            <Label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                                                Subject
                                            </Label>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">
                                                {submission.subject}
                                            </p>
                                        </div>

                                        {/* Message Preview */}
                                        <div className="mb-4 flex-1">
                                            <Label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                                                Message
                                            </Label>
                                            <div className="p-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-md border border-gray-200 dark:border-gray-700">
                                                <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3 leading-relaxed">
                                                    {submission.message}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Footer - Metadata */}
                                        <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                <Clock className="h-3 w-3" />
                                                <span>
                                                    {new Date(submission.created_at).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </span>
                                                <span className="text-gray-400">•</span>
                                                <span>
                                                    {new Date(submission.created_at).toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            </div>
                                            {submission.read_by && (
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                                    <span className="truncate">
                                                        Read by {submission.read_by.name}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                                            <Link href={`/admin/contact-submissions/${submission.id}`} className="flex-1">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    className="w-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600"
                                                >
                                                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                                                    View
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDelete(submission)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 px-3"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {submissions.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Showing {submissions.from} to {submissions.to} of {submissions.total} submissions
                        </p>
                        <div className="flex gap-2">
                            {submissions.links.map((link: any, index: number) => (
                                <Button
                                    key={index}
                                    variant={link.active ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => link.url && router.get(link.url)}
                                    disabled={!link.url}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Delete Dialog */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Submission</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this submission? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={handleDeleteConfirm}>
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    )
}

