"use client"

import { Head } from "@inertiajs/react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pagination } from "@/components/admin/Pagination"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { useState, useEffect } from "react"
import { useForm, router } from "@inertiajs/react"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import { 
    Users, 
    Plus, 
    Mail, 
    UserCheck, 
    UserX, 
    AlertTriangle,
    Search,
    Download,
    Upload,
    X
} from "lucide-react"

interface Organization {
    id: number
    name: string
    email: string
    registration_status: 'pending' | 'approved' | 'rejected'
    created_at: string
    user: {
        id: number
        name: string
        email: string
    }
    newsletter_recipients: {
        id: number
        status: 'active' | 'unsubscribed' | 'bounced' | 'complained'
        subscribed_at: string
    }[]
}

interface ManualRecipient {
    id: number
    email: string
    name?: string
    status: 'active' | 'unsubscribed' | 'bounced' | 'complained'
    subscribed_at: string
    unsubscribed_at?: string
}

interface NewsletterRecipientsProps {
    organizations: {
        data: Organization[]
        links: any[]
        meta: any
    }
    manualRecipients: PaginatedData<ManualRecipient>
    stats: {
        total_organizations: number
        active_subscriptions: number
        unsubscribed: number
        bounced: number
        not_subscribed: number
    }
    search?: string
    statusFilter?: string
    manualSearch?: string
}

export default function NewsletterRecipients({ organizations, manualRecipients, stats, search, statusFilter, manualSearch }: NewsletterRecipientsProps) {
    const [showAddForm, setShowAddForm] = useState(false)
    const [searchTerm, setSearchTerm] = useState(search || '')
    const [currentStatusFilter, setCurrentStatusFilter] = useState(statusFilter || 'all')
    const [manualSearchTerm, setManualSearchTerm] = useState(manualSearch || '')
    const [activeTab, setActiveTab] = useState('organizations')
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

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        name: ''
    })

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
            case 'unsubscribed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
            case 'bounced': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
            case 'complained': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
            case 'not_subscribed': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <UserCheck className="h-4 w-4" />
            case 'unsubscribed': return <UserX className="h-4 w-4" />
            case 'bounced': return <AlertTriangle className="h-4 w-4" />
            case 'complained': return <AlertTriangle className="h-4 w-4" />
            case 'not_subscribed': return <Mail className="h-4 w-4" />
            default: return <Users className="h-4 w-4" />
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const handleAddRecipient = (e: React.FormEvent) => {
        e.preventDefault()
        post(route('newsletter.recipients.store'), {
            onSuccess: () => {
                reset()
                setShowAddForm(false)
            }
        })
    }

    const handleSendTest = (email: string) => {
        // For now, show a simple prompt for test email content
        const subject = prompt('Enter test email subject:', 'Test Newsletter Email');
        const content = prompt('Enter test email content:', 'This is a test email from the newsletter system.');
        
        if (subject && content) {
            // Use Inertia to send the test email
            post(route('newsletter.recipients.test-email'), {
                email: email,
                subject: subject,
                content: content
            });
        }
    }

    const handleSubscribe = (orgId: number, email: string) => {
        setConfirmationModal({
            isOpen: true,
            title: 'Subscribe to Newsletter',
            description: `Are you sure you want to subscribe ${email} to the newsletter?`,
            onConfirm: () => {
                post(route('newsletter.recipients.subscribe', orgId));
            }
        });
    }

    const handleUnsubscribe = (orgId: number, email: string) => {
        setConfirmationModal({
            isOpen: true,
            title: 'Unsubscribe from Newsletter',
            description: `Are you sure you want to unsubscribe ${email} from the newsletter?`,
            onConfirm: () => {
                post(route('newsletter.recipients.unsubscribe', orgId));
            }
        });
    }

    const handleManualSubscribe = (recipientId: number, email: string) => {
        setConfirmationModal({
            isOpen: true,
            title: 'Subscribe to Newsletter',
            description: `Are you sure you want to subscribe ${email} to the newsletter?`,
            onConfirm: () => {
                post(route('newsletter.recipients.manual.subscribe', recipientId));
            }
        });
    }

    const handleManualUnsubscribe = (recipientId: number, email: string) => {
        setConfirmationModal({
            isOpen: true,
            title: 'Unsubscribe from Newsletter',
            description: `Are you sure you want to unsubscribe ${email} from the newsletter?`,
            onConfirm: () => {
                post(route('newsletter.recipients.manual.unsubscribe', recipientId));
            }
        });
    }

    const handleManualSearchChange = (value: string) => {
        setManualSearchTerm(value);
    }

    const clearManualSearch = () => {
        setManualSearchTerm('');
        router.get(route('newsletter.recipients'), {
            search: searchTerm,
            status_filter: currentStatusFilter,
        });
    }

    const handleExport = () => {
        // Include current search and filter parameters in export
        const params = new URLSearchParams();
        if (searchTerm && searchTerm.trim() !== '') {
            params.append('search', searchTerm.trim());
        }
        if (currentStatusFilter && currentStatusFilter !== 'all') {
            params.append('status_filter', currentStatusFilter);
        }
        
        const url = route('newsletter.recipients.export') + (params.toString() ? '?' + params.toString() : '');
        window.location.href = url;
    }

    const handleImport = () => {
        // Create a file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.txt';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                
                // Use Inertia to upload the file
                router.post(route('newsletter.recipients.import'), formData, {
                    forceFormData: true,
                    onSuccess: () => {
                        // Refresh the page to show imported recipients
                        window.location.reload();
                    }
                });
            }
        };
        input.click();
    }

    // Apply search and filter when they change (only for organizations tab)
    useEffect(() => {
        if (activeTab !== 'organizations') return;
        
        const timeoutId = setTimeout(() => {
            // Only include parameters that have meaningful values
            const params: any = {};
            
            if (searchTerm && searchTerm.trim() !== '') {
                params.search = searchTerm.trim();
            }
            
            if (currentStatusFilter && currentStatusFilter !== 'all') {
                params.status_filter = currentStatusFilter;
            }

            router.get(route('newsletter.recipients'), params, {
                preserveState: true,
                replace: true
            });
        }, searchTerm ? 500 : 0); // 500ms delay for search, immediate for filter

        return () => clearTimeout(timeoutId);
    }, [searchTerm, currentStatusFilter, activeTab]);

    // Apply manual search when it changes (only for manual tab)
    useEffect(() => {
        if (activeTab !== 'manual') return;
        
        const timeoutId = setTimeout(() => {
            const params: any = {};
            if (searchTerm && searchTerm.trim() !== '') {
                params.search = searchTerm.trim();
            }
            if (currentStatusFilter && currentStatusFilter !== 'all') {
                params.status_filter = currentStatusFilter;
            }
            if (manualSearchTerm && manualSearchTerm.trim() !== '') {
                params.manual_search = manualSearchTerm.trim();
            }

            router.get(route('newsletter.recipients'), params, {
                preserveState: true,
                replace: true
            });
        }, manualSearchTerm ? 500 : 0);

        return () => clearTimeout(timeoutId);
    }, [manualSearchTerm, activeTab]);

    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
    };

    const handleStatusFilterChange = (value: string) => {
        setCurrentStatusFilter(value);
    };

    const clearSearch = () => {
        setSearchTerm('');
        setCurrentStatusFilter('all');
        // Immediately clear the URL parameters
        router.get(route('newsletter.recipients'), {}, {
            preserveState: true,
            replace: true
        });
    };

    return (
        <AppSidebarLayout>
            <Head title="Newsletter Recipients" />
            
            <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 m-10">
                {/* Header */}
                <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2 animate-in slide-in-from-left duration-700">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                            Organization Recipients
                        </h1>
                        <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400">
                            View all organizations and their newsletter subscription status
                        </p>
                    </div>
                    <div className="animate-in slide-in-from-right duration-700">
                        <div className="flex items-center gap-2">
                            <Button 
                                onClick={handleExport}
                                variant="outline" 
                                className="shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </Button>
                            <Button 
                                onClick={handleImport}
                                variant="outline" 
                                className="shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                Import
                            </Button>
                            <Button 
                                onClick={() => window.location.href = route('newsletter.create')}
                                variant="outline"
                                className="shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                            >
                                <Mail className="h-4 w-4 mr-2" />
                                Create Newsletter
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
                    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                        <CardContent className="p-4 sm:p-6 h-full">
                            <div className="flex flex-col h-full">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                                        <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Organizations</p>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.total_organizations}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                        <CardContent className="p-4 sm:p-6 h-full">
                            <div className="flex flex-col h-full">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                                        <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Subscribed</p>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.active_subscriptions}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                        <CardContent className="p-4 sm:p-6 h-full">
                            <div className="flex flex-col h-full">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                                        <Mail className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Not Subscribed</p>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.not_subscribed}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                        <CardContent className="p-4 sm:p-6 h-full">
                            <div className="flex flex-col h-full">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full">
                                        <UserX className="h-6 w-6 text-red-600 dark:text-red-400" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Unsubscribed</p>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.unsubscribed}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                        <CardContent className="p-4 sm:p-6 h-full">
                            <div className="flex flex-col h-full">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-full">
                                        <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Bounced</p>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.bounced}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Add Recipient Form */}
                {showAddForm && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mb-6"
                    >
                        <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
                            <CardHeader>
                                <CardTitle>Add New Recipient</CardTitle>
                                <CardDescription>
                                    Add a new email subscriber to your newsletter
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleAddRecipient} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="email">Email Address</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={data.email}
                                                onChange={(e) => setData('email', e.target.value)}
                                                placeholder="recipient@example.com"
                                                className="mt-1"
                                                required
                                            />
                                            {errors.email && (
                                                <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                                            )}
                                        </div>

                                        <div>
                                            <Label htmlFor="name">Name (Optional)</Label>
                                            <Input
                                                id="name"
                                                value={data.name}
                                                onChange={(e) => setData('name', e.target.value)}
                                                placeholder="John Doe"
                                                className="mt-1"
                                            />
                                            {errors.name && (
                                                <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button type="submit" disabled={processing}>
                                            {processing ? 'Adding...' : 'Add Recipient'}
                                        </Button>
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            onClick={() => {
                                                setShowAddForm(false)
                                                reset()
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Search and Filters */}

                {/* Tabs for Organizations and Manual Recipients */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2">
                        <TabsTrigger value="organizations" className="text-xs sm:text-sm">
                            <span className="hidden sm:inline">Organizations</span>
                            <span className="sm:hidden">Orgs</span>
                            <span className="ml-1">({organizations.data.length})</span>
                        </TabsTrigger>
                        <TabsTrigger value="manual" className="text-xs sm:text-sm">
                            <span className="hidden sm:inline">Manual Recipients</span>
                            <span className="sm:hidden">Manual</span>
                            <span className="ml-1">({manualRecipients.data.length})</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="organizations" className="mt-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.6 }}
                        >
                            {/* Organizations Search and Filter */}
                            <Card className="mb-6">
                                <CardContent className="p-4 sm:p-6">
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="flex-1">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <Input
                                                    placeholder="Search organizations by name, email, or contact person..."
                                                    value={searchTerm}
                                                    onChange={(e) => handleSearchChange(e.target.value)}
                                                    className="pl-10 pr-10 text-sm sm:text-base"
                                                />
                                                {searchTerm && (
                                                    <button
                                                        onClick={clearSearch}
                                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="w-full sm:w-64">
                                            <Select value={currentStatusFilter} onValueChange={handleStatusFilterChange}>
                                                <SelectTrigger className="text-sm sm:text-base">
                                                    <SelectValue placeholder="Filter by status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Organizations</SelectItem>
                                                    <SelectItem value="subscribed">Subscribed</SelectItem>
                                                    <SelectItem value="not_subscribed">Not Subscribed</SelectItem>
                                                    <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                                                    <SelectItem value="bounced">Bounced</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Organizations ({organizations.data.length})</CardTitle>
                                    <CardDescription>
                                        View all organizations and their newsletter subscription status
                                    </CardDescription>
                                </CardHeader>
                        <CardContent>
                            {organizations.data.length > 0 ? (
                                <div className="space-y-4">
                                    {organizations.data.map((org) => {
                                        const subscription = org.newsletter_recipients?.[0];
                                        const subscriptionStatus = subscription?.status || 'not_subscribed';
                                        
                                        return (
                                            <div key={org.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors gap-4">
                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                                                        {org.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-medium text-gray-900 dark:text-white truncate">
                                                            {org.name}
                                                        </div>
                                                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                                            {org.email}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-500">
                                                            <span className="hidden sm:inline">Contact: {org.user?.name || 'No contact name'} • </span>
                                                            <span>Reg: {org.registration_status} • {formatDate(org.created_at)}</span>
                                                        </div>
                                                        {subscription && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                                {subscriptionStatus === 'active' ? 'Subscribed' : 'Unsubscribed'} {formatDate(subscription.subscribed_at)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                                                    <Badge className={`${getStatusColor(subscriptionStatus)} w-fit`}>
                                                        {getStatusIcon(subscriptionStatus)}
                                                        <span className="ml-1 text-xs">
                                                            {subscriptionStatus === 'not_subscribed' ? 'Not Subscribed' : subscriptionStatus}
                                                        </span>
                                                    </Badge>
                                                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            onClick={() => handleSendTest(org.email)}
                                                            className="flex-1 sm:flex-none text-xs"
                                                        >
                                                            <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                                            <span className="hidden sm:inline">Send Test</span>
                                                            <span className="sm:hidden">Test</span>
                                                        </Button>
                                                        {subscriptionStatus === 'not_subscribed' && (
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm"
                                                                onClick={() => handleSubscribe(org.id, org.email)}
                                                                className="flex-1 sm:flex-none text-xs"
                                                            >
                                                                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                                                <span className="hidden sm:inline">Subscribe</span>
                                                                <span className="sm:hidden">Sub</span>
                                                            </Button>
                                                        )}
                                                        {subscriptionStatus === 'active' && (
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm"
                                                                onClick={() => handleUnsubscribe(org.id, org.email)}
                                                                className="flex-1 sm:flex-none text-xs text-red-600 hover:text-red-700 hover:border-red-300"
                                                            >
                                                                <UserX className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                                                <span className="hidden sm:inline">Unsubscribe</span>
                                                                <span className="sm:hidden">Unsub</span>
                                                            </Button>
                                                        )}
                                                        {subscriptionStatus === 'unsubscribed' && (
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm"
                                                                onClick={() => handleSubscribe(org.id, org.email)}
                                                                className="flex-1 sm:flex-none text-xs text-green-600 hover:text-green-700 hover:border-green-300"
                                                            >
                                                                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                                                <span className="hidden sm:inline">Subscribe Again</span>
                                                                <span className="sm:hidden">Resub</span>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        No organizations found
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                                        {searchTerm || currentStatusFilter !== 'all' ? 'No organizations found matching your search criteria' : 'No organizations have registered yet'}
                                    </p>
                                </div>
                            )}
                            </CardContent>
                        </Card>
                        
                        {/* Organizations Pagination */}
                        {organizations.data.length > 0 && (
                            <div className="mt-6">
                                <Pagination links={organizations.links} />
                            </div>
                        )}
                    </motion.div>
                    </TabsContent>

                    <TabsContent value="manual" className="mt-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.6 }}
                        >
                            {/* Add New Recipient Form - Always Visible in Manual Tab */}
                            <Card className="mb-6">
                                <CardHeader>
                                    <CardTitle>Add New Recipient</CardTitle>
                                    <CardDescription>
                                        Add a new manual recipient to the newsletter
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleAddRecipient} className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="email">Email Address</Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    value={data.email}
                                                    onChange={(e) => setData('email', e.target.value)}
                                                    placeholder="recipient@example.com"
                                                    className="mt-1"
                                                />
                                                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                                            </div>
                                            <div>
                                                <Label htmlFor="name">Name (Optional)</Label>
                                                <Input
                                                    id="name"
                                                    type="text"
                                                    value={data.name}
                                                    onChange={(e) => setData('name', e.target.value)}
                                                    placeholder="Recipient Name"
                                                    className="mt-1"
                                                />
                                                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                                            </div>
                                        </div>
                                        <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                                            {processing ? 'Adding...' : 'Add Recipient'}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* Manual Recipients Search */}
                            <Card className="mb-6">
                                <CardContent className="p-4 sm:p-6">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            placeholder="Search manual recipients by email or name..."
                                            value={manualSearchTerm}
                                            onChange={(e) => handleManualSearchChange(e.target.value)}
                                            className="pl-10 pr-10 text-sm sm:text-base"
                                        />
                                        {manualSearchTerm && (
                                            <button
                                                onClick={clearManualSearch}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Manual Recipients ({manualRecipients.data.length})</CardTitle>
                                    <CardDescription>
                                        Recipients added manually by admin
                                    </CardDescription>
                                </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {manualRecipients.data.map((recipient) => (
                                        <div key={recipient.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors gap-4">
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                                                    {recipient.email.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-medium text-gray-900 dark:text-white truncate">
                                                        {recipient.email}
                                                    </div>
                                                    {recipient.name && (
                                                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                                            {recipient.name}
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-gray-500 dark:text-gray-500">
                                                        {recipient.status === 'active' ? 'Subscribed' : 'Unsubscribed'} {formatDate(recipient.subscribed_at)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                                                <Badge className={`${getStatusColor(recipient.status)} w-fit`}>
                                                    {getStatusIcon(recipient.status)}
                                                    <span className="ml-1 text-xs">{recipient.status}</span>
                                                </Badge>
                                                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        onClick={() => handleSendTest(recipient.email)}
                                                        className="flex-1 sm:flex-none text-xs"
                                                    >
                                                        <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                                        <span className="hidden sm:inline">Send Test</span>
                                                        <span className="sm:hidden">Test</span>
                                                    </Button>
                                                    {recipient.status === 'active' && (
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            onClick={() => handleManualUnsubscribe(recipient.id, recipient.email)}
                                                            className="flex-1 sm:flex-none text-xs text-red-600 hover:text-red-700 hover:border-red-300"
                                                        >
                                                            <UserX className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                                            <span className="hidden sm:inline">Unsubscribe</span>
                                                            <span className="sm:hidden">Unsub</span>
                                                        </Button>
                                                    )}
                                                    {recipient.status === 'unsubscribed' && (
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            onClick={() => handleManualSubscribe(recipient.id, recipient.email)}
                                                            className="flex-1 sm:flex-none text-xs text-green-600 hover:text-green-700 hover:border-green-300"
                                                        >
                                                            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                                            <span className="hidden sm:inline">Subscribe Again</span>
                                                            <span className="sm:hidden">Resub</span>
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                        
                        {/* Manual Recipients Pagination */}
                        {manualRecipients.data.length > 0 && (
                            <div className="mt-6">
                                <Pagination links={manualRecipients.links} />
                            </div>
                        )}
                    </motion.div>
                    </TabsContent>
                </Tabs>
            </div>

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
        </AppSidebarLayout>
    )
}
