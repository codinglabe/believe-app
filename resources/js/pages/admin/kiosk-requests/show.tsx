"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, router, usePage } from "@inertiajs/react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft,
  ClipboardList,
  ExternalLink,
  Pencil,
  Trash2,
  User,
  MapPin,
  Link2,
  Sparkles,
  Clock,
  CheckCircle2,
  CircleDot,
  XCircle,
} from "lucide-react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { cn } from "@/lib/utils"

interface RequestRecord {
  id: number
  requester_name: string | null
  requester_email: string | null
  display_name: string
  category_slug: string
  category_title: string
  subcategory: string
  state: string
  city: string
  url: string
  details: string
  status: string
  ai_decision: string | null
  ai_reason: string
  ai_suggested_url: string | null
  approved_kiosk_provider_id: number | null
  market_code: string | null
  created_at: string | null
  updated_at: string | null
  approved_at: string | null
  resolved_at: string | null
  ai_tokens_used: number
}

interface PageProps {
  requestRecord: RequestRecord
  flash?: { success?: string }
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase()
  if (s === "approved") {
    return (
      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 border-0 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
        Approved
      </Badge>
    )
  }
  if (s === "rejected") {
    return (
      <Badge className="bg-red-600 text-white hover:bg-red-600 border-0 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
        Rejected
      </Badge>
    )
  }
  return (
    <Badge className="bg-amber-500 text-white hover:bg-amber-500 border-0 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
      Pending
    </Badge>
  )
}

export default function KioskRequestShow({ requestRecord }: PageProps) {
  const { flash } = usePage<PageProps>().props
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)

  useEffect(() => {
    if (flash?.success) {
      showSuccessToast(flash.success)
    }
  }, [flash?.success])

  const listHref = route("admin.kiosk.requests.index")
  const editHref = route("admin.kiosk.requests.edit", requestRecord.id)

  const patchStatus = (next: string) => {
    if (next === requestRecord.status) return
    setStatusBusy(true)
    router.patch(
      route("admin.kiosk.requests.update-status", requestRecord.id),
      { status: next },
      {
        preserveScroll: true,
        onFinish: () => setStatusBusy(false),
        onError: () => {
          showErrorToast("Could not update status.")
          setStatusBusy(false)
        },
      }
    )
  }

  const handleDelete = () => {
    router.delete(route("admin.kiosk.requests.destroy", requestRecord.id), {
      onError: () => {
        showErrorToast("Failed to delete.")
        setDeleteOpen(false)
      },
    })
  }

  const breadcrumbs = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Kiosk Management", href: route("admin.kiosk.index") },
    { title: "Kiosk Requests", href: listHref },
    { title: requestRecord.display_name, href: route("admin.kiosk.requests.show", requestRecord.id) },
  ]

  const statusBtn = (value: "approved" | "pending" | "rejected", label: string, Icon: typeof CheckCircle2) => {
    const active = requestRecord.status === value
    return (
      <button
        type="button"
        disabled={statusBusy || active}
        onClick={() => patchStatus(value)}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all",
          active
            ? "bg-primary text-primary-foreground shadow-sm cursor-default"
            : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-transparent hover:border-border disabled:opacity-50"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </button>
    )
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Request — ${requestRecord.display_name}`} />
      <div className="space-y-6 p-4 sm:p-6 w-full max-w-none min-h-screen">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" className="shrink-0 mt-0.5" asChild>
              <Link href={listHref}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">{requestRecord.display_name}</h1>
                <StatusBadge status={requestRecord.status} />
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                {requestRecord.category_title}
                {requestRecord.subcategory ? ` · ${requestRecord.subcategory}` : ""}
                <span className="text-muted-foreground/70"> · #{requestRecord.id}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end lg:pt-1">
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <Link href={editHref}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Main panel */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
          {/* Status actions */}
          <div className="px-5 py-5 sm:px-6 bg-muted/30 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Update status</p>
            <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
              Approved publishes or updates the kiosk item. Pending or rejected deactivates the linked item.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex flex-col sm:flex-row rounded-lg border border-border bg-background p-1 gap-1 w-full sm:w-auto">
                {statusBtn("approved", "Approve", CheckCircle2)}
                {statusBtn("pending", "Pending", CircleDot)}
                {statusBtn("rejected", "Reject", XCircle)}
              </div>
              <p className="text-xs text-muted-foreground sm:text-right">
                Current: <span className="font-medium text-foreground capitalize">{requestRecord.status}</span>
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 md:divide-x divide-border">
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 text-foreground">
                <User className="h-4 w-4 text-primary shrink-0" />
                <h2 className="font-semibold text-sm">Requester</h2>
              </div>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground mb-0.5">Name</dt>
                  <dd className="font-medium">{requestRecord.requester_name ?? "—"}</dd>
                </div>
                <Separator />
                <div>
                  <dt className="text-xs text-muted-foreground mb-0.5">Email</dt>
                  <dd className="font-medium break-all">{requestRecord.requester_email ?? "—"}</dd>
                </div>
                <Separator />
                <div className="flex gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5">Location</dt>
                    <dd className="font-medium">{[requestRecord.city, requestRecord.state].filter(Boolean).join(", ") || "—"}</dd>
                    <dd className="text-xs text-muted-foreground mt-1">Market: {requestRecord.market_code ?? "—"}</dd>
                  </div>
                </div>
              </dl>
            </div>

            <div className="p-5 sm:p-6 space-y-4 border-t md:border-t-0 border-border">
              <div className="flex items-center gap-2 text-foreground">
                <Link2 className="h-4 w-4 text-primary shrink-0" />
                <h2 className="font-semibold text-sm">Links</h2>
              </div>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground mb-1">Submitted URL</dt>
                  <dd>
                    {requestRecord.url ? (
                      <a
                        href={requestRecord.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline break-all"
                      >
                        {requestRecord.url}
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </dd>
                </div>
                <Separator />
                <div>
                  <dt className="text-xs text-muted-foreground mb-1">AI suggested URL</dt>
                  <dd>
                    {requestRecord.ai_suggested_url ? (
                      <a
                        href={requestRecord.ai_suggested_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline break-all"
                      >
                        {requestRecord.ai_suggested_url}
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </dd>
                </div>
                <Separator />
                <div>
                  <dt className="text-xs text-muted-foreground mb-1">Kiosk provider row</dt>
                  <dd>
                    {requestRecord.approved_kiosk_provider_id ? (
                      <span className="font-medium text-foreground">
                        #{requestRecord.approved_kiosk_provider_id} (table <code className="text-xs">kiosk_providers</code>)
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Not linked</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <Separator />

          <div className="p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary shrink-0" />
              <h2 className="font-semibold text-sm">User details</h2>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-foreground whitespace-pre-wrap min-h-[72px]">
              {requestRecord.details?.trim() ? requestRecord.details : <span className="text-muted-foreground">No additional details.</span>}
            </div>
          </div>

          <Separator />

          <div className="p-5 sm:p-6 space-y-3 bg-muted/10">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <h2 className="font-semibold text-sm">AI review</h2>
              <span className="text-xs text-muted-foreground">
                · <span className="capitalize font-medium text-foreground">{requestRecord.ai_decision ?? "—"}</span>
                {requestRecord.ai_tokens_used > 0 && <> · {requestRecord.ai_tokens_used} tokens</>}
              </span>
            </div>
            <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm whitespace-pre-wrap">
              {requestRecord.ai_reason?.trim() ? requestRecord.ai_reason : <span className="text-muted-foreground">No reason recorded.</span>}
            </div>
          </div>

          <Separator />

          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-primary shrink-0" />
              <h2 className="font-semibold text-sm">Timeline</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              {[
                { label: "Created", value: requestRecord.created_at },
                { label: "Updated", value: requestRecord.updated_at },
                { label: "Approved", value: requestRecord.approved_at },
                { label: "Resolved", value: requestRecord.resolved_at },
              ].map((row) => (
                <div key={row.label} className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{row.label}</p>
                  <p className="font-medium tabular-nums mt-1 text-foreground break-words">{row.value ?? "—"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this request?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the request from the list. The kiosk item (if any) is not deleted automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}
