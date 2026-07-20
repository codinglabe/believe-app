"use client"

import { Head, router, usePage } from "@inertiajs/react"
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
    Mail, 
    RefreshCw, 
    Trash2, 
    Send, 
    CheckCircle2, 
    Loader2,
    Users,
    Search,
    Check,
    Package,
    Send as SendIcon,
    TrendingUp,
    Shield,
    Link2,
} from "lucide-react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { useDebounce } from "@/hooks/useDebounce"
import { brandButtonClass, brandTextGradientClass, brandPackageSelectedClass } from "@/lib/brand-styles"
import { cn } from "@/lib/utils"

/** Matches Feedback & Rewards / site-title purple→blue card chrome */
const sectionCardClass = "gap-0 overflow-hidden border-purple-500/15 bg-white py-0 px-0 shadow-sm dark:bg-transparent dark:border-purple-500/20"
const statCardClass = "gap-0 border-purple-500/15 bg-white py-0 shadow-sm dark:bg-transparent dark:border-purple-500/20"
const sectionHeaderClass = "border-b border-purple-500/10 bg-gradient-to-r from-purple-500/[0.04] to-blue-500/[0.04] px-6 py-5"
const brandOutlineBtn =
    "border border-purple-500/40 text-purple-600 hover:bg-purple-500/10 dark:text-purple-400 dark:border-purple-400/35"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface EmailConnection {
    id: number
    provider: 'gmail' | 'outlook'
    email: string | null
    is_active: boolean
    is_syncing: boolean
    last_synced_at: string | null
    contacts_count: number
}

interface EmailContact {
    id: number
    email: string
    name: string | null
    invite_sent: boolean
    invite_sent_at: string | null
    has_joined: boolean
    email_connection?: {
        provider: string
    }
}

interface PaginatedContacts {
    data: EmailContact[]
    current_page: number
    last_page: number
    per_page: number
    total: number
    from?: number
    to?: number
    prev_page_url?: string | null
    next_page_url?: string | null
}

interface EmailPackage {
    id: number
    name: string
    description: string | null
    emails_count: number
    price: number
}

interface EmailInviteIndexProps {
    connections: EmailConnection[]
    contacts: PaginatedContacts
    filters?: {
        search: string
        provider: string
        registration?: string
        per_page: number
        page: number
    }
    emailStats?: {
        emails_included: number
        emails_used: number
        emails_left: number
    }
    emailPackages?: EmailPackage[]
}

export default function EmailInviteIndex({ connections, contacts: initialContacts, filters: initialFilters, emailStats, emailPackages = [] }: EmailInviteIndexProps) {
    const { flash } = usePage().props as any
    const [selectedContacts, setSelectedContacts] = useState<number[]>([])
    const [searchTerm, setSearchTerm] = useState(initialFilters?.search || "")
    const [providerFilter, setProviderFilter] = useState<string>(initialFilters?.provider || "all")
    const [registrationFilter, setRegistrationFilter] = useState<string>(initialFilters?.registration || "all")
    const [customMessage, setCustomMessage] = useState("")
    const [contacts, setContacts] = useState(initialContacts)
    const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)
    const [connectionToDisconnect, setConnectionToDisconnect] = useState<number | null>(null)
    const [deleteContactDialogOpen, setDeleteContactDialogOpen] = useState(false)
    const [contactToDelete, setContactToDelete] = useState<number | null>(null)
    const [isDeletingContact, setIsDeletingContact] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [allContacts, setAllContacts] = useState(initialContacts?.data || [])
    const [currentPage, setCurrentPage] = useState(initialContacts?.current_page || 1)
    const [hasMore, setHasMore] = useState((initialContacts?.current_page || 0) < (initialContacts?.last_page || 0))
    const [isSendingInvites, setIsSendingInvites] = useState(false)
    const [buyEmailsModalOpen, setBuyEmailsModalOpen] = useState(false)
    const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null)
    const [isPurchasing, setIsPurchasing] = useState(false)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    // Initialize syncing state from connections - persists across page reloads
    const [syncingConnections, setSyncingConnections] = useState<Set<number>>(
        new Set(connections.filter(c => c.is_syncing).map(c => c.id))
    )

    // Load more contacts when scrolling
    const loadMoreContacts = useCallback(() => {
        if (loadingMore || !hasMore) return

        setLoadingMore(true)
        const nextPage = currentPage + 1

        // Build params object, only include search if it has a value
        const params: {
            page: number
            per_page: number
            provider: string
            registration: string
            search?: string
        } = {
            page: nextPage,
            per_page: initialContacts.per_page,
            provider: providerFilter,
            registration: registrationFilter,
        }
        
        // Only add search parameter if it has a value
        if (searchTerm && searchTerm.trim()) {
            params.search = searchTerm.trim()
        }

        router.get(route('email-invite.index'), params, {
            preserveState: true,
            preserveScroll: true,
            only: ['contacts'],
            onSuccess: (page) => {
                const newContacts = (page.props as any).contacts as PaginatedContacts
                setAllContacts(prev => [...prev, ...newContacts.data])
                setCurrentPage(newContacts.current_page)
                setHasMore(newContacts.current_page < newContacts.last_page)
                setLoadingMore(false)
            },
            onError: () => {
                setLoadingMore(false)
            },
        })
    }, [loadingMore, hasMore, currentPage, initialContacts.per_page, searchTerm, providerFilter, registrationFilter])

    // Handle scroll event for infinite scroll
    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container
            // Load more when user scrolls to within 200px of the bottom
            if (scrollHeight - scrollTop - clientHeight < 200) {
                loadMoreContacts()
            }
        }

        container.addEventListener('scroll', handleScroll)
        return () => container.removeEventListener('scroll', handleScroll)
    }, [loadMoreContacts])

    // Update contacts when props change (after sync/reload)
    // Only reset if it's a full reload (page 1), otherwise keep appending
    useEffect(() => {
        if (initialContacts) {
        setContacts(initialContacts)
        }
        
        // Update syncing connections from props (for page reload persistence)
        const syncingIds = new Set(connections.filter(c => c.is_syncing).map(c => c.id))
        setSyncingConnections(syncingIds)
        
        // Only reset allContacts if we're on page 1 (full reload/sync)
        // For page > 1, loadMoreContacts handles appending, so don't reset here
        if (initialContacts && initialContacts.current_page === 1) {
            setAllContacts(initialContacts.data || [])
            setCurrentPage(initialContacts.current_page)
            setHasMore(initialContacts.current_page < initialContacts.last_page)
        } else if (initialContacts && initialContacts.current_page === currentPage + 1) {
            // This is a "load more" operation - loadMoreContacts already handled appending
            // Just update pagination state, don't touch allContacts
            setCurrentPage(initialContacts.current_page)
            setHasMore(initialContacts.current_page < initialContacts.last_page)
        }
        // If the page doesn't match expected progression, it might be a manual navigation
        // In that case, we don't update anything to avoid conflicts
    }, [initialContacts, currentPage, connections])


    // Flash toasts shown by app-layout; do not duplicate here.

    // Debounced search function
    const performSearch = useCallback((value: string) => {
        setLoadingMore(true)
        
        const params: {
            page: number
            per_page: number
            provider: string
            registration: string
            search?: string
        } = {
            page: 1, // Reset to first page when searching
            per_page: initialContacts.per_page,
            provider: providerFilter,
            registration: registrationFilter,
        }
        
        if (value && value.trim()) {
            params.search = value.trim()
        }
        
        router.get(route('email-invite.index'), params, {
            preserveState: false,
            preserveScroll: false,
            only: ['contacts', 'filters'],
            onFinish: () => setLoadingMore(false),
        })
    }, [initialContacts.per_page, providerFilter, registrationFilter])

    // Create debounced search function with 500ms delay
    const debouncedSearch = useDebounce(performSearch, 500)

    // Handle search input change
    const handleSearch = (value: string) => {
        setSearchTerm(value)
        debouncedSearch(value)
    }

    // Debounced filter function
    const performFilter = useCallback((provider: string, registration: string) => {
        setLoadingMore(true)
        
        const params: {
            page: number
            per_page: number
            provider: string
            registration: string
            search?: string
        } = {
            page: 1,
            per_page: initialContacts.per_page,
            provider,
            registration,
        }
        
        if (searchTerm && searchTerm.trim()) {
            params.search = searchTerm.trim()
        }
        
        router.get(route('email-invite.index'), params, {
            preserveState: false,
            preserveScroll: false,
            only: ['contacts', 'filters'],
            onFinish: () => setLoadingMore(false),
        })
    }, [initialContacts.per_page, searchTerm])

    // Create debounced filter function with 300ms delay (shorter than search since it's a dropdown)
    const debouncedFilter = useDebounce(performFilter, 300)

    // Handle provider filter change
    const handleProviderFilterChange = (value: string) => {
        setProviderFilter(value)
        debouncedFilter(value, registrationFilter)
    }

    // Handle registration status filter change
    const handleRegistrationFilterChange = (value: string) => {
        setRegistrationFilter(value)
        debouncedFilter(providerFilter, value)
    }

    // Filter out already sent invites (for selection) - backend already filtered by search/provider
    const availableContacts = useMemo(() => {
        return allContacts.filter(c => !c.invite_sent)
    }, [allContacts])
    
    // Show all contacts in the table (both sent and unsent) - backend already filtered
    const displayContacts = allContacts

    const handleConnect = (provider: 'gmail' | 'outlook') => {
        // For OAuth, we need to submit a form to trigger redirect
        const form = document.createElement('form')
        form.method = 'POST'
        form.action = route(`email-invite.connect.${provider}`)
        
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        if (csrfToken) {
            const csrfInput = document.createElement('input')
            csrfInput.type = 'hidden'
            csrfInput.name = '_token'
            csrfInput.value = csrfToken
            form.appendChild(csrfInput)
        }
        
        document.body.appendChild(form)
        form.submit()
    }

    const handleSync = (connectionId: number) => {
        // Add to syncing set immediately
        setSyncingConnections(prev => new Set(prev).add(connectionId))
        
        router.post(route('email-invite.sync', connectionId), {}, {
            onSuccess: () => {
                showSuccessToast("Sync started. This may take a few moments...")
                // Start polling for sync completion
                pollSyncStatus(connectionId)
            },
            onError: (errors) => {
                showErrorToast(errors.error || "Failed to start sync")
                setSyncingConnections(prev => {
                    const next = new Set(prev)
                    next.delete(connectionId)
                    return next
                })
            },
        })
    }

    const pollSyncStatus = useCallback((connectionId: number) => {
        const maxAttempts = 60 // Poll for up to 5 minutes (60 * 5 seconds)
        let attempts = 0
        
        const checkStatus = () => {
            if (attempts >= maxAttempts) {
                showErrorToast("Sync is taking longer than expected. Please refresh the page.")
                setSyncingConnections(prev => {
                    const next = new Set(prev)
                    next.delete(connectionId)
                    return next
                })
                return
            }

            // Use Inertia router.get for polling
            router.get(route('email-invite.sync-status', connectionId), {}, {
                preserveState: true,
                preserveScroll: true,
                only: ['connections'],
                onSuccess: (page) => {
                    const props = (page.props as any)
                    const connection = props.connections?.find((c: EmailConnection) => c.id === connectionId)
                    
                    if (connection && !connection.is_syncing) {
                        // Sync completed
                        showSuccessToast("Contacts synced successfully")
                        setSyncingConnections(prev => {
                            const next = new Set(prev)
                            next.delete(connectionId)
                            return next
                        })
                        // Reload to get fresh contacts data
                        router.reload({ only: ['contacts', 'connections'] })
                    } else {
                        // Still syncing, continue polling
                        attempts++
                        setTimeout(checkStatus, 5000) // Check every 5 seconds
                    }
                },
                onError: () => {
                    // Continue polling even on error (might be temporary)
                    attempts++
                    setTimeout(checkStatus, 5000)
                },
            })
        }

        // Start polling after 5 seconds
        setTimeout(checkStatus, 5000)
    }, [])

    const handleDisconnectClick = (connectionId: number) => {
        setConnectionToDisconnect(connectionId)
        setDisconnectDialogOpen(true)
    }

    const handleDisconnectConfirm = () => {
        if (!connectionToDisconnect) return

        router.delete(route('email-invite.disconnect', connectionToDisconnect), {
            onSuccess: () => {
                showSuccessToast("Email account disconnected")
                setDisconnectDialogOpen(false)
                setConnectionToDisconnect(null)
                router.reload()
            },
            onError: (errors) => {
                showErrorToast(errors.error || "Failed to disconnect")
                setDisconnectDialogOpen(false)
                setConnectionToDisconnect(null)
            },
        })
    }

    const handleDeleteContactClick = (contactId: number) => {
        setContactToDelete(contactId)
        setDeleteContactDialogOpen(true)
    }

    const handleDeleteContactConfirm = () => {
        if (!contactToDelete) return

        setIsDeletingContact(true)
        router.delete(route('email-invite.contacts.delete', contactToDelete), {
            onSuccess: () => {
                showSuccessToast("Contact deleted successfully")
                setDeleteContactDialogOpen(false)
                setContactToDelete(null)
                setIsDeletingContact(false)
                router.reload({ only: ['contacts'] })
            },
            onError: (errors) => {
                showErrorToast(errors.error || "Failed to delete contact")
                setDeleteContactDialogOpen(false)
                setContactToDelete(null)
                setIsDeletingContact(false)
            },
        })
    }

    const toggleContact = (contactId: number, e?: React.MouseEvent<HTMLDivElement>) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        setSelectedContacts(prev => 
            prev.includes(contactId)
                ? prev.filter(id => id !== contactId)
                : [...prev, contactId]
        )
    }

    const toggleAll = () => {
        if (selectedContacts.length === availableContacts.length) {
            setSelectedContacts([])
        } else {
            setSelectedContacts(availableContacts.map(c => c.id))
        }
    }

    const handleSendInvites = useCallback(() => {
        if (selectedContacts.length === 0) {
            showErrorToast("Please select at least one contact to send invites to")
            return
        }

        // Check email limits
        if (emailStats && emailStats.emails_included > 0) {
            if (emailStats.emails_left < selectedContacts.length) {
                showErrorToast(`You have ${emailStats.emails_left} email(s) remaining, but you're trying to send ${selectedContacts.length} invite(s). Please upgrade your plan or select fewer contacts.`)
                return
            }
        }

        // Prevent double submission
        if (isSendingInvites) {
            return
        }

        setIsSendingInvites(true)

        // Use router.post directly with fresh data to ensure it always works
        router.post(route('email-invite.send-invites'), {
            contact_ids: selectedContacts,
            message: customMessage || "",
        }, {
                onSuccess: () => {
                    showSuccessToast(`Invite requests queued for ${selectedContacts.length} contact(s)`)
                    setSelectedContacts([])
                    setCustomMessage("")
                setIsSendingInvites(false)
                    router.reload()
                },
                onError: (errors) => {
                    showErrorToast(errors.contact_ids?.[0] || "Failed to send invites")
                setIsSendingInvites(false)
            },
            onFinish: () => {
                setIsSendingInvites(false)
                },
        })
    }, [selectedContacts, customMessage, isSendingInvites, emailStats])

    const getProviderBadge = (provider: string) => {
        const colors = provider === 'gmail'
            ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
            : 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200'

        return (
            <Badge className={cn("font-medium", colors)}>
                {provider === 'gmail' ? 'Gmail' : 'Outlook'}
            </Badge>
        )
    }

    const activeConnections = connections.filter((c) => c.is_active && !!c.email)
    const usagePercent = emailStats && emailStats.emails_included > 0
        ? Math.min(100, Math.round((emailStats.emails_used / emailStats.emails_included) * 100))
        : 0
    const quotaBlocked = !!(
        emailStats &&
        emailStats.emails_included > 0 &&
        emailStats.emails_left < selectedContacts.length
    )

    return (
        <AppSidebarLayout>
            <Head title="Email Invites" />

            <div className="flex h-full flex-1 flex-col gap-6 py-4 px-4 md:py-6 md:px-8 lg:px-10">
                {/* Page header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <h1 className={cn("text-2xl sm:text-3xl font-bold tracking-tight mb-1", brandTextGradientClass)}>
                            Email Invites
                        </h1>
                        <p className="text-sm text-muted-foreground max-w-2xl">
                            Connect Gmail or Outlook, sync contacts, and invite people to join your organization.
                        </p>
                    </div>
                    <Button
                        onClick={() => setBuyEmailsModalOpen(true)}
                        className={cn("shrink-0", brandButtonClass)}
                    >
                        <Package className="h-4 w-4 mr-2" />
                        Buy Emails
                    </Button>
                </div>

                {/* Quota stats — same KPI pattern as Feedback & Rewards */}
                {emailStats && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Card className={statCardClass}>
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Included</p>
                                            <p className="text-2xl font-extrabold tabular-nums text-purple-600 dark:text-purple-400">
                                                {emailStats.emails_included.toLocaleString()}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">Plan allowance</p>
                                        </div>
                                        <Package className="h-5 w-5 text-purple-600 opacity-70 dark:text-purple-400" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className={statCardClass}>
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Sent</p>
                                            <p className="text-2xl font-extrabold tabular-nums text-blue-600 dark:text-blue-400">
                                                {emailStats.emails_used.toLocaleString()}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">Invites delivered</p>
                                        </div>
                                        <SendIcon className="h-5 w-5 text-blue-600 opacity-70 dark:text-blue-400" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className={cn(
                                statCardClass,
                                emailStats.emails_left === 0 && "border-red-500/30",
                                emailStats.emails_left > 0 && emailStats.emails_left < 10 && "border-amber-500/30",
                            )}>
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Remaining</p>
                                            <p className={cn(
                                                "text-2xl font-extrabold tabular-nums",
                                                emailStats.emails_left === 0 && "text-red-600 dark:text-red-400",
                                                emailStats.emails_left > 0 && emailStats.emails_left < 10 && "text-amber-600 dark:text-amber-400",
                                                emailStats.emails_left >= 10 && "text-purple-600 dark:text-purple-400",
                                            )}>
                                                {emailStats.emails_left.toLocaleString()}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                {emailStats.emails_left === 0
                                                    ? "Buy more to continue"
                                                    : emailStats.emails_left < 10
                                                        ? "Running low"
                                                        : "Ready to send"}
                                            </p>
                                        </div>
                                        <TrendingUp className={cn(
                                            "h-5 w-5 opacity-70",
                                            emailStats.emails_left === 0 && "text-red-600 dark:text-red-400",
                                            emailStats.emails_left > 0 && emailStats.emails_left < 10 && "text-amber-600 dark:text-amber-400",
                                            emailStats.emails_left >= 10 && "text-purple-600 dark:text-purple-400",
                                        )} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        {emailStats.emails_included > 0 && (
                            <div className="rounded-2xl border border-purple-500/15 bg-purple-500/[0.03] px-4 py-3 dark:bg-purple-500/[0.06]">
                                <div className="mb-2 flex items-center justify-between text-xs">
                                    <span className="font-medium text-muted-foreground">Quota usage</span>
                                    <span className="tabular-nums text-purple-600 dark:text-purple-400">{usagePercent}%</span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-purple-500/10">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all bg-gradient-to-r from-purple-600 to-blue-600",
                                            usagePercent >= 100 && "from-red-500 to-red-600",
                                            usagePercent >= 80 && usagePercent < 100 && "from-amber-500 to-orange-500",
                                        )}
                                        style={{ width: `${usagePercent}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Connections */}
                <Card className={sectionCardClass}>
                    <CardHeader className={sectionHeaderClass}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground dark:text-gray-100">
                                    <Link2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                    Connected accounts
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    Sync contacts from Gmail or Outlook. We only request Google Contacts access — not inbox mail.
                                </CardDescription>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row shrink-0">
                                <Button onClick={() => handleConnect('gmail')} className={cn("sm:min-w-[140px]", brandButtonClass)}>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Connect Gmail
                                </Button>
                                <Button onClick={() => handleConnect('outlook')} variant="outline" className={cn("sm:min-w-[140px]", brandOutlineBtn)}>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Connect Outlook
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="flex items-start gap-2.5 border-b border-purple-500/10 bg-purple-500/[0.03] px-6 py-3 text-xs text-muted-foreground">
                            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
                            <p>
                                Google OAuth uses <span className="font-medium text-foreground">contacts.readonly</span> only.
                                See our{" "}
                                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-medium text-purple-600 hover:underline dark:text-purple-400">
                                    Privacy Policy
                                </a>{" "}
                                and{" "}
                                <a href="/data-deletion" target="_blank" rel="noopener noreferrer" className="font-medium text-purple-600 hover:underline dark:text-purple-400">
                                    data deletion
                                </a>
                                .
                            </p>
                        </div>

                        {activeConnections.length === 0 ? (
                            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                                <div className="mb-3 rounded-full bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-4">
                                    <Mail className="h-8 w-8 text-purple-600/70 dark:text-purple-400/70" />
                                </div>
                                <p className="font-medium text-foreground">No accounts connected</p>
                                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                                    Connect Gmail or Outlook above to import contacts and start inviting.
                                </p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-purple-500/10">
                                {activeConnections.map((connection) => (
                                    <li
                                        key={connection.id}
                                        className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            {getProviderBadge(connection.provider)}
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">{connection.email}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {connection.contacts_count.toLocaleString()} contacts
                                                    {connection.last_synced_at && (
                                                        <span className="hidden sm:inline">
                                                            {" "}· Synced {new Date(connection.last_synced_at).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleSync(connection.id)}
                                                disabled={syncingConnections.has(connection.id)}
                                            >
                                                {syncingConnections.has(connection.id) ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="h-4 w-4" />
                                                )}
                                                <span className="ml-2">Sync</span>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDisconnectClick(connection.id)}
                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span className="ml-2">Disconnect</span>
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {/* Contacts workspace */}
                <Card className={sectionCardClass}>
                    <CardHeader className={sectionHeaderClass}>
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground dark:text-gray-100">
                                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                Contacts
                            </CardTitle>
                            <CardDescription className="mt-1">
                                {contacts.total.toLocaleString()} total
                                {allContacts.length > 0 && (
                                    <span> · {allContacts.length.toLocaleString()} loaded</span>
                                )}
                                {" "}· Select people to invite
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {/* Toolbar */}
                        <div className="flex flex-col gap-3 border-b border-purple-500/10 px-6 py-4 sm:flex-row sm:items-center">
                            <div className="relative flex-1">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search by name or email…"
                                    value={searchTerm}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            e.stopPropagation()
                                        }
                                    }}
                                    className="pl-10 focus-visible:ring-purple-500/40"
                                />
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <Select value={providerFilter} onValueChange={handleProviderFilterChange}>
                                    <SelectTrigger className="w-full sm:w-[150px]">
                                        <SelectValue placeholder="Provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All providers</SelectItem>
                                        <SelectItem value="gmail">Gmail</SelectItem>
                                        <SelectItem value="outlook">Outlook</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={registrationFilter} onValueChange={handleRegistrationFilterChange}>
                                    <SelectTrigger className="w-full sm:w-[160px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All status</SelectItem>
                                        <SelectItem value="registered">Registered</SelectItem>
                                        <SelectItem value="unregistered">Unregistered</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {availableContacts.length > 0 && (
                            <button
                                type="button"
                                onClick={toggleAll}
                                className="flex w-full items-center gap-3 border-b border-purple-500/10 px-6 py-3 text-left text-sm transition-colors hover:bg-purple-500/[0.04]"
                            >
                                <span className={cn(
                                    "flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-colors",
                                    selectedContacts.length === availableContacts.length && selectedContacts.length > 0
                                        ? "border-green-600/40 bg-green-100 dark:border-green-500/40 dark:bg-green-900/30"
                                        : "border-muted-foreground/30 bg-background",
                                )}>
                                    {selectedContacts.length === availableContacts.length && selectedContacts.length > 0 && (
                                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    )}
                                </span>
                                <span className="font-medium">
                                    Select all available ({availableContacts.length})
                                </span>
                                {selectedContacts.length > 0 && (
                                    <span className="ml-auto text-xs tabular-nums text-purple-600 dark:text-purple-400">
                                        {selectedContacts.length} selected
                                    </span>
                                )}
                            </button>
                        )}

                        <div
                            ref={scrollContainerRef}
                            className="max-h-[min(60vh,560px)] overflow-y-auto"
                        >
                            {displayContacts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                                    <div className="mb-3 rounded-full bg-muted p-4">
                                        <Users className="h-8 w-8 text-muted-foreground/60" />
                                    </div>
                                    <p className="font-medium">
                                        {searchTerm || providerFilter !== "all" || registrationFilter !== "all"
                                            ? "No contacts match your filters"
                                            : "No contacts yet"}
                                    </p>
                                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                                        {searchTerm || providerFilter !== "all" || registrationFilter !== "all"
                                            ? "Try adjusting search or filters."
                                            : "Sync a connected account to import contacts."}
                                    </p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-purple-500/10">
                                    {displayContacts.map((contact) => {
                                        const isSelected = selectedContacts.includes(contact.id)
                                        const canSelect = !contact.invite_sent
                                        return (
                                            <li
                                                key={contact.id}
                                                className={cn(
                                                    "flex flex-col gap-3 px-6 py-3.5 transition-colors sm:flex-row sm:items-center",
                                                    canSelect && "cursor-pointer hover:bg-purple-500/[0.04]",
                                                    isSelected && "bg-purple-500/[0.06]",
                                                    !canSelect && "bg-muted/10 opacity-70",
                                                )}
                                                onClick={(e) => {
                                                    if (canSelect) toggleContact(contact.id, e)
                                                }}
                                            >
                                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                                    {canSelect ? (
                                                        <span className={cn(
                                                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
                                                            isSelected
                                                                ? "border-green-600/40 bg-green-100 dark:border-green-500/40 dark:bg-green-900/30"
                                                                : "border-muted-foreground/30 bg-background",
                                                        )}>
                                                            {isSelected && (
                                                                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                        </span>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium text-foreground">
                                                            {contact.name || contact.email}
                                                        </p>
                                                        {contact.name && (
                                                            <p className="truncate text-sm text-muted-foreground">
                                                                {contact.email}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div
                                                    className="flex flex-wrap items-center gap-2 pl-8 sm:pl-0"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {contact.email_connection && (
                                                        <Badge variant="outline" className="border-purple-500/20 text-xs font-normal text-muted-foreground">
                                                            {contact.email_connection.provider === 'gmail' ? 'Gmail' : 'Outlook'}
                                                        </Badge>
                                                    )}
                                                    {contact.has_joined ? (
                                                        <Badge className="border-0 bg-purple-500/10 text-xs font-medium text-purple-700 dark:bg-purple-500/20 dark:text-purple-200">
                                                            Registered
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="border-0 bg-blue-500/10 text-xs font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
                                                            Unregistered
                                                        </Badge>
                                                    )}
                                                    {contact.invite_sent && (
                                                        <Badge className="border-0 bg-slate-500/10 text-xs font-medium text-slate-700 dark:bg-slate-500/20 dark:text-slate-200">
                                                            Invite sent
                                                        </Badge>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            e.preventDefault()
                                                            handleDeleteContactClick(contact.id)
                                                        }}
                                                        className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}

                            {loadingMore && (
                                <div className="flex items-center justify-center gap-2 border-t py-4 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading more…
                                </div>
                            )}

                            {!hasMore && allContacts.length > 0 && (
                                <div className="border-t py-3 text-center text-xs text-muted-foreground">
                                    All {contacts.total.toLocaleString()} contacts loaded
                                </div>
                            )}
                        </div>

                        {selectedContacts.length > 0 && (
                            <div className="space-y-3 border-t border-purple-500/10 bg-purple-500/[0.03] px-6 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="custom-message" className="text-sm font-medium">
                                        Personal message <span className="font-normal text-muted-foreground">(optional)</span>
                                    </Label>
                                    <Textarea
                                        id="custom-message"
                                        placeholder="Add a short note to your invitation email…"
                                        value={customMessage}
                                        onChange={(e) => setCustomMessage(e.target.value)}
                                        rows={3}
                                        className="resize-none bg-background focus-visible:ring-purple-500/40"
                                    />
                                </div>
                                {quotaBlocked && (
                                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-100">
                                        <p className="font-medium">Not enough email quota</p>
                                        <p className="mt-0.5 text-amber-800/90 dark:text-amber-200/90">
                                            You have {emailStats?.emails_left} remaining but selected {selectedContacts.length}. Deselect some contacts or buy more emails.
                                        </p>
                                    </div>
                                )}
                                <Button
                                    onClick={handleSendInvites}
                                    disabled={isSendingInvites || quotaBlocked}
                                    size="lg"
                                    className={cn("w-full", brandButtonClass)}
                                >
                                    {isSendingInvites ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Sending…
                                        </>
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4 mr-2" />
                                            Send {selectedContacts.length} invite{selectedContacts.length === 1 ? "" : "s"}
                                            {emailStats && emailStats.emails_included > 0 && (
                                                <span className="ml-2 text-xs opacity-80">
                                                    ({emailStats.emails_left.toLocaleString()} remaining)
                                                </span>
                                            )}
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Disconnect Confirmation Modal */}
                <ConfirmationModal
                    isOpen={disconnectDialogOpen}
                    onChange={setDisconnectDialogOpen}
                    title="Disconnect Email Account"
                    description="Are you sure you want to disconnect this email account? You will need to reconnect it to sync contacts again. All synced contacts will be preserved."
                    confirmLabel="Disconnect"
                    cancelLabel="Cancel"
                    onConfirm={handleDisconnectConfirm}
                    onCancel={() => {
                        setConnectionToDisconnect(null)
                    }}
                />

                {/* Delete Contact Confirmation Modal */}
                <ConfirmationModal
                    isOpen={deleteContactDialogOpen}
                    onChange={setDeleteContactDialogOpen}
                    title="Delete Contact"
                    description="Are you sure you want to delete this contact? This action cannot be undone. The contact will be removed from your list but can be synced again."
                    confirmLabel="Delete"
                    cancelLabel="Cancel"
                    onConfirm={handleDeleteContactConfirm}
                    onCancel={() => {
                        setContactToDelete(null)
                    }}
                    isLoading={isDeletingContact}
                />

                {/* Buy More Emails Modal */}
                <Dialog open={buyEmailsModalOpen} onOpenChange={setBuyEmailsModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">Buy More Emails</DialogTitle>
                            <DialogDescription>
                                Choose an email pack to add to your account
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {emailPackages.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>No email packages available</p>
                                    <p className="text-sm mt-2">Please contact support</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {emailPackages.map((pkg) => (
                                        <div
                                            key={pkg.id}
                                            onClick={() => setSelectedPackageId(pkg.id)}
                                            className={cn(
                                                "relative cursor-pointer rounded-lg border-2 p-4 transition-all",
                                                selectedPackageId === pkg.id
                                                    ? brandPackageSelectedClass
                                                    : "border-border hover:border-purple-500/50",
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "flex h-5 w-5 items-center justify-center rounded-full border-2",
                                                        selectedPackageId === pkg.id
                                                            ? "border-purple-600 bg-gradient-to-r from-purple-600 to-blue-600"
                                                            : "border-border",
                                                    )}>
                                                        {selectedPackageId === pkg.id && (
                                                            <div className="h-2 w-2 rounded-full bg-white" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-base font-semibold">
                                                            +{pkg.emails_count.toLocaleString()} Emails
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {pkg.name}
                                                        </p>
                                                        {pkg.description && (
                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                {pkg.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-bold">
                                                        ${pkg.price.toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 border-t pt-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setBuyEmailsModalOpen(false)
                                    setSelectedPackageId(null)
                                }}
                                className="flex-1"
                                disabled={isPurchasing}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={async () => {
                                    if (!selectedPackageId) {
                                        showErrorToast("Please select an email package")
                                        return
                                    }

                                    setIsPurchasing(true)
                                    try {
                                        router.post(route('email-invite.purchase-emails'), {
                                            package_id: selectedPackageId,
                                        })
                                    } catch (error) {
                                        showErrorToast("Failed to process purchase")
                                        setIsPurchasing(false)
                                    }
                                }}
                                disabled={!selectedPackageId || isPurchasing || emailPackages.length === 0}
                                className={cn("flex-1", brandButtonClass)}
                            >
                                {isPurchasing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Processing...
                                    </>
                                ) : (
                                    'Purchase'
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppSidebarLayout>
    )
}
