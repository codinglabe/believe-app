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
    Filter,
    Check
} from "lucide-react"
import { route } from "ziggy-js"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { useDebounce } from "@/hooks/useDebounce"

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

interface EmailInviteIndexProps {
    connections: EmailConnection[]
    contacts: PaginatedContacts
    filters?: {
        search: string
        provider: string
        per_page: number
        page: number
    }
}

export default function EmailInviteIndex({ connections, contacts: initialContacts, filters: initialFilters }: EmailInviteIndexProps) {
    const { flash } = usePage().props as any
    const [selectedContacts, setSelectedContacts] = useState<number[]>([])
    const [searchTerm, setSearchTerm] = useState(initialFilters?.search || "")
    const [providerFilter, setProviderFilter] = useState<string>(initialFilters?.provider || "all")
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
            search?: string
        } = {
            page: nextPage,
            per_page: initialContacts.per_page,
            provider: providerFilter,
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
    }, [loadingMore, hasMore, currentPage, initialContacts.per_page, searchTerm, providerFilter])

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


    // Handle flash messages
    useEffect(() => {
        if (flash?.success) {
            showSuccessToast(flash.success)
        }
        if (flash?.error) {
            showErrorToast(flash.error)
        }
    }, [flash])

    // Debounced search function
    const performSearch = useCallback((value: string) => {
        setLoadingMore(true)
        
        // Build params object, only include search if it has a value
        const params: {
            page: number
            per_page: number
            provider: string
            search?: string
        } = {
            page: 1, // Reset to first page when searching
            per_page: initialContacts.per_page,
            provider: providerFilter,
        }
        
        // Only add search parameter if it has a value
        if (value && value.trim()) {
            params.search = value.trim()
        }
        
        router.get(route('email-invite.index'), params, {
            preserveState: false,
            preserveScroll: false,
            only: ['contacts', 'filters'], // Only update contacts and filters, not full page
            onFinish: () => setLoadingMore(false),
        })
    }, [initialContacts.per_page, providerFilter])

    // Create debounced search function with 500ms delay
    const debouncedSearch = useDebounce(performSearch, 500)

    // Handle search input change
    const handleSearch = (value: string) => {
        // Update local state immediately for UI responsiveness
        setSearchTerm(value)
        // Call debounced search function
        debouncedSearch(value)
    }

    // Debounced filter function
    const performFilter = useCallback((provider: string) => {
        setLoadingMore(true)
        
        // Build params object, only include search if it has a value
        const params: {
            page: number
            per_page: number
            provider: string
            search?: string
        } = {
            page: 1, // Reset to first page when filtering
            per_page: initialContacts.per_page,
            provider: provider,
        }
        
        // Only add search parameter if it has a value
        if (searchTerm && searchTerm.trim()) {
            params.search = searchTerm.trim()
        }
        
        router.get(route('email-invite.index'), params, {
            preserveState: false,
            preserveScroll: false,
            only: ['contacts', 'filters'], // Only update contacts and filters, not full page
            onFinish: () => setLoadingMore(false),
        })
    }, [initialContacts.per_page, searchTerm])

    // Create debounced filter function with 300ms delay (shorter than search since it's a dropdown)
    const debouncedFilter = useDebounce(performFilter, 300)

    // Handle provider filter change
    const handleProviderFilterChange = (value: string) => {
        // Update local state immediately for UI responsiveness
        setProviderFilter(value)
        // Call debounced filter function
        debouncedFilter(value)
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
    }, [selectedContacts, customMessage, isSendingInvites])

    const getProviderBadge = (provider: string) => {
        const colors = provider === 'gmail' 
            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        
        return (
            <Badge className={colors}>
                {provider === 'gmail' ? 'Gmail' : 'Outlook'}
            </Badge>
        )
    }

    return (
        <AppSidebarLayout>
            <Head title="Email Invites" />
            
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">Email Invites</h1>
                        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                            Connect your email account and invite contacts to join your organization
                        </p>
                    </div>
                </div>

                {/* Email Connections */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Email Connections
                        </CardTitle>
                        <CardDescription>
                            Connect your Gmail or Outlook account to sync contacts
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {connections.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No email accounts connected</p>
                                    <p className="text-sm mt-2">Connect an account to get started</p>
                                </div>
                            ) : (
                                connections.map((connection) => (
                                    <div
                                        key={connection.id}
                                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg"
                                    >
                                        <div className="flex items-center gap-4">
                                            {getProviderBadge(connection.provider)}
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium truncate">{connection.email || 'Connected'}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {connection.contacts_count} contacts
                                                    {connection.last_synced_at && (
                                                        <span className="hidden sm:inline"> • Last synced: {new Date(connection.last_synced_at).toLocaleDateString()}</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleSync(connection.id)}
                                                disabled={syncingConnections.has(connection.id)}
                                                className="flex-1 sm:flex-initial"
                                            >
                                                {syncingConnections.has(connection.id) ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="h-4 w-4" />
                                                )}
                                                <span className="ml-2">Sync</span>
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDisconnectClick(connection.id)}
                                                className="flex-1 sm:flex-initial"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span className="ml-2">Disconnect</span>
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}

                            <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                                <Button
                                    onClick={() => handleConnect('gmail')}
                                    className="flex-1"
                                >
                                    <Mail className="h-4 w-4 mr-2" />
                                    Connect Gmail
                                </Button>
                                <Button
                                    onClick={() => handleConnect('outlook')}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    <Mail className="h-4 w-4 mr-2" />
                                    Connect Outlook
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Contacts List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Contacts ({contacts.total} total, {allContacts.length} loaded)
                        </CardTitle>
                        <CardDescription>
                            Select contacts to send join invitations
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Search and Filter */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Search contacts..."
                                        value={searchTerm}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        onKeyDown={(e) => {
                                            // Prevent Enter key from submitting form or navigating
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                e.stopPropagation()
                                            }
                                        }}
                                        className="pl-10"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
                                    <Select value={providerFilter} onValueChange={handleProviderFilterChange}>
                                        <SelectTrigger className="w-full sm:w-[180px]">
                                            <SelectValue placeholder="Filter by provider" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Providers</SelectItem>
                                            <SelectItem value="gmail">Gmail</SelectItem>
                                            <SelectItem value="outlook">Outlook</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Select All */}
                            {availableContacts.length > 0 && (
                                <div 
                                    className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 rounded-xl cursor-pointer hover:from-primary/10 hover:to-primary/20 dark:hover:from-primary/15 dark:hover:to-primary/25 transition-all duration-300 border border-primary/20 dark:border-primary/30 shadow-sm"
                                    onClick={toggleAll}
                                >
                                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                                        <div className={`relative flex items-center justify-center w-6 h-6 rounded-lg border-2 transition-all duration-300 ${
                                            selectedContacts.length === availableContacts.length
                                                ? 'bg-primary border-primary scale-110'
                                                : 'border-muted-foreground/30 bg-background hover:border-primary/50'
                                        }`}>
                                            {selectedContacts.length === availableContacts.length && (
                                                <Check className="h-4 w-4 text-primary-foreground animate-in zoom-in-50 duration-200" />
                                        )}
                                        </div>
                                        <span className="font-semibold text-sm">
                                            Select All ({availableContacts.length} available)
                                        </span>
                                    </label>
                                </div>
                            )}

                            {/* Contacts List */}
                            <div 
                                ref={scrollContainerRef}
                                className="space-y-3 max-h-[calc(100vh-500px)] overflow-y-auto scrollbar-hide"
                            >
                                {displayContacts.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>
                                            {searchTerm ? 'No contacts found' : 'No contacts available'}
                                        </p>
                                        {!searchTerm && (
                                            <p className="text-sm mt-2">
                                                Sync your email account to import contacts
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    displayContacts.map((contact) => {
                                        const isSelected = selectedContacts.includes(contact.id)
                                        const canSelect = !contact.invite_sent
                                        return (
                                            <div
                                                key={contact.id}
                                                className={`group relative flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-xl transition-all duration-300 ${
                                                    canSelect 
                                                        ? `hover:shadow-md hover:border-primary/30 ${
                                                            isSelected 
                                                                ? 'bg-primary/5 dark:bg-primary/10 border-primary/50 shadow-sm' 
                                                                : 'bg-card hover:bg-muted/30 border-border'
                                                        }` 
                                                        : 'opacity-60 bg-muted/30'
                                                }`}
                                                onClick={(e) => {
                                                    if (canSelect) {
                                                        toggleContact(contact.id, e)
                                                    }
                                                }}
                                            >
                                                {/* Animated Selection Indicator */}
                                                <div className={`flex items-start sm:items-center gap-4 flex-1 min-w-0 ${canSelect ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                                                    {canSelect ? (
                                                        <div className="relative flex-shrink-0">
                                                            <div className={`relative flex items-center justify-center w-6 h-6 rounded-lg border-2 transition-all duration-300 ${
                                                                isSelected
                                                                    ? 'bg-primary border-primary scale-110 shadow-lg shadow-primary/30'
                                                                    : 'border-muted-foreground/30 bg-background group-hover:border-primary/50 group-hover:scale-105'
                                                            }`}>
                                                                {isSelected && (
                                                                    <>
                                                                        <div className="absolute inset-0 rounded-lg bg-primary animate-ping opacity-20" />
                                                                        <Check className="h-4 w-4 text-primary-foreground relative z-10 animate-in zoom-in-50 duration-200" />
                                                                    </>
                                                            )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex-shrink-0">
                                                            <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Contact Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className={`font-semibold truncate text-base ${
                                                                isSelected ? 'text-primary' : 'text-foreground'
                                                            }`}>
                                                            {contact.name || contact.email}
                                                        </p>
                                                        </div>
                                                        {contact.name && (
                                                            <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                                                                <Mail className="h-3 w-3" />
                                                                {contact.email}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* Badges and Actions */}
                                                <div 
                                                    className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0 ml-10 sm:ml-0"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {contact.email_connection && (
                                                        <Badge 
                                                            variant="outline" 
                                                            className="text-xs font-medium px-2.5 py-1 border-muted-foreground/20"
                                                        >
                                                            {contact.email_connection.provider === 'gmail' ? 'Gmail' : 'Outlook'}
                                                        </Badge>
                                                    )}
                                                    {contact.invite_sent && (
                                                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 text-xs font-medium px-2.5 py-1 shadow-sm">
                                                            <CheckCircle2 className="h-3 w-3 mr-1.5" />
                                                            <span className="hidden sm:inline">Invite Sent</span>
                                                            <span className="sm:hidden">Sent</span>
                                                        </Badge>
                                                    )}
                                                    {contact.has_joined && (
                                                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 text-xs font-medium px-2.5 py-1 shadow-sm">
                                                            Joined
                                                        </Badge>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            e.preventDefault()
                                                            handleDeleteContactClick(contact.id)
                                                        }}
                                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                
                                                {/* Selection Ripple Effect */}
                                                {isSelected && canSelect && (
                                                    <div className="absolute inset-0 rounded-xl bg-primary/5 dark:bg-primary/10 pointer-events-none animate-in fade-in-0 duration-300" />
                                                )}
                                            </div>
                                        )
                                    })
                                )}

                                {/* Loading More Indicator */}
                                {loadingMore && (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                                        <span className="text-sm text-muted-foreground">Loading more contacts...</span>
                                    </div>
                                )}

                                {/* End of List Indicator */}
                                {!hasMore && allContacts.length > 0 && (
                                    <div className="text-center py-4 text-sm text-muted-foreground">
                                        All {contacts.total} contacts loaded
                                    </div>
                                )}
                            </div>

                            {/* Custom Message */}
                            {selectedContacts.length > 0 && (
                                <div className="space-y-2 pt-4 border-t">
                                    <Label htmlFor="custom-message">Custom Message (Optional)</Label>
                                    <Textarea
                                        id="custom-message"
                                        placeholder="Add a personal message to your invitation..."
                                        value={customMessage}
                                        onChange={(e) => setCustomMessage(e.target.value)}
                                        rows={3}
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        This message will be included in the invitation email
                                    </p>
                                </div>
                            )}

                            {/* Send Button */}
                            {selectedContacts.length > 0 && (
                                <div className="pt-4 border-t">
                                    <Button
                                        onClick={handleSendInvites}
                                        disabled={isSendingInvites}
                                        className="w-full"
                                        size="lg"
                                    >
                                        {isSendingInvites ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="h-4 w-4 mr-2" />
                                                Send Invites to {selectedContacts.length} Contact(s)
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}

                        </div>
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
            </div>
        </AppSidebarLayout>
    )
}

