"use client"

import { Head, Link, router, useForm, usePage } from "@inertiajs/react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TextArea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useRef, useState } from "react"
import {
    ArrowLeft,
    Save,
    Send,
    Calendar,
    Eye,
    AlertCircle,
    Code,
    Copy,
    Check,
    MessageSquare,
    Mail,
    CheckCircle2,
    Sparkles,
    Loader2,
    FileText,
    ChevronRight,
    Coins,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
    NEWSLETTER_AI_BRIEF_EXAMPLES,
    NEWSLETTER_AI_TONES,
    type NewsletterAiTone,
} from "@/lib/newsletter-ai-presets"
import type { SharedData } from "@/types"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import { getBrowserTimezone, convertUserTimezoneToUTC } from "@/lib/timezone-detection"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
/** Matches backend NewsletterController::NEWSLETTER_SMS_PLAIN_MAX_CHARS */
const SMS_PLAIN_MAX_CHARS = 160

interface Template {
    id: number
    name: string
    subject: string
    content: string
    html_content?: string
    template_type: string
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

type NewsletterCreateAiResult =
    | {
          ok: true
          output_mode?: string
          subject: string
          content: string
          html_content: string
          tokens_used?: number
          ai_tokens_used?: number
          ai_tokens_included?: number
      }
    | {
          ok: false
          message: string
          code?: string
      }
    | null

interface NewsletterCreateProps {
    templates: Template[]
    previewData?: PreviewData
    openAiConfigured?: boolean
    newsletterCreateAiResult?: NewsletterCreateAiResult
}

/** Segmented control track (add flex or grid on the element) + tab states — violet → fuchsia brand gradient. */
const gradientTabTrack =
    "rounded-lg border border-violet-200/80 bg-gradient-to-r from-violet-100/50 via-fuchsia-100/40 to-indigo-100/45 p-1 shadow-sm dark:border-violet-800/55 dark:from-violet-950/55 dark:via-fuchsia-950/45 dark:to-indigo-950/45"
const gradientTabActive =
    "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md dark:from-violet-500 dark:to-fuchsia-600"
const gradientTabInactive =
    "text-violet-900/75 hover:bg-white/80 dark:text-violet-100/75 dark:hover:bg-violet-950/70"

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
            <div className="flex-1 min-w-0 flex-grow">
                <button
                    type="button"
                    onClick={handleCopy}
                    className="text-left w-full"
                    title={`Click to copy ${variable}`}
                >
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono block mb-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors break-all">
                        {variable}
                    </code>
                    <div className="text-xs text-gray-600 dark:text-gray-400 break-words">
                        <span>{description}</span>
                        {sampleValue && (
                            <span className="ml-2 text-gray-500 dark:text-gray-500 break-all">
                                → {sampleValue.length > 50 ? sampleValue.substring(0, 50) + '...' : sampleValue}
                            </span>
                        )}
                    </div>
                </button>
            </div>
            <button
                type="button"
                onClick={handleCopy}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0 flex-shrink-0"
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

export default function NewsletterCreate({
    templates,
    previewData,
    openAiConfigured = false,
    newsletterCreateAiResult = null,
}: NewsletterCreateProps) {
    const page = usePage<SharedData & { errors?: Record<string, string | string[]> }>()
    const pageErrors = page.props.errors
    const authUser = page.props.auth?.user as
        | {
              credits?: number
              ai_tokens_used?: number
              ai_tokens_included?: number
          }
        | undefined
    const credits = Number(authUser?.credits ?? 0)
    const aiTokensUsedAuth = Number(authUser?.ai_tokens_used ?? 0)
    const aiTokensIncludedAuth = Number(authUser?.ai_tokens_included ?? 0)
    const displayTokensUsed =
        newsletterCreateAiResult && newsletterCreateAiResult.ok
            ? Number(newsletterCreateAiResult.ai_tokens_used ?? aiTokensUsedAuth)
            : aiTokensUsedAuth
    const displayTokensIncluded =
        newsletterCreateAiResult && newsletterCreateAiResult.ok
            ? Number(newsletterCreateAiResult.ai_tokens_included ?? aiTokensIncludedAuth)
            : aiTokensIncludedAuth
    const hasAiTokensLeft = displayTokensIncluded === 0 || displayTokensUsed < displayTokensIncluded
    const aiTokensRemaining =
        displayTokensIncluded === 0 ? null : Math.max(0, displayTokensIncluded - displayTokensUsed)
    const aiTokensOverBy =
        displayTokensIncluded === 0 ? 0 : Math.max(0, displayTokensUsed - displayTokensIncluded)

    const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1)
    /** Boss-style: Newsletter = rich email, Letter = simpler printable-style email, Message = SMS */
    const [communicationKind, setCommunicationKind] = useState<"newsletter" | "letter" | "message">("newsletter")
    const [aiBrief, setAiBrief] = useState("")
    const [aiTone, setAiTone] = useState<NewsletterAiTone>("warm")
    const [aiGenerating, setAiGenerating] = useState(false)
    const appliedAiSigRef = useRef<string | null>(null)

    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
    const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled'>('immediate')
    const [showPreview, setShowPreview] = useState(false)
    const [creditCheckoutLoading, setCreditCheckoutLoading] = useState(false)

    const handleCreditTopUp = () => {
        setCreditCheckoutLoading(true)
        router.post(
            route("credits.checkout"),
            { amount: 1.0, return_route: "newsletter.create" },
            {
                preserveScroll: true,
                onError: () => setCreditCheckoutLoading(false),
                onFinish: () => setCreditCheckoutLoading(false),
            }
        )
    }

    const { data, setData, post, processing, errors } = useForm({
        newsletter_template_id: '',
        subject: '',
        content: '',
        html_content: '',
        send_via: 'email' as 'email' | 'sms' | 'both',
        schedule_type: 'immediate' as 'immediate' | 'scheduled',
        send_date: '',
        target_type: 'all' as 'all',
        target_users: [] as number[],
        target_organizations: [] as number[],
        target_roles: [] as string[],
        is_public: false,
    })

    // Use real data from backend, fallback to demo data if not available
    // Ensure all properties have fallback values to prevent undefined errors
    const sampleData: PreviewData = {
        organization_name: previewData?.organization_name || 'Your Organization',
        organization_email: previewData?.organization_email || 'wendhi@stuttiegroup.com',
        organization_phone: previewData?.organization_phone || '+1 (555) 000-0000',
        organization_address: previewData?.organization_address || 'Your Organization Address',
        recipient_name: previewData?.recipient_name || 'Recipient Name',
        recipient_email: previewData?.recipient_email || 'recipient@example.com',
        current_date: previewData?.current_date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        current_year: previewData?.current_year || new Date().getFullYear().toString(),
        unsubscribe_link: previewData?.unsubscribe_link || 'https://example.com/unsubscribe?token=preview_token',
        public_view_link: previewData?.public_view_link || 'https://example.com/newsletter/public/preview',
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

    const handleTemplateChange = (templateId: string) => {
        const template = templates.find(t => t.id === parseInt(templateId))
        if (template) {
            setSelectedTemplate(template)
            setData({
                ...data,
                newsletter_template_id: templateId,
                subject: template.subject,
                content: template.content,
                html_content: template.html_content || '',
            })
        }
    }

    const aiTemplateTypeForBackend = communicationKind === "letter" ? "announcement" : "newsletter"

    useEffect(() => {
        if (!newsletterCreateAiResult || !newsletterCreateAiResult.ok) {
            return
        }
        const sig = `${newsletterCreateAiResult.subject}|${newsletterCreateAiResult.content?.length ?? 0}|${newsletterCreateAiResult.html_content?.length ?? 0}`
        if (appliedAiSigRef.current === sig) {
            return
        }
        appliedAiSigRef.current = sig
        setData("subject", newsletterCreateAiResult.subject)
        setData("content", newsletterCreateAiResult.content)
        setData("html_content", newsletterCreateAiResult.html_content ?? "")
        setWizardStep(2)
    }, [newsletterCreateAiResult])

    const applyCommunicationKind = (kind: "newsletter" | "letter" | "message") => {
        setCommunicationKind(kind)
        if (kind === "message") {
            setData("send_via", "sms")
            setData("html_content", "")
        } else {
            setData("send_via", "email")
        }
    }

    const submitAiBrief = () => {
        if (!aiBrief.trim() || aiGenerating || !openAiConfigured || !hasAiTokensLeft) {
            return
        }
        setAiGenerating(true)
        const outputMode = data.send_via === "sms" ? "plain" : "html"
        router.post(
            route("newsletter.create.ai-generate"),
            {
                brief: aiBrief.trim(),
                template_type: aiTemplateTypeForBackend,
                tone: aiTone,
                output_mode: outputMode,
                send_via: data.send_via,
            },
            {
                preserveScroll: true,
                onFinish: () => setAiGenerating(false),
            }
        )
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (wizardStep !== 3) {
            return
        }

        // Prepare submit data
        const submitData: any = {
            ...data,
            schedule_type: scheduleType,
        }

        // Only include send_date if scheduled
        if (scheduleType === 'scheduled') {
            if (!data.send_date) {
                alert('Please select a send date and time for scheduled newsletters.')
                return
            }
            // Convert user's timezone to UTC before sending
            const utcDate = convertUserTimezoneToUTC(data.send_date, getBrowserTimezone())
            submitData.send_date = utcDate.toISOString()
        } else {
            // Remove send_date for immediate
            delete submitData.send_date
        }

        post(route('newsletter.store'), {
            data: submitData,
            onSuccess: () => {
                router.visit(route('newsletter.index'), {
                    only: ['newsletters', 'stats']
                })
            }
        })
    }

    const hasBody =
        data.send_via === "sms"
            ? Boolean(data.content?.trim())
            : data.send_via === "both"
              ? Boolean(data.content?.trim() && data.html_content?.trim())
              : Boolean(data.content?.trim() || data.html_content?.trim())

    return (
        <AppSidebarLayout>
            <Head title="Create Newsletter" />

            <div className="w-full max-w-none space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 lg:px-8 animate-in fade-in duration-500">
                {/* Header + stepper (single-page wizard) */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <Button variant="outline" size="sm" onClick={() => window.history.back()}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                                    Step {wizardStep} of 3
                                </p>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                                    {wizardStep === 1 && "Create communication"}
                                    {wizardStep === 2 && "Write & preview"}
                                    {wizardStep === 3 && "Schedule & send"}
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {wizardStep === 1 && "Choose a format, optional template, or generate with AI — all in one place."}
                                    {wizardStep === 2 && "Edit subject and body. Use Preview to check merge tags."}
                                    {wizardStep === 3 && "When to send and how (email, SMS, or both). Then save or schedule."}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex shrink-0 gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
                        {([1, 2, 3] as const).map((s) => (
                            <div
                                key={s}
                                className={cn(
                                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                                    wizardStep === s
                                        ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow"
                                        : wizardStep > s
                                          ? "text-foreground/80"
                                          : "text-muted-foreground"
                                )}
                            >
                                {s === 1 ? "Start" : s === 2 ? "Compose" : "Send"}
                            </div>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Step 1 — kind + template + AI (boss brief: one place to start) */}
                    {wizardStep === 1 && (
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full space-y-6"
                        >
                            <Card className="border-violet-200/50 shadow-lg dark:border-violet-900/40">
                                <CardHeader>
                                    <CardTitle>What do you want to send?</CardTitle>
                                    <CardDescription>
                                        Newsletter = rich email. Letter = simpler email (good for printing). Message = SMS.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        {(
                                            [
                                                {
                                                    kind: "newsletter" as const,
                                                    label: "Newsletter",
                                                    desc: "Engaging email with optional HTML & images.",
                                                    icon: Mail,
                                                },
                                                {
                                                    kind: "letter" as const,
                                                    label: "Letter",
                                                    desc: "Simpler email — easy to read or print.",
                                                    icon: FileText,
                                                },
                                                {
                                                    kind: "message" as const,
                                                    label: "Message",
                                                    desc: "SMS — short, instant delivery.",
                                                    icon: MessageSquare,
                                                },
                                            ] as const
                                        ).map(({ kind, label, desc, icon: Icon }) => (
                                            <button
                                                key={kind}
                                                type="button"
                                                onClick={() => applyCommunicationKind(kind)}
                                                className={cn(
                                                    "flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all",
                                                    communicationKind === kind
                                                        ? "border-violet-500 bg-violet-500/10 shadow-md dark:border-violet-400"
                                                        : "border-border/60 bg-card hover:border-violet-300/80 dark:hover:border-violet-700"
                                                )}
                                            >
                                                <Icon className="h-6 w-6 text-violet-600 dark:text-violet-400" aria-hidden />
                                                <span className="font-semibold text-foreground">{label}</span>
                                                <span className="text-xs text-muted-foreground leading-snug">{desc}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="template">Saved template (optional)</Label>
                                        <Select value={data.newsletter_template_id} onValueChange={handleTemplateChange}>
                                            <SelectTrigger id="template">
                                                <SelectValue placeholder="Skip or pick a template" />
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
                                            <p className="text-sm text-red-600">{errors.newsletter_template_id}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            Manage reusable templates in{" "}
                                            <Link
                                                href={route("newsletter.templates")}
                                                className="font-medium text-violet-600 underline underline-offset-2 dark:text-violet-400"
                                            >
                                                Templates
                                            </Link>
                                            .
                                        </p>
                                    </div>

                                    {openAiConfigured && data.send_via !== "sms" && (
                                        <div className="space-y-4 rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-500/[0.06] via-background to-fuchsia-500/[0.04] p-4 shadow-sm dark:border-violet-800/50 dark:from-violet-950/30 dark:to-fuchsia-950/10">
                                            <div className="flex items-start gap-3">
                                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/15 ring-1 ring-violet-500/15">
                                                    <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" aria-hidden />
                                                </span>
                                                <div className="min-w-0 space-y-1">
                                                    <p className="text-sm font-semibold text-foreground">AI draft from your idea</p>
                                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                                        Tone controls voice and HTML styling. Examples set the tone for you — edit before
                                                        generating.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 py-2.5 text-xs">
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                                                        <Coins className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                                                        Wallet credits: {credits.toLocaleString()}
                                                    </span>
                                                    <span className="inline-flex flex-wrap items-center gap-x-1.5 text-muted-foreground">
                                                        <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden />
                                                        {displayTokensIncluded === 0 ? (
                                                            <>
                                                                AI tokens used: {displayTokensUsed.toLocaleString()}
                                                                <span className="text-muted-foreground/80"> (no plan cap)</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="font-medium text-foreground">Plan AI tokens:</span>
                                                                {displayTokensUsed.toLocaleString()} used of{" "}
                                                                {displayTokensIncluded.toLocaleString()} included
                                                                {aiTokensRemaining !== null && (
                                                                    <>
                                                                        {" "}
                                                                        ·{" "}
                                                                        <span
                                                                            className={
                                                                                aiTokensRemaining === 0
                                                                                    ? "font-semibold text-destructive"
                                                                                    : "font-medium text-foreground"
                                                                            }
                                                                        >
                                                                            {aiTokensRemaining.toLocaleString()} remaining
                                                                        </span>
                                                                        {aiTokensOverBy > 0 && (
                                                                            <span className="text-destructive">
                                                                                {" "}
                                                                                (over allowance by{" "}
                                                                                {aiTokensOverBy.toLocaleString()})
                                                                            </span>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </>
                                                        )}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] leading-snug text-muted-foreground/90">
                                                    Wallet credits and AI usage are separate meters. Top up adds wallet credits and, if
                                                    your plan has a token cap, increases your included AI allowance by the same amount.
                                                </p>
                                            </div>
                                            {openAiConfigured && !hasAiTokensLeft && displayTokensIncluded > 0 && (
                                                <div className="flex flex-col gap-3 rounded-lg border border-destructive/35 bg-destructive/5 p-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="flex min-w-0 items-start gap-2">
                                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                                                        <span>
                                                            AI token limit reached (same pool as AI Chat). Use Top up to add wallet
                                                            credits and extend your included AI allowance, or wait for renewal.
                                                        </span>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        disabled={creditCheckoutLoading || aiGenerating}
                                                        onClick={handleCreditTopUp}
                                                        className="shrink-0 inline-flex items-center gap-2 bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
                                                    >
                                                        {creditCheckoutLoading ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                                        ) : (
                                                            <>
                                                                <Coins className="h-4 w-4" aria-hidden />
                                                                Top up
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium text-foreground">Tone & visual style</Label>
                                                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                                                    {NEWSLETTER_AI_TONES.map(({ id, label, hint, Icon }) => {
                                                        const active = aiTone === id
                                                        return (
                                                            <button
                                                                key={id}
                                                                type="button"
                                                                disabled={aiGenerating}
                                                                onClick={() => setAiTone(id)}
                                                                className={cn(
                                                                    "flex flex-col items-start gap-1.5 rounded-lg border p-2.5 text-left transition-all",
                                                                    active
                                                                        ? "border-violet-500 bg-violet-500/10 shadow-sm ring-1 ring-violet-500/25 dark:border-violet-400/60"
                                                                        : "border-border/70 bg-card/60 hover:border-violet-300/50 dark:hover:border-violet-800/50"
                                                                )}
                                                            >
                                                                <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                                                    <Icon className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" aria-hidden />
                                                                    {label}
                                                                </span>
                                                                <span className="line-clamp-3 text-[10px] leading-snug text-muted-foreground">
                                                                    {hint}
                                                                </span>
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="ai_brief_create" className="text-xs font-medium">
                                                    Your brief
                                                </Label>
                                                <TextArea
                                                    id="ai_brief_create"
                                                    value={aiBrief}
                                                    onChange={(e) => setAiBrief(e.target.value)}
                                                    placeholder='e.g. "Winter shelter drive — need blankets and volunteers; include donate link CTA"'
                                                    rows={4}
                                                    className="resize-y border-border/80 bg-background/90"
                                                />
                                            </div>
                                            <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Example prompts
                                                </p>
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {NEWSLETTER_AI_BRIEF_EXAMPLES.slice(0, 8).map((ex) => (
                                                        <Button
                                                            key={ex.label}
                                                            type="button"
                                                            variant="secondary"
                                                            size="sm"
                                                            className="h-7 rounded-full px-2.5 text-[10px] font-normal"
                                                            disabled={aiGenerating}
                                                            onClick={() => {
                                                                setAiBrief(ex.text)
                                                                setAiTone(ex.tone)
                                                            }}
                                                        >
                                                            {ex.label}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3">
                                                <p className="min-w-0 flex-1 text-[11px] text-muted-foreground">
                                                    Merge tags follow your org rules. SMS-only sends skip HTML.
                                                </p>
                                                <Button
                                                    type="button"
                                                    className="shrink-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-sm"
                                                    disabled={!aiBrief.trim() || aiGenerating || !hasAiTokensLeft}
                                                    onClick={submitAiBrief}
                                                >
                                                    {aiGenerating ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Generating…
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Sparkles className="mr-2 h-4 w-4" />
                                                            Generate content
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {openAiConfigured && data.send_via === "sms" && (
                                        <div className="rounded-lg border border-amber-200/60 bg-amber-500/10 p-3 text-sm text-amber-900 dark:border-amber-800 dark:text-amber-200">
                                            For SMS, write the short message in the next step, or switch to Newsletter / Letter above to use AI
                                            with email HTML.
                                        </div>
                                    )}

                                    {newsletterCreateAiResult && !newsletterCreateAiResult.ok && (
                                        <p className="text-sm text-red-600 dark:text-red-400">
                                            {newsletterCreateAiResult.message}
                                        </p>
                                    )}
                                    {typeof pageErrors?.brief === "string" && (
                                        <p className="text-sm text-red-600">{pageErrors.brief}</p>
                                    )}

                                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-4">
                                        <Button
                                            type="button"
                                            variant="default"
                                            onClick={() => setWizardStep(2)}
                                            className="bg-gradient-to-r from-violet-600 to-fuchsia-600"
                                        >
                                            Next
                                            <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {wizardStep >= 2 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setWizardStep(1)}>
                                        <ArrowLeft className="mr-1 h-4 w-4" />
                                        Edit start
                                    </Button>
                                    {wizardStep === 2 && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setShowPreview(true)}
                                                disabled={!data.subject?.trim() && !hasBody}
                                            >
                                                <Eye className="mr-1 h-4 w-4" />
                                                Preview
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={!data.subject?.trim() || !hasBody}
                                                onClick={() => setWizardStep(3)}
                                            >
                                                Scheduling
                                                <ChevronRight className="ml-1 h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>

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
                                                {data.send_via === "sms" &&
                                                    `Plain text for SMS — no HTML. Body is limited to ${SMS_PLAIN_MAX_CHARS} characters (one standard segment).`}
                                                {data.send_via === "email" && "Plain text and/or HTML for email."}
                                                {data.send_via === "both" &&
                                                    "Plain text for SMS (required) and HTML for email (required)."}
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
                                                <Label htmlFor="content">
                                                    {data.send_via === "sms"
                                                        ? "SMS message (plain text)"
                                                        : data.send_via === "both"
                                                          ? "SMS message (plain text, required)"
                                                          : "Plain text content"}
                                                </Label>
                                                <TextArea
                                                    id="content"
                                                    value={data.content}
                                                    onChange={(e) => setData('content', e.target.value)}
                                                    placeholder={
                                                        data.send_via === "sms"
                                                            ? "Short plain text for SMS — no HTML"
                                                            : "Plain text body (required for SMS leg when using Both)"
                                                    }
                                                    rows={data.send_via === "sms" ? 8 : 10}
                                                    maxLength={
                                                        data.send_via === "sms" ? SMS_PLAIN_MAX_CHARS : undefined
                                                    }
                                                    className="mt-1"
                                                />
                                                {data.send_via === "sms" && (
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {(data.content?.length ?? 0)} / {SMS_PLAIN_MAX_CHARS} characters
                                                    </p>
                                                )}
                                                {errors.content && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.content}</p>
                                                )}
                                            </div>

                                            {data.send_via !== "sms" && (
                                                <div>
                                                    <Label htmlFor="html_content">
                                                        {data.send_via === "both"
                                                            ? "HTML content for email (required)"
                                                            : "HTML content (optional)"}
                                                    </Label>
                                                    <TextArea
                                                        id="html_content"
                                                        value={data.html_content}
                                                        onChange={(e) => setData('html_content', e.target.value)}
                                                        placeholder={
                                                            data.send_via === "both"
                                                                ? "HTML version for the email channel"
                                                                : "HTML for rich email clients; plain text above is still used for multipart email"
                                                        }
                                                        rows={10}
                                                        className="mt-1 font-mono text-sm"
                                                    />
                                                    {errors.html_content && (
                                                        <p className="text-sm text-red-600 mt-1">{errors.html_content}</p>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                {wizardStep >= 3 && (
                                    <div className="flex justify-end">
                                        <Button type="button" variant="ghost" size="sm" onClick={() => setWizardStep(2)}>
                                            <ArrowLeft className="mr-1 h-4 w-4" />
                                            Back to compose
                                        </Button>
                                    </div>
                                )}

                                {/* Scheduling — step 3 */}
                                {wizardStep >= 3 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                >
                                    <Card className="shadow-lg">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Calendar className="h-5 w-5" />
                                                Scheduling
                                            </CardTitle>
                                            <CardDescription>
                                                When to send, and how recipients receive it (SMS plain text, email, or both).
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-3">
                                                <Label>Send schedule</Label>
                                                <div className={`grid grid-cols-2 gap-1 ${gradientTabTrack}`}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setScheduleType('immediate')
                                                            setData('schedule_type', 'immediate')
                                                            setData('send_date', '')
                                                        }}
                                                        className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-all ${
                                                            scheduleType === 'immediate'
                                                                ? gradientTabActive
                                                                : gradientTabInactive
                                                        }`}
                                                    >
                                                        <Send className="h-4 w-4 shrink-0" />
                                                        Immediate
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setScheduleType('scheduled')
                                                            setData('schedule_type', 'scheduled')
                                                        }}
                                                        className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-all ${
                                                            scheduleType === 'scheduled'
                                                                ? gradientTabActive
                                                                : gradientTabInactive
                                                        }`}
                                                    >
                                                        <Calendar className="h-4 w-4 shrink-0" />
                                                        Scheduled
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <Label>Send via</Label>
                                                <div className={`flex gap-1 ${gradientTabTrack}`}>
                                                    {(
                                                        [
                                                            { id: "sms" as const, label: "SMS", icon: MessageSquare },
                                                            { id: "email" as const, label: "Email", icon: Mail },
                                                            { id: "both" as const, label: "Both", icon: CheckCircle2 },
                                                        ] as const
                                                    ).map(({ id, label, icon: Icon }) => (
                                                        <button
                                                            key={id}
                                                            type="button"
                                                            onClick={() => {
                                                                setData("send_via", id)
                                                                if (id === "sms") {
                                                                    setData("html_content", "")
                                                                }
                                                            }}
                                                            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2.5 text-xs font-medium transition-all sm:text-sm ${
                                                                data.send_via === id ? gradientTabActive : gradientTabInactive
                                                            }`}
                                                        >
                                                            <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                                                            {label}
                                                        </button>
                                                    ))}
                                                </div>
                                                {errors.send_via && (
                                                    <p className="text-sm text-red-600 dark:text-red-400">{errors.send_via}</p>
                                                )}
                                            </div>

                                            {scheduleType === 'scheduled' && (
                                                <div>
                                                    <Label htmlFor="send_date">Send Date & Time</Label>
                                                    <Input
                                                        id="send_date"
                                                        type="datetime-local"
                                                        value={data.send_date}
                                                        onChange={(e) => setData('send_date', e.target.value)}
                                                        className="mt-1"
                                                        required={scheduleType === 'scheduled'}
                                                    />
                                                    {errors.send_date && (
                                                        <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                                                            <AlertCircle className="h-3 w-3" />
                                                            {errors.send_date}
                                                        </p>
                                                    )}
                                                    {errors.scheduled_at && (
                                                        <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                                                            <AlertCircle className="h-3 w-3" />
                                                            {errors.scheduled_at}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                                )}

                                {wizardStep >= 3 && (
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
                                                disabled={processing || !data.subject || !hasBody}
                                            >
                                                <Save className="h-4 w-4 mr-2" />
                                                {processing ? 'Creating...' : scheduleType === 'scheduled' ? 'Schedule Newsletter' : 'Save as Draft'}
                                            </Button>

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="w-full"
                                                onClick={() => setShowPreview(true)}
                                                disabled={!data.subject && !hasBody}
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                Preview
                                                </Button>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                                )}

                                {/* Newsletter Summary */}
                                {wizardStep >= 3 && (data.subject || data.content) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: 0.5 }}
                                    >
                                        <Card className="shadow-lg">
                                            <CardHeader>
                                                <CardTitle>Newsletter Summary</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <div>
                                                    <Label className="text-xs text-gray-500">Subject</Label>
                                                    <p className="text-sm font-medium">{data.subject || 'Not set'}</p>
                                                    </div>
                                                <div>
                                                    <Label className="text-xs text-gray-500">Schedule</Label>
                                                    <p className="text-sm font-medium capitalize">{scheduleType}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-gray-500">Send via</Label>
                                                    <p className="text-sm font-medium">
                                                        {data.send_via === "sms"
                                                            ? "SMS"
                                                            : data.send_via === "both"
                                                              ? "SMS & email"
                                                              : "Email"}
                                                    </p>
                                                </div>
                                                {scheduleType === 'scheduled' && data.send_date && (
                                                    <div>
                                                        <Label className="text-xs text-gray-500">Send Date</Label>
                                                        <p className="text-sm font-medium">
                                                            {new Date(data.send_date).toLocaleString()}
                                                        </p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )}

                                {/* Available Variables — steps 2–3 (below Scheduling / Actions / Summary on step 3) */}
                                {wizardStep >= 2 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: 0.4 }}
                                    >
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
                                                            💡 <strong>Tip:</strong> Variables are replaced in Preview with your org data.
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    )}

                    </form>

                    {/* Preview Modal */}
                    <Dialog open={showPreview} onOpenChange={setShowPreview}>
                        <DialogContent className="w-[calc(100vw-2rem)] max-w-xl max-h-[min(85vh,720px)] overflow-y-auto sm:max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Newsletter Preview</DialogTitle>
                                <DialogDescription>
                                    Preview how your newsletter will look to recipients (variables replaced with real data)
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="border rounded-lg p-6 bg-white dark:bg-gray-800">
                                    <div className="mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Subject Preview:</p>
                                        <h3 className="font-semibold text-xl">
                                            {previewSubject || data.subject || selectedTemplate?.subject || 'Newsletter Subject'}
                                        </h3>
                                    </div>
                                    {previewHtmlContent ? (
                                        <div
                                            className="prose prose-sm max-w-none dark:prose-invert"
                                            dangerouslySetInnerHTML={{ __html: previewHtmlContent }}
                                        />
                                    ) : (
                                        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                            {previewContent || data.content || selectedTemplate?.content || 'Newsletter content will appear here...'}
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
