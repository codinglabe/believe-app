"use client"

import { Head, router, useForm } from "@inertiajs/react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import { SubscriptionRequiredModal } from "@/components/SubscriptionRequiredModal"
import { cn } from "@/lib/utils"
import { useCallback, useEffect, useRef, useState } from "react"
import { getBrowserTimezone, formatDateInTimezone, convertUserTimezoneToUTC } from "@/lib/timezone-detection"
import {
    Mail,
    Calendar,
    Users,
    Building,
    Target,
    Clock,
    Repeat,
    Send,
    ArrowLeft,
    Plus,
    AlertCircle,
    Shield,
    UserCircle,
    Layers,
    Check,
    Sparkles
} from "lucide-react"

/** Targeting tab strip: multi-row grid on small screens, five equal columns from lg. */
const targetingTabsListClass =
    "mb-3 grid h-auto min-h-0 w-full grid-cols-2 gap-1.5 rounded-xl border border-border/60 bg-muted/40 p-1.5 sm:grid-cols-3 lg:grid-cols-5"

const targetingTabTriggerClass =
    "touch-manipulation flex min-h-[3.25rem] w-full min-w-0 max-w-full flex-col items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-center text-[11px] font-semibold leading-snug text-foreground whitespace-normal ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md sm:min-h-10 sm:flex-row sm:flex-wrap sm:gap-1.5 sm:px-2 sm:text-xs"

const proTabBadgeClass =
    "inline-flex shrink-0 items-center gap-0.5 rounded-md bg-amber-500/20 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300"

const ROLE_LABELS: Record<string, string> = {
    user: "Supporters",
    care_alliance: "Care Alliance",
}

function formatRoleLabel(role: string): string {
    if (ROLE_LABELS[role]) {
        return ROLE_LABELS[role]
    }
    return role
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
}

function pickInitials(name: string): string {
    const parts = name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
    if (parts.length === 0) {
        return "?"
    }
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase()
    }
    return (parts[0][0] + parts[1][0]).toUpperCase()
}

function NewsletterUserPickCard({
    user,
    selected,
    onToggle,
}: {
    user: User
    selected: boolean
    onToggle: () => void
}) {
    const userStatusLabel = user.roles?.length
        ? formatRoleLabel(user.roles[0])
        : user.email_verified_at
          ? "Verified"
          : "Unverified"

    return (
        <button
            type="button"
            aria-label={
                selected ? `${user.name}, selected. Click to deselect.` : `${user.name}. Click to select.`
            }
            onClick={onToggle}
            className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200",
                selected
                    ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/25 dark:bg-primary/15"
                    : "border-border/80 bg-card hover:border-primary/30 hover:bg-muted/45 hover:shadow-sm"
            )}
        >
            <div className="shrink-0">
                <Avatar
                    className={cn("size-11 border-2 shadow-sm", selected ? "border-primary/50" : "border-transparent")}
                >
                    <AvatarFallback
                        className={cn(
                            "text-sm font-semibold",
                            selected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                        )}
                    >
                        {pickInitials(user.name)}
                    </AvatarFallback>
                </Avatar>
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate font-semibold leading-tight text-foreground">{user.name}</p>
                <div className="mt-1.5">
                    <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wide">
                        {userStatusLabel}
                    </Badge>
                </div>
            </div>
            <div
                className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
                    selected
                        ? "border border-emerald-500/55 bg-emerald-500/10 shadow-sm dark:border-emerald-400/45 dark:bg-emerald-500/15"
                        : "border border-dashed border-muted-foreground/25 bg-transparent"
                )}
                aria-hidden
            >
                {selected ? (
                    <Check
                        className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                        strokeWidth={2.5}
                    />
                ) : null}
            </div>
        </button>
    )
}

function NewsletterOrgPickCard({
    org,
    selected,
    onToggle,
}: {
    org: Organization
    selected: boolean
    onToggle: () => void
}) {
    const kindLabel = org.is_care_alliance_hub
        ? ROLE_LABELS.care_alliance
        : "Organization"

    return (
        <button
            type="button"
            aria-label={
                selected ? `${org.name}, selected. Click to deselect.` : `${org.name}. Click to select.`
            }
            onClick={onToggle}
            className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200",
                selected
                    ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/25 dark:bg-primary/15"
                    : "border-border/80 bg-card hover:border-primary/30 hover:bg-muted/45 hover:shadow-sm"
            )}
        >
            <div className="shrink-0">
                <Avatar
                    className={cn("size-11 border-2 shadow-sm", selected ? "border-primary/50" : "border-transparent")}
                >
                    <AvatarFallback
                        className={cn(
                            "text-xs font-bold",
                            selected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                        )}
                    >
                        {pickInitials(org.name)}
                    </AvatarFallback>
                </Avatar>
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate font-semibold leading-tight text-foreground">{org.name}</p>
                <div className="mt-1.5">
                    <Badge
                        variant={org.is_care_alliance_hub ? "default" : "secondary"}
                        className="text-[10px] font-semibold tracking-wide"
                    >
                        {kindLabel}
                    </Badge>
                </div>
            </div>
            <div
                className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
                    selected
                        ? "border border-emerald-500/55 bg-emerald-500/10 shadow-sm dark:border-emerald-400/45 dark:bg-emerald-500/15"
                        : "border border-dashed border-muted-foreground/25 bg-transparent"
                )}
                aria-hidden
            >
                {selected ? (
                    <Check
                        className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                        strokeWidth={2.5}
                    />
                ) : null}
            </div>
        </button>
    )
}

interface Template {
    id: number
    name: string
    subject: string
    content: string
    template_type: string
    html_content?: string
}

interface User {
    id: number
    name: string
    email: string
    roles: string[]
    email_verified_at?: string | null
}

interface UsersMeta {
    current_page: number
    last_page: number
    per_page: number
    total: number
}

interface TargetingStats {
    verified_users: number
    supporters: number
    role_match_total: number | null
}

interface Organization {
    id: number
    name: string
    email: string
    status: string
    registration_status?: string
    /** True when this org row is the hub for a Care Alliance (`care_alliances.hub_organization_id`). */
    is_care_alliance_hub?: boolean
}

interface CreateAdvancedNewsletterProps {
    templates: Template[]
    /** All verified users (platform / org "Organizations" mode org list is separate; user pickers use supporter_users for org when applicable). */
    users: User[]
    /** Verified Supporters role (`user`) — org account: Specific users, Custom user picks, and “All supporters” count. */
    supporter_users?: User[] | null
    users_meta: UsersMeta
    supporter_users_meta?: UsersMeta | null
    organizations: Organization[]
    roles: string[]
    audience_scope?: "platform" | "organization"
    related_supporter_count?: number | null
    stats: TargetingStats
    /** One-time Pro targeting purchase (or admin); not tied to platform subscription. */
    has_newsletter_pro_targeting?: boolean
    /** One-time lifetime price (USD) from config — no plan product required. */
    newsletter_pro_targeting_lifetime_price_usd?: number
    /** When false, hide Stripe pay-once (e.g. env disabled). */
    newsletter_pro_targeting_purchase_enabled?: boolean
}

export default function CreateAdvancedNewsletter({
    templates,
    users,
    supporter_users = null,
    users_meta,
    supporter_users_meta = null,
    organizations,
    roles,
    audience_scope = "platform",
    related_supporter_count = null,
    stats,
    has_newsletter_pro_targeting = false,
    newsletter_pro_targeting_lifetime_price_usd = 49,
    newsletter_pro_targeting_purchase_enabled = true,
}: CreateAdvancedNewsletterProps) {
    /** True only after one-time Pro purchase (or admin) — not generic subscription/plan. */
    const proTargetingAllowed = Boolean(has_newsletter_pro_targeting)

    const { data, setData, post, processing, errors } = useForm({
        newsletter_template_id: '',
        subject: '',
        content: '',
        html_content: '',
        send_via: 'email' as 'email' | 'sms' | 'both',
        schedule_type: 'immediate' as 'immediate' | 'scheduled' | 'recurring',
        send_date: '',
        recurring_settings: {},
        target_type: 'all' as 'all' | 'users' | 'organizations' | 'specific' | 'roles',
        target_users: [] as number[],
        target_organizations: [] as number[],
        target_roles: [] as string[],
        target_criteria: {},
        is_public: false,
    })

    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
    const [selectedUsers, setSelectedUsers] = useState<number[]>([])
    const [selectedOrganizations, setSelectedOrganizations] = useState<number[]>([])
    const [selectedRoles, setSelectedRoles] = useState<string[]>([])
    const [recurringType, setRecurringType] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
    const [recurringInterval, setRecurringInterval] = useState(1)

    const [loadedUsers, setLoadedUsers] = useState<User[]>(users)
    const [loadedSupporters, setLoadedSupporters] = useState<User[]>(supporter_users ?? [])
    const [usersLoadingMore, setUsersLoadingMore] = useState(false)
    const [supportersLoadingMore, setSupportersLoadingMore] = useState(false)
    const [proTargetingModalOpen, setProTargetingModalOpen] = useState(false)
    const lastUsersPageRef = useRef(users_meta.current_page)
    const lastSupportersPageRef = useRef(supporter_users_meta?.current_page ?? 1)

    useEffect(() => {
        if (proTargetingAllowed) {
            return
        }
        if (data.target_type !== 'roles' && data.target_type !== 'organizations' && data.target_type !== 'specific') {
            return
        }
        setSelectedUsers([])
        setSelectedOrganizations([])
        setSelectedRoles([])
        setData({
            ...data,
            target_type: 'all',
            target_users: [],
            target_organizations: [],
            target_roles: [],
        })
    }, [proTargetingAllowed])

    useEffect(() => {
        if (users_meta.current_page === 1) {
            setLoadedUsers(users)
            lastUsersPageRef.current = 1
        } else if (users_meta.current_page > lastUsersPageRef.current) {
            setLoadedUsers((prev) => {
                const seen = new Set(prev.map((u) => u.id))
                const chunk = users.filter((u) => !seen.has(u.id))
                return chunk.length ? [...prev, ...chunk] : prev
            })
            lastUsersPageRef.current = users_meta.current_page
        }
    }, [users, users_meta.current_page])

    useEffect(() => {
        if (!supporter_users_meta) {
            return
        }
        if (supporter_users_meta.current_page === 1) {
            setLoadedSupporters(supporter_users ?? [])
            lastSupportersPageRef.current = 1
        } else if (supporter_users_meta.current_page > lastSupportersPageRef.current) {
            setLoadedSupporters((prev) => {
                const seen = new Set(prev.map((u) => u.id))
                const chunk = (supporter_users ?? []).filter((u) => !seen.has(u.id))
                return chunk.length ? [...prev, ...chunk] : prev
            })
            lastSupportersPageRef.current = supporter_users_meta.current_page
        }
    }, [supporter_users, supporter_users_meta?.current_page])

    useEffect(() => {
        const t = window.setTimeout(() => {
            router.get(
                route("newsletter.create-advanced"),
                {
                    users_page: lastUsersPageRef.current,
                    supporters_page: supporter_users_meta?.current_page ?? lastSupportersPageRef.current,
                    preview_roles: selectedRoles,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    only: [
                        "stats",
                        "has_newsletter_pro_targeting",
                        "newsletter_pro_targeting_lifetime_price_usd",
                        "newsletter_pro_targeting_purchase_enabled",
                    ],
                    replace: true,
                }
            )
        }, 320)
        return () => window.clearTimeout(t)
    }, [selectedRoles.join("|")])

    const maybeLoadMoreUserPicker = useCallback(
        (scrollEl: HTMLDivElement) => {
            if (scrollEl.scrollTop + scrollEl.clientHeight < scrollEl.scrollHeight - 80) {
                return
            }
            if (audience_scope === "organization") {
                if (!supporter_users_meta || supportersLoadingMore) {
                    return
                }
                if (supporter_users_meta.current_page >= supporter_users_meta.last_page) {
                    return
                }
                setSupportersLoadingMore(true)
                router.get(
                    route("newsletter.create-advanced"),
                    {
                        users_page: lastUsersPageRef.current,
                        supporters_page: supporter_users_meta.current_page + 1,
                        preview_roles: selectedRoles,
                    },
                    {
                        preserveState: true,
                        preserveScroll: true,
                        only: [
                            "supporter_users",
                            "supporter_users_meta",
                            "stats",
                            "has_newsletter_pro_targeting",
                            "newsletter_pro_targeting_lifetime_price_usd",
                            "newsletter_pro_targeting_purchase_enabled",
                        ],
                        onFinish: () => setSupportersLoadingMore(false),
                    }
                )
            } else {
                if (usersLoadingMore || users_meta.current_page >= users_meta.last_page) {
                    return
                }
                setUsersLoadingMore(true)
                router.get(
                    route("newsletter.create-advanced"),
                    {
                        users_page: users_meta.current_page + 1,
                        preview_roles: selectedRoles,
                    },
                    {
                        preserveState: true,
                        preserveScroll: true,
                        only: [
                            "users",
                            "users_meta",
                            "stats",
                            "has_newsletter_pro_targeting",
                            "newsletter_pro_targeting_lifetime_price_usd",
                            "newsletter_pro_targeting_purchase_enabled",
                        ],
                        onFinish: () => setUsersLoadingMore(false),
                    }
                )
            }
        },
        [
            audience_scope,
            users_meta.current_page,
            users_meta.last_page,
            supporter_users_meta,
            selectedRoles,
            usersLoadingMore,
            supportersLoadingMore,
        ]
    )

    /** Org account: manual user lists use verified accounts with the Supporters role. Platform: full verified list. */
    const usersForPicker =
        audience_scope === "organization" && (data.target_type === "users" || data.target_type === "specific")
            ? loadedSupporters
            : loadedUsers

    const handleUserToggle = (userId: number) => {
        const newUsers = selectedUsers.includes(userId)
            ? selectedUsers.filter(id => id !== userId)
            : [...selectedUsers, userId]

        setSelectedUsers(newUsers)
        setData('target_users', newUsers)
    }

    const handleOrganizationToggle = (orgId: number) => {
        const newOrgs = selectedOrganizations.includes(orgId)
            ? selectedOrganizations.filter(id => id !== orgId)
            : [...selectedOrganizations, orgId]

        setSelectedOrganizations(newOrgs)
        setData('target_organizations', newOrgs)
    }

    const handleRoleToggle = (role: string) => {
        const newRoles = selectedRoles.includes(role)
            ? selectedRoles.filter(r => r !== role)
            : [...selectedRoles, role]

        setSelectedRoles(newRoles)
        setData('target_roles', newRoles)
    }

    const setTargetTab = (value: string) => {
        const tt = value as typeof data.target_type
        const requiresPro =
            tt === 'organizations' || tt === 'specific' || tt === 'roles'
        if (!proTargetingAllowed && requiresPro) {
            setProTargetingModalOpen(true)
            return
        }
        if (tt === 'roles') {
            setSelectedUsers([])
            setSelectedOrganizations([])
            setData('target_users', [])
            setData('target_organizations', [])
        }
        setData('target_type', tt)
    }

    const handleTemplateSelect = (templateId: string) => {
        const template = templates.find(t => t.id === parseInt(templateId))
        setSelectedTemplate(template || null)

        if (template) {
            setData({
                ...data,
                newsletter_template_id: templateId,
                subject: template.subject,
                content: template.content || '',
                html_content: template.html_content || '',
            })
        }

        console.log('Selected template:', template)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        console.log('Form data before submit:', data)
        console.log('Selected users:', selectedUsers)
        console.log('Selected organizations:', selectedOrganizations)
        console.log('Selected roles:', selectedRoles)

        // Update recurring settings
        const recurringSettings = data.schedule_type === 'recurring' ? {
            type: recurringType,
            interval: recurringInterval,
        } : {}

        // Normalize targets so only the active mode is sent (avoids stale IDs from other modes).
        const tt = data.target_type
        const submitData = {
            ...data,
            recurring_settings: recurringSettings,
            target_users: tt === 'users' || tt === 'specific' ? selectedUsers : [],
            target_organizations: tt === 'organizations' || tt === 'specific' ? selectedOrganizations : [],
            target_roles: tt === 'roles' || tt === 'specific' ? selectedRoles : [],
        }

        // Only include send_date if schedule_type is scheduled or recurring
        if (data.schedule_type === 'immediate') {
            delete submitData.send_date
        } else if (data.schedule_type !== 'immediate' && data.send_date) {
            // Convert user's timezone to UTC before sending
            const utcDate = convertUserTimezoneToUTC(data.send_date, getBrowserTimezone())
            submitData.send_date = utcDate.toISOString()
        } else if (data.schedule_type !== 'immediate' && (!data.send_date || data.send_date === '')) {
            submitData.send_date = null
        }

        console.log('Submitting data:', submitData)

        post(route('newsletter.store'), submitData)
    }

    const getTargetCount = () => {
        switch (data.target_type) {
            case 'all':
                if (audience_scope === 'organization') {
                    return stats.supporters
                }
                return (
                    stats.verified_users +
                    organizations.filter((o) => o.status === 'active').length
                )
            case 'users':
                return selectedUsers.length
            case 'organizations':
                return selectedOrganizations.length
            case 'roles': {
                if (selectedRoles.length === 0) {
                    return 0
                }
                return stats.role_match_total ?? 0
            }
            case 'specific': {
                let count = selectedUsers.length
                selectedOrganizations.forEach((orgId) => {
                    const org = organizations.find((o) => o.id === orgId)
                    if (org) {
                        count += 1
                    }
                })
                if (selectedRoles.length > 0) {
                    count += stats.role_match_total ?? 0
                }
                return count
            }
            default:
                return 0
        }
    }

    return (
        <AppSidebarLayout>
            <Head title="Create Advanced Newsletter" />

            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500 m-10">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => window.history.back()}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Create Advanced Newsletter
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Schedule and target your newsletter with precision
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Template Selection */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Mail className="h-5 w-5" />
                                    Template
                                </CardTitle>
                                <CardDescription>
                                    Choose a template for your newsletter
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Select onValueChange={handleTemplateSelect}>
                                    <SelectTrigger>
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

                                {selectedTemplate && (
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <h4 className="font-semibold text-sm mb-2">{selectedTemplate.name}</h4>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                            {selectedTemplate.subject}
                                        </p>
                                        <Badge variant="outline" className="text-xs">
                                            {selectedTemplate.template_type}
                                        </Badge>
                                    </div>
                                )}

                                {errors.newsletter_template_id && (
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                        {errors.newsletter_template_id}
                                    </p>
                                )}

                                <div className="space-y-2">
                                    <Label>Send via</Label>
                                    <Select
                                        value={data.send_via}
                                        onValueChange={(v) => {
                                            const next = v as "email" | "sms" | "both"
                                            setData("send_via", next)
                                            if (next === "sms") {
                                                setData("html_content", "")
                                            }
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="email">Email</SelectItem>
                                            <SelectItem value="sms">SMS (plain text)</SelectItem>
                                            <SelectItem value="both">Both (SMS + email HTML)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.send_via && (
                                        <p className="text-sm text-red-600 dark:text-red-400">{errors.send_via}</p>
                                    )}
                                </div>

                                {errors.send_date && (
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                        {errors.send_date}
                                    </p>
                                )}

                                {Object.keys(errors).length > 0 && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-sm text-red-800 dark:text-red-300 font-semibold mb-2">
                                                    Please fix the following errors:
                                                </p>
                                                <ul className="text-sm text-red-700 dark:text-red-400 space-y-1 list-disc list-inside">
                                                    {Object.entries(errors).map(([field, message]) => (
                                                        <li key={field}>{message}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Scheduling */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Scheduling
                                </CardTitle>
                                <CardDescription>
                                    When should this newsletter be sent?
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Button
                                        type="button"
                                        variant={data.schedule_type === 'immediate' ? 'default' : 'outline'}
                                        onClick={() => setData('schedule_type', 'immediate')}
                                        className="flex items-center gap-2"
                                    >
                                        <Send className="h-4 w-4" />
                                        Immediate
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={data.schedule_type === 'scheduled' ? 'default' : 'outline'}
                                        onClick={() => setData('schedule_type', 'scheduled')}
                                        className="flex items-center gap-2"
                                    >
                                        <Clock className="h-4 w-4" />
                                        Scheduled
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={data.schedule_type === 'recurring' ? 'default' : 'outline'}
                                        onClick={() => setData('schedule_type', 'recurring')}
                                        className="flex items-center gap-2"
                                    >
                                        <Repeat className="h-4 w-4" />
                                        Recurring
                                    </Button>
                                </div>

                                {data.schedule_type === 'scheduled' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="sendDate">Send Date & Time</Label>
                                        <Input
                                            id="sendDate"
                                            type="datetime-local"
                                            value={data.send_date}
                                            onChange={(e) => setData('send_date', e.target.value)}
                                        />
                                    </div>
                                )}

                                {data.schedule_type === 'recurring' && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="recurringSendDate">Start Date & Time</Label>
                                            <Input
                                                id="recurringSendDate"
                                                type="datetime-local"
                                                value={data.send_date}
                                                onChange={(e) => setData('send_date', e.target.value)}
                                                required={data.schedule_type === 'recurring'}
                                            />
                                            <p className="text-xs text-gray-500">
                                                The newsletter will start sending from this date and time, then repeat based on the settings below.
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Recurring Type</Label>
                                                <Select value={recurringType} onValueChange={setRecurringType}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="daily">Daily</SelectItem>
                                                        <SelectItem value="weekly">Weekly</SelectItem>
                                                        <SelectItem value="monthly">Monthly</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Every (interval)</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={recurringInterval}
                                                    onChange={(e) => setRecurringInterval(parseInt(e.target.value) || 1)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Targeting */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="h-5 w-5" />
                                    Targeting
                                </CardTitle>
                                <CardDescription>
                                    {audience_scope === 'organization'
                                        ? 'All supporters = every verified account with the Supporters role. Organizations lists all approved nonprofits (including Care Alliance). By role / Custom role segments use everyone with those roles. Manual user picks use the Supporters list.'
                                        : 'By role targets every verified account with those roles. Organizations uses the full nonprofit directory. Custom can combine users, orgs, and roles.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {errors.target_type && (
                                    <p className="text-sm text-red-600 dark:text-red-400">{errors.target_type}</p>
                                )}
                                <Tabs
                                    value={data.target_type}
                                    onValueChange={setTargetTab}
                                    className="w-full"
                                >
                                    <TabsList className={targetingTabsListClass}>
                                        <TabsTrigger value="all" className={targetingTabTriggerClass}>
                                            <Users className="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" aria-hidden />
                                            <span className="max-w-[11rem] text-balance sm:max-w-none">
                                                {audience_scope === 'organization' ? 'All supporters' : 'All users'}
                                            </span>
                                        </TabsTrigger>
                                        <TabsTrigger value="users" className={targetingTabTriggerClass}>
                                            <UserCircle className="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" aria-hidden />
                                            <span className="max-w-[11rem] text-balance sm:max-w-none">Specific users</span>
                                        </TabsTrigger>
                                        <TabsTrigger value="roles" className={targetingTabTriggerClass}>
                                            <Shield className="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" aria-hidden />
                                            <span className="max-w-[11rem] text-balance sm:max-w-none">By role</span>
                                            {!proTargetingAllowed && (
                                                <span className={proTabBadgeClass} title="Pro targeting — purchase to unlock">
                                                    <Sparkles className="h-2.5 w-2.5" aria-hidden />
                                                    Pro
                                                </span>
                                            )}
                                        </TabsTrigger>
                                        <TabsTrigger value="organizations" className={targetingTabTriggerClass}>
                                            <Building className="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" aria-hidden />
                                            <span className="max-w-[11rem] break-words text-balance sm:max-w-none">
                                                Organizations
                                            </span>
                                            {!proTargetingAllowed && (
                                                <span className={proTabBadgeClass} title="Pro targeting — purchase to unlock">
                                                    <Sparkles className="h-2.5 w-2.5" aria-hidden />
                                                    Pro
                                                </span>
                                            )}
                                        </TabsTrigger>
                                        <TabsTrigger value="specific" className={targetingTabTriggerClass}>
                                            <Layers className="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" aria-hidden />
                                            <span className="max-w-[11rem] text-balance sm:max-w-none">Custom</span>
                                            {!proTargetingAllowed && (
                                                <span className={proTabBadgeClass} title="Pro targeting — purchase to unlock">
                                                    <Sparkles className="h-2.5 w-2.5" aria-hidden />
                                                    Pro
                                                </span>
                                            )}
                                        </TabsTrigger>
                                    </TabsList>

                                    {audience_scope === 'organization' && related_supporter_count !== null && (
                                        <p className="text-xs text-muted-foreground">
                                            {related_supporter_count} verified account
                                            {related_supporter_count !== 1 ? 's' : ''} with the Supporters role.
                                        </p>
                                    )}

                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-primary" />
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                Target Recipients:{' '}
                                                <span className="text-primary">{getTargetCount()}</span>
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="isPublic"
                                                checked={data.is_public}
                                                onCheckedChange={(checked) => setData('is_public', checked as boolean)}
                                            />
                                            <Label htmlFor="isPublic" className="text-sm">
                                                Public Newsletter
                                            </Label>
                                        </div>
                                    </div>

                                    <TabsContent value="all" className="mt-4 outline-none">
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                                            className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-3 text-sm text-muted-foreground"
                                        >
                                            {audience_scope === 'organization'
                                                ? 'Sends to every verified account with the Supporters role.'
                                                : 'Sends to all verified users (and platform org emails where applicable for non–org-specific sends).'}
                                        </motion.div>
                                    </TabsContent>

                                    <TabsContent value="users" className="mt-4 outline-none">
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                                            className="space-y-2"
                                        >
                                            <Label>Select Users</Label>
                                            {audience_scope === 'organization' && (
                                                <p className="text-xs text-muted-foreground">
                                                    Verified accounts with the Supporters role — same pool as &quot;all
                                                    supporters&quot;.
                                                </p>
                                            )}
                                            {audience_scope === 'organization' && stats.supporters === 0 && (
                                                <p className="text-sm text-amber-700 dark:text-amber-300">
                                                    No verified Supporters-role accounts yet.
                                                </p>
                                            )}
                                            <div
                                                className="max-h-72 space-y-3 overflow-y-auto rounded-xl border bg-muted/20 p-2.5"
                                                onScroll={(e) => maybeLoadMoreUserPicker(e.currentTarget)}
                                            >
                                                {usersForPicker.map((user) => (
                                                    <NewsletterUserPickCard
                                                        key={user.id}
                                                        user={user}
                                                        selected={selectedUsers.includes(user.id)}
                                                        onToggle={() => handleUserToggle(user.id)}
                                                    />
                                                ))}
                                                {(audience_scope === "organization"
                                                    ? supportersLoadingMore
                                                    : usersLoadingMore) && (
                                                    <p className="py-2 text-center text-xs text-muted-foreground">
                                                        Loading more…
                                                    </p>
                                                )}
                                                {audience_scope === "organization"
                                                    ? supporter_users_meta &&
                                                      supporter_users_meta.current_page <
                                                          supporter_users_meta.last_page &&
                                                      !supportersLoadingMore && (
                                                          <p className="py-1 text-center text-[10px] text-muted-foreground">
                                                              Scroll for more
                                                          </p>
                                                      )
                                                    : users_meta.current_page < users_meta.last_page &&
                                                      !usersLoadingMore && (
                                                          <p className="py-1 text-center text-[10px] text-muted-foreground">
                                                              Scroll for more
                                                          </p>
                                                      )}
                                            </div>
                                        </motion.div>
                                    </TabsContent>

                                    <TabsContent value="roles" className="mt-4 outline-none">
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                                            className="space-y-2"
                                        >
                                            <Label className="flex items-center gap-2 text-base">
                                                <Shield className="h-4 w-4 text-muted-foreground" aria-hidden />
                                                Send to users with these roles
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                Email and SMS go to every verified user who has any of these roles (e.g.
                                                Supporters, Care Alliance, Organization).
                                            </p>
                                            <div className="max-h-48 overflow-y-auto rounded-lg border border-input bg-muted/30 p-3 dark:bg-muted/10">
                                                {roles.length === 0 ? (
                                                    <p className="px-1 py-2 text-sm text-muted-foreground">
                                                        No roles available for targeting.
                                                    </p>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {roles.map((role) => {
                                                            const selected = selectedRoles.includes(role)
                                                            return (
                                                                <Badge
                                                                    key={role}
                                                                    asChild
                                                                    variant={selected ? 'default' : 'outline'}
                                                                    className="rounded-full px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:opacity-90"
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRoleToggle(role)}
                                                                        className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                                    >
                                                                        {formatRoleLabel(role)}
                                                                    </button>
                                                                </Badge>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    </TabsContent>

                                    <TabsContent value="organizations" className="mt-4 outline-none">
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                                            className="space-y-2"
                                        >
                                            <Label>Select Organizations</Label>
                                            <p className="text-xs text-muted-foreground">
                                                All approved nonprofits on the platform, including Care Alliance hubs.
                                                Messages go to each org’s contact email and linked user accounts where
                                                applicable.
                                            </p>
                                            <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl border bg-muted/20 p-2.5">
                                                {organizations.map((org) => (
                                                    <NewsletterOrgPickCard
                                                        key={org.id}
                                                        org={org}
                                                        selected={selectedOrganizations.includes(org.id)}
                                                        onToggle={() => handleOrganizationToggle(org.id)}
                                                    />
                                                ))}
                                            </div>
                                        </motion.div>
                                    </TabsContent>

                                    <TabsContent value="specific" className="mt-4 outline-none">
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                                            className="space-y-6"
                                        >
                                            <div className="space-y-2">
                                                <Label>Select Users</Label>
                                                {audience_scope === 'organization' && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Verified accounts with the Supporters role — same pool as &quot;all
                                                        supporters&quot;.
                                                    </p>
                                                )}
                                                {audience_scope === 'organization' && stats.supporters === 0 && (
                                                    <p className="text-sm text-amber-700 dark:text-amber-300">
                                                        No verified Supporters-role accounts yet.
                                                    </p>
                                                )}
                                                <div
                                                    className="max-h-72 space-y-3 overflow-y-auto rounded-xl border bg-muted/20 p-2.5"
                                                    onScroll={(e) => maybeLoadMoreUserPicker(e.currentTarget)}
                                                >
                                                    {usersForPicker.map((user) => (
                                                        <NewsletterUserPickCard
                                                            key={user.id}
                                                            user={user}
                                                            selected={selectedUsers.includes(user.id)}
                                                            onToggle={() => handleUserToggle(user.id)}
                                                        />
                                                    ))}
                                                    {(audience_scope === "organization"
                                                        ? supportersLoadingMore
                                                        : usersLoadingMore) && (
                                                        <p className="py-2 text-center text-xs text-muted-foreground">
                                                            Loading more…
                                                        </p>
                                                    )}
                                                    {audience_scope === "organization"
                                                        ? supporter_users_meta &&
                                                          supporter_users_meta.current_page <
                                                              supporter_users_meta.last_page &&
                                                          !supportersLoadingMore && (
                                                              <p className="py-1 text-center text-[10px] text-muted-foreground">
                                                                  Scroll for more
                                                              </p>
                                                          )
                                                        : users_meta.current_page < users_meta.last_page &&
                                                          !usersLoadingMore && (
                                                              <p className="py-1 text-center text-[10px] text-muted-foreground">
                                                                  Scroll for more
                                                              </p>
                                                          )}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Select Organizations</Label>
                                                <p className="text-xs text-muted-foreground">
                                                    All approved nonprofits on the platform, including Care Alliance hubs.
                                                </p>
                                                <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl border bg-muted/20 p-2.5">
                                                    {organizations.map((org) => (
                                                        <NewsletterOrgPickCard
                                                            key={org.id}
                                                            org={org}
                                                            selected={selectedOrganizations.includes(org.id)}
                                                            onToggle={() => handleOrganizationToggle(org.id)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-2 text-base">
                                                    <Shield className="h-4 w-4 text-muted-foreground" aria-hidden />
                                                    Roles
                                                </Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Optional: add everyone with these roles in addition to the users and
                                                    organizations you selected above.
                                                </p>
                                                <div className="max-h-48 overflow-y-auto rounded-lg border border-input bg-muted/30 p-3 dark:bg-muted/10">
                                                    {roles.length === 0 ? (
                                                        <p className="px-1 py-2 text-sm text-muted-foreground">
                                                            No roles available for targeting.
                                                        </p>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            {roles.map((role) => {
                                                                const selected = selectedRoles.includes(role)
                                                                return (
                                                                    <Badge
                                                                        key={role}
                                                                        asChild
                                                                        variant={selected ? 'default' : 'outline'}
                                                                        className="rounded-full px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:opacity-90"
                                                                    >
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRoleToggle(role)}
                                                                            className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                                        >
                                                                            {formatRoleLabel(role)}
                                                                        </button>
                                                                    </Badge>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>

                        {/* Newsletter Summary */}
                        {(data.subject || data.content) && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Newsletter Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-xs text-gray-500">Subject</Label>
                                            <p className="text-sm font-medium">{data.subject || 'Not set'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">Schedule</Label>
                                            <p className="text-sm font-medium capitalize">{data.schedule_type}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">Target Type</Label>
                                            <p className="text-sm font-medium">
                                                {data.target_type === 'roles'
                                                    ? 'By role'
                                                    : data.target_type === 'specific'
                                                      ? 'Custom'
                                                      : data.target_type.replace(/_/g, ' ')}
                                            </p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">Recipients</Label>
                                            <p className="text-sm font-medium text-primary">{getTargetCount()}</p>
                                        </div>
                                    </div>
                                    {(data.schedule_type === 'scheduled' || data.schedule_type === 'recurring') && data.send_date && (
                                        <div>
                                            <Label className="text-xs text-gray-500">
                                                {data.schedule_type === 'recurring' ? 'Start Date' : 'Send Date'}
                                            </Label>
                                            <p className="text-sm font-medium">
                                                {new Date(data.send_date).toLocaleString()}
                                            </p>
                                        </div>
                                    )}
                                    {data.schedule_type === 'recurring' && (
                                        <div>
                                            <Label className="text-xs text-gray-500">Recurring Pattern</Label>
                                            <p className="text-sm font-medium">
                                                Every {recurringInterval} {recurringType}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => window.history.back()}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!selectedTemplate || processing || getTargetCount() === 0}
                                className="flex items-center gap-2"
                            >
                                <Send className="h-4 w-4" />
                                {processing ? 'Creating...' : 'Create Newsletter'}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>

            <SubscriptionRequiredModal
                isOpen={proTargetingModalOpen}
                onClose={() => setProTargetingModalOpen(false)}
                feature="newsletter_targeting"
                newsletterPayOnceUsd={newsletter_pro_targeting_lifetime_price_usd}
                newsletterPayOnceEnabled={newsletter_pro_targeting_purchase_enabled}
            />
        </AppSidebarLayout>
    )
}
