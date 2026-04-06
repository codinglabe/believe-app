"use client"

import { Head } from "@inertiajs/react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Link } from "@inertiajs/react"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/admin/Pagination"
import { router } from "@inertiajs/react"
import { 
    Mail, 
    Users, 
    TrendingUp, 
    Eye, 
    MousePointer, 
    Calendar,
    Plus,
    FileText,
    BarChart3,
    Send,
    Edit,
    Pause,
    Clock,
    CheckCircle,
    XCircle,
    Target,
    Search,
    Filter,
    X,
    Download
} from "lucide-react"

interface Newsletter {
    id: number
    subject: string
    status: 'draft' | 'paused' | 'scheduled' | 'sending' | 'sent' | 'failed'
    scheduled_at?: string
    scheduled_at_formatted?: string
    send_date?: string
    send_date_formatted?: string
    sent_at?: string
    sent_at_formatted?: string
    schedule_type?: 'immediate' | 'scheduled' | 'recurring'
    total_recipients: number
    sent_count: number
    delivered_count: number
    opened_count: number
    clicked_count: number
    template: {
        name: string
    }
    organization: {
        name: string
    }
}

interface Template {
    id: number
    name: string
    template_type: string
    is_active: boolean
}

interface Stats {
    total_newsletters: number
    sent_newsletters: number
    total_recipients: number
    avg_open_rate: number
    avg_click_rate: number
}

interface NewsletterIndexProps {
    newsletters: {
        data: Newsletter[]
        links: any[]
        meta: any
    }
    templates: Template[]
    stats: Stats
}

export default function NewsletterIndex({ newsletters, templates, stats }: NewsletterIndexProps) {
    const [showSuccessMessage, setShowSuccessMessage] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [isSendModalOpen, setIsSendModalOpen] = useState(false)
    const [newsletterToSend, setNewsletterToSend] = useState<Newsletter | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

    useEffect(() => {
        // Check for success message in URL params or flash data
        const urlParams = new URLSearchParams(window.location.search)
        const success = urlParams.get('success')
        if (success) {
            setSuccessMessage(decodeURIComponent(success))
            setShowSuccessMessage(true)
        }
    }, [])

    // Handle search with debounce
    useEffect(() => {
        if (debounceTimer) {
            clearTimeout(debounceTimer)
        }

        const timer = setTimeout(() => {
            const params: any = {}
            if (searchTerm.trim()) {
                params.search = searchTerm.trim()
            }
            if (statusFilter !== 'all') {
                params.status = statusFilter
            }

            router.get(route('newsletter.index'), params, {
                preserveState: true,
                replace: true,
            })
        }, searchTerm ? 500 : 0)

        setDebounceTimer(timer)

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer)
        }
    }, [searchTerm, statusFilter])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
            case 'paused': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
            case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            case 'sending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            case 'sent': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'draft': return <Edit className="h-4 w-4" />
            case 'paused': return <Pause className="h-4 w-4" />
            case 'scheduled': return <Clock className="h-4 w-4" />
            case 'sending': return <Send className="h-4 w-4" />
            case 'sent': return <CheckCircle className="h-4 w-4" />
            case 'failed': return <XCircle className="h-4 w-4" />
            default: return <Edit className="h-4 w-4" />
        }
    }

    // Dates are already formatted in backend with user's timezone - just use them directly

    return (
        <AppSidebarLayout>
            <Head title="Newsletter Management" />
            
            <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 m-10">
                {/* Success Message */}
                {showSuccessMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg flex items-center justify-between"
                    >
                        <div className="flex items-center">
                            <span className="text-green-600 dark:text-green-400 mr-2">✅</span>
                            <span className="font-medium">{successMessage}</span>
                        </div>
                        <button
                            onClick={() => setShowSuccessMessage(false)}
                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 ml-4"
                        >
                            ✕
                        </button>
                    </motion.div>
                )}

                {/* Header */}
                <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2 animate-in slide-in-from-left duration-700">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                            Newsletter Management
                        </h1>
                        <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400">
                            Manage your email marketing campaigns
                        </p>
                    </div>
                    <div className="animate-in slide-in-from-right duration-700 flex gap-3">
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={() => {
                                const params = new URLSearchParams()
                                if (searchTerm) params.append('search', searchTerm)
                                if (statusFilter !== 'all') params.append('status', statusFilter)
                                window.location.href = route('newsletter.export') + (params.toString() ? '?' + params.toString() : '')
                            }}
                            className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                            <Download className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="hidden sm:inline">Export</span>
                            <span className="sm:hidden">Export</span>
                        </Button>
                        <Link href={route('newsletter.create')}>
                            <Button
                                size="lg"
                                variant="outline"
                                className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                            >
                                <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                                <span className="hidden sm:inline">Create Newsletter</span>
                                <span className="sm:hidden">Create</span>
                            </Button>
                        </Link>
                        <Link href={route('newsletter.create-advanced')}>
                            <Button
                                size="lg"
                                className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                            >
                                <Target className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                                <span className="hidden sm:inline">Advanced Create</span>
                                <span className="sm:hidden">Advanced</span>
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                        <CardContent className="p-4 sm:p-6 h-full">
                            <div className="flex flex-col h-full">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                                        <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Newsletters</p>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.total_newsletters}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{stats.sent_newsletters} sent</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                        <CardContent className="p-4 sm:p-6 h-full">
                            <div className="flex flex-col h-full">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                                        <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Recipients</p>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.total_recipients}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Active subscribers</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                        <CardContent className="p-4 sm:p-6 h-full">
                            <div className="flex flex-col h-full">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                                        <Eye className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Avg Open Rate</p>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.avg_open_rate}%</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Industry avg: 21%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                        <CardContent className="p-4 sm:p-6 h-full">
                            <div className="flex flex-col h-full">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-full">
                                        <MousePointer className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Avg Click Rate</p>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.avg_click_rate}%</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Industry avg: 2.6%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-4">
                    <Link href={route('newsletter.templates')}>
                        <Button variant="outline" className="shadow-lg hover:shadow-xl transition-all duration-300">
                            <FileText className="mr-2 h-4 w-4" />
                            Manage Templates
                        </Button>
                    </Link>
                    
                    <Link href={route('newsletter.recipients')}>
                        <Button variant="outline" className="shadow-lg hover:shadow-xl transition-all duration-300">
                            <Users className="mr-2 h-4 w-4" />
                            Manage Recipients
                        </Button>
                    </Link>
                </div>

                {/* Search and Filter */}
                <Card className="shadow-lg">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search newsletters by subject, template, or organization..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-10"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            <div className="w-full sm:w-48">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger>
                                        <Filter className="h-4 w-4 mr-2" />
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="scheduled">Scheduled</SelectItem>
                                        <SelectItem value="sending">Sending</SelectItem>
                                        <SelectItem value="sent">Sent</SelectItem>
                                        <SelectItem value="paused">Paused</SelectItem>
                                        <SelectItem value="failed">Failed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Newsletters */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    Newsletters
                                </CardTitle>
                                <CardDescription>
                                    Your email campaigns and their performance
                                </CardDescription>
                            </div>
                            <div className="text-sm text-gray-500">
                                Showing {newsletters.data.length} of {newsletters.meta?.total || newsletters.data.length}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {newsletters.data.length > 0 ? (
                            <div className="space-y-4">
                                {newsletters.data.map((newsletter) => (
                                    <div key={newsletter.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                                                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                                    {newsletter.subject}
                                                </h3>
                                                <Badge className={`${getStatusColor(newsletter.status)} w-fit flex items-center gap-1`}>
                                                    <span>{getStatusIcon(newsletter.status)}</span>
                                                    <span className="capitalize">{newsletter.status}</span>
                                                </Badge>
                                            </div>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600 dark:text-gray-400">
                                                <span className="truncate">Template: {newsletter.template.name}</span>
                                                <span className="truncate">Recipients: {newsletter.total_recipients}</span>
                                                {newsletter.sent_at_formatted && (
                                                    <span className="truncate">Sent: {newsletter.sent_at_formatted}</span>
                                                )}
                                                {(newsletter.send_date_formatted || newsletter.scheduled_at_formatted) && (
                                                    <span className="truncate">
                                                        Scheduled: {newsletter.send_date_formatted || newsletter.scheduled_at_formatted}
                                                        {newsletter.schedule_type && newsletter.schedule_type !== 'immediate' && (
                                                            <span className="ml-1 text-xs text-gray-500">
                                                                ({newsletter.schedule_type})
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <Link href={route('newsletter.show', newsletter.id)} className="flex-1 sm:flex-none">
                                                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    <span className="hidden sm:inline">View Details</span>
                                                    <span className="sm:hidden">View</span>
                                                </Button>
                                            </Link>
                                            {newsletter.status !== 'sent' && (
                                                <Button 
                                                    size="sm" 
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={() => {
                                                        setNewsletterToSend(newsletter);
                                                        setIsSendModalOpen(true);
                                                    }}
                                                >
                                                    <Send className="h-4 w-4 mr-2" />
                                                    <span className="hidden sm:inline">Send</span>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    No newsletters yet
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    Create your first newsletter to start engaging with your audience
                                </p>
                                <Link href={route('newsletter.create')}>
                                    <Button>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create Newsletter
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pagination */}
                {newsletters.links && newsletters.links.length > 3 && (
                    <div className="flex justify-center mt-6">
                        <Pagination>
                            <PaginationContent>
                                {newsletters.links.map((link: any, index: number) => {
                                    if (link.url === null) {
                                        return (
                                            <PaginationItem key={index}>
                                                <span className="px-3 py-2 text-gray-400 cursor-not-allowed" dangerouslySetInnerHTML={{ __html: link.label }} />
                                            </PaginationItem>
                                        )
                                    }
                                    return (
                                        <PaginationItem key={index}>
                                            <PaginationLink
                                                href={link.url || '#'}
                                                isActive={link.active}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        </PaginationItem>
                                    )
                                })}
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}

                {/* Send Confirmation Modal */}
                <ConfirmationModal
                    isOpen={isSendModalOpen}
                    onChange={setIsSendModalOpen}
                    title="Send Newsletter"
                    description={`Are you sure you want to send "${newsletterToSend?.subject}" immediately? This will override any scheduled time.`}
                    confirmLabel="Send Now"
                    cancelLabel="Cancel"
                    onConfirm={() => {
                        if (newsletterToSend) {
                            const form = document.createElement('form');
                            form.method = 'POST';
                            form.action = route('newsletter.manual-send', newsletterToSend.id);
                            
                            const token = document.createElement('input');
                            token.type = 'hidden';
                            token.name = '_token';
                            token.value = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
                            
                            form.appendChild(token);
                            document.body.appendChild(form);
                            form.submit();
                        }
                    }}
                />
            </div>
        </AppSidebarLayout>
    )
}
