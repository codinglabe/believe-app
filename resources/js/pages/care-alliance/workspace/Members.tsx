"use client"

import { useEffect, useRef, useState } from "react"
import type { CareAllianceJoinRequestRow } from "../types"
import CareAllianceWorkspaceShell from "@/layouts/care-alliance/care-alliance-workspace-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Button } from "@/components/frontend/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/frontend/ui/alert-dialog"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/frontend/ui/tabs"
import { router, usePage } from "@inertiajs/react"
import toast from "react-hot-toast"
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  Mail,
  Plus,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react"
import type { CareAllianceMembersTab, CareAllianceWorkspaceProps, OrganizationSearchHit } from "../types"
import { route } from "ziggy-js"
import { dashboardCardClass, dashboardInputClass, dashboardSurfaceClass } from "./shared"

const MEMBERS_ROUTE = "care-alliance.workspace.members"
const INVITATIONS_STORE = "care-alliance.invitations.store"
const INVITATIONS_RESEND = "care-alliance.invitations.resend"
const JOIN_REQUEST_APPROVE = "care-alliance.join-requests.approve"
const JOIN_REQUEST_DECLINE = "care-alliance.join-requests.decline"

const MEMBERS_WORKSPACE_KEYS = [
  "activeTab",
  "alliance",
  "memberships",
  "invitations",
  "joinRequests",
  "pendingJoinRequestsCount",
  "campaigns",
  "primaryActionCategories",
  "membersSearchQuery",
  "organizationSearchResults",
] as const

type InviteDraftRow = {
  org: OrganizationSearchHit
  email: string
}

function firstInertiaFieldError(errors: Record<string, string | string[]> | undefined, key: string): string {
  if (!errors) return ""
  const v = errors[key]
  if (Array.isArray(v)) return v[0] ?? ""
  if (typeof v === "string") return v
  return ""
}

function formatListDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

function membershipStatusStyles(status: string): { label: string; className: string } {
  const s = status.toLowerCase()
  if (s === "active") {
    return {
      label: "Active",
      className:
        "border-emerald-500/35 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
    }
  }
  if (s === "pending") {
    return {
      label: "Pending",
      className: "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-100",
    }
  }
  if (s === "declined" || s === "rejected") {
    return {
      label: status,
      className: "border-destructive/35 bg-destructive/10 text-destructive",
    }
  }
  return {
    label: status,
    className: "border-border bg-muted/60 text-foreground",
  }
}

export default function CareAllianceWorkspaceMembers() {
  const page = usePage<CareAllianceWorkspaceProps>()
  const {
    alliance,
    memberships,
    invitations,
    joinRequests = [],
    pendingJoinRequestsCount = 0,
    organizationSearchResults = [],
    membersSearchQuery = "",
    activeTab = "invite",
  } = page.props

  const SEARCH_DEBOUNCE_MS = 400
  const SEARCH_PAGE_SIZE = 5

  const [searchQ, setSearchQ] = useState(membersSearchQuery)
  const [searchPage, setSearchPage] = useState(1)
  const [searching, setSearching] = useState(false)
  /** Orgs from search; each row has its own invitation email before send. */
  const [inviteDrafts, setInviteDrafts] = useState<InviteDraftRow[]>([])
  const [resendingId, setResendingId] = useState<number | null>(null)
  const [cancelInviteTarget, setCancelInviteTarget] = useState<{ id: number; name: string } | null>(null)
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false)
  const searchComboRef = useRef<HTMLDivElement>(null)
  const [joinRequestActingId, setJoinRequestActingId] = useState<number | null>(null)
  const prevMembersTabRef = useRef<CareAllianceMembersTab>(activeTab)

  const { flash } = page.props as { flash?: { success?: string; error?: string } }
  useEffect(() => {
    if (flash?.success) toast.success(flash.success)
    if (flash?.error) toast.error(flash.error)
  }, [flash?.success, flash?.error])

  useEffect(() => {
    if (prevMembersTabRef.current !== activeTab) {
      prevMembersTabRef.current = activeTab
      setSearchQ(membersSearchQuery)
      if (activeTab !== "invite") {
        setSearchDropdownOpen(false)
      }
    }
  }, [activeTab, membersSearchQuery])

  const searchResults = organizationSearchResults

  const draftIdSet = new Set(inviteDrafts.map((d) => d.org.id))

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const el = searchComboRef.current
      if (el && !el.contains(e.target as Node)) {
        setSearchDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", onDocMouseDown)
    return () => document.removeEventListener("mousedown", onDocMouseDown)
  }, [])

  useEffect(() => {
    if (searchQ.trim().length >= 2) {
      setSearchDropdownOpen(true)
    } else {
      setSearchDropdownOpen(false)
    }
  }, [searchQ])

  useEffect(() => {
    if (activeTab !== "invite") {
      return
    }
    const q = searchQ.trim()
    const timer = window.setTimeout(() => {
      router.get(
        route(MEMBERS_ROUTE),
        {
          tab: "invite",
          ...(q.length >= 2 ? { q } : {}),
        },
        {
          preserveState: true,
          preserveScroll: true,
          replace: true,
          only: [...MEMBERS_WORKSPACE_KEYS],
          onStart: () => setSearching(true),
          onFinish: () => setSearching(false),
          onError: () => {
            setSearching(false)
            toast.error("Search failed")
          },
        },
      )
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [searchQ, activeTab])

  useEffect(() => {
    setSearchPage(1)
  }, [searchQ])

  const searchTotalPages = Math.max(1, Math.ceil(searchResults.length / SEARCH_PAGE_SIZE))
  const effectiveSearchPage = Math.min(Math.max(1, searchPage), searchTotalPages)

  useEffect(() => {
    setSearchPage((p) => Math.min(p, searchTotalPages))
  }, [searchTotalPages])

  const pagedSearchResults = searchResults.slice(
    (effectiveSearchPage - 1) * SEARCH_PAGE_SIZE,
    effectiveSearchPage * SEARCH_PAGE_SIZE,
  )
  const searchRangeStart = searchResults.length === 0 ? 0 : (effectiveSearchPage - 1) * SEARCH_PAGE_SIZE + 1
  const searchRangeEnd = searchResults.length === 0 ? 0 : Math.min(effectiveSearchPage * SEARCH_PAGE_SIZE, searchResults.length)

  const showSearchDropdown = searchDropdownOpen && searchQ.trim().length >= 2 && activeTab === "invite"

  const visitMembersTab = (tab: CareAllianceMembersTab) => {
    router.get(route(MEMBERS_ROUTE), { tab }, {
      preserveState: true,
      preserveScroll: true,
      only: [...MEMBERS_WORKSPACE_KEYS],
    })
  }

  const addOrgToDrafts = (o: OrganizationSearchHit) => {
    let duplicate = false
    setInviteDrafts((rows) => {
      if (rows.some((r) => r.org.id === o.id)) {
        duplicate = true
        return rows
      }
      return [...rows, { org: o, email: (o.email ?? "").trim() }]
    })
    if (duplicate) {
      toast.error("Already in your invite list")
    }
  }

  const removeDraft = (orgId: number) => {
    setInviteDrafts((rows) => rows.filter((r) => r.org.id !== orgId))
  }

  const updateDraftEmail = (orgId: number, email: string) => {
    setInviteDrafts((rows) => rows.map((r) => (r.org.id === orgId ? { ...r, email } : r)))
  }

  const clearDrafts = () => setInviteDrafts([])

  const sendInvite = () => {
    if (inviteDrafts.length === 0) return

    const missing = inviteDrafts.some((r) => !r.email.trim())
    if (missing) {
      toast.error("Enter an invitation email for each organization")
      return
    }

    router.post(
      route(INVITATIONS_STORE),
      {
        invites: inviteDrafts.map((r) => ({
          organization_id: r.org.id,
          email: r.email.trim(),
        })),
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          toast.success(inviteDrafts.length > 1 ? `${inviteDrafts.length} invitations sent` : "Invitation sent")
          clearDrafts()
          setSearchQ("")
          setSearchPage(1)
        },
        onError: (errors) => {
          toast.error(firstInertiaFieldError(errors, "invite") || "Invite failed")
        },
      },
    )
  }

  const confirmCancelInvite = () => {
    if (!cancelInviteTarget) return
    const id = cancelInviteTarget.id
    setCancelInviteTarget(null)
    router.delete(route("care-alliance.invitations.destroy", id), {
      preserveScroll: true,
      only: [...MEMBERS_WORKSPACE_KEYS],
    })
  }

  const resendInvite = (id: number) => {
    router.post(
      route(INVITATIONS_RESEND, id),
      {},
      {
        preserveScroll: true,
        onStart: () => setResendingId(id),
        onFinish: () => setResendingId(null),
        onSuccess: () => toast.success("Invitation email queued again"),
        onError: (errors) => {
          toast.error(firstInertiaFieldError(errors, "invite") || "Resend failed")
        },
      },
    )
  }

  const canSend = inviteDrafts.length > 0 && inviteDrafts.every((r) => r.email.trim().length > 0)

  const pendingInvitations = invitations.filter((i) => String(i.status).toLowerCase() === "pending")
  const pendingJoinRequests = joinRequests as CareAllianceJoinRequestRow[]

  const respondToJoinRequest = (id: number, action: "approve" | "decline") => {
    const routeName = action === "approve" ? JOIN_REQUEST_APPROVE : JOIN_REQUEST_DECLINE
    setJoinRequestActingId(id)
    router.post(
      route(routeName, { joinRequest: id }),
      {},
      {
        preserveScroll: true,
        onFinish: () => setJoinRequestActingId(null),
        onError: () => toast.error("Could not update the request."),
      },
    )
  }

  return (
    <CareAllianceWorkspaceShell allianceName={alliance.name} section="members">
      <Tabs value={activeTab} onValueChange={(v) => visitMembersTab(v as CareAllianceMembersTab)} className="w-full">
        <TabsList className="mb-4 inline-flex h-auto w-fit max-w-full flex-wrap justify-start gap-1 overflow-visible p-1 pt-2">
          <TabsTrigger value="invite" className="shrink-0">
            Invite
          </TabsTrigger>
          <TabsTrigger
            value="requests"
            className="relative shrink-0 overflow-visible"
            aria-label={
              pendingJoinRequestsCount > 0
                ? `Requests, ${pendingJoinRequestsCount} pending`
                : "Requests"
            }
          >
            Requests
            {pendingJoinRequestsCount > 0 ? (
              <span
                className="absolute -right-1 -top-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground shadow-sm ring-2 ring-background"
                aria-hidden
              >
                {pendingJoinRequestsCount > 99 ? "99+" : pendingJoinRequestsCount}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="invitations" className="shrink-0">
            Invitations
          </TabsTrigger>
          <TabsTrigger value="memberships" className="shrink-0">
            Memberships
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invite" className="mt-0 outline-none">
      <div className="space-y-6">
        <Card className={dashboardCardClass}>
          <CardHeader>
            <CardTitle>Invite organizations</CardTitle>
            <CardDescription>
              Search and add organizations, then set the invitation email for each before sending. Only{" "}
              <strong>approved</strong> organizations appear in search.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div ref={searchComboRef} className="relative z-30">
              <Label htmlFor="ca-org-search" className="sr-only">
                Search organizations
              </Label>
              <div className="relative">
                <Input
                  id="ca-org-search"
                  className={`${dashboardInputClass} min-w-0 flex-1 pr-20`}
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  onFocus={() => {
                    if (searchQ.trim().length >= 2) {
                      setSearchDropdownOpen(true)
                    }
                  }}
                  placeholder="Search organizations…"
                  autoComplete="off"
                  aria-busy={searching}
                  aria-expanded={showSearchDropdown}
                  aria-controls="ca-org-search-dropdown"
                  aria-autocomplete="list"
                  role="combobox"
                />
                <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
                  ) : (
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${showSearchDropdown ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  )}
                </div>
              </div>

              {showSearchDropdown && (
                <div
                  id="ca-org-search-dropdown"
                  className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
                >
                  <div className="max-h-72 space-y-1 overflow-y-auto overscroll-contain p-2 [scrollbar-gutter:stable]">
                    {searching && (
                      <div className="px-3 py-8 text-center text-sm text-muted-foreground" aria-live="polite">
                        Searching…
                      </div>
                    )}
                    {!searching && searchResults.length === 0 && (
                      <div className="px-3 py-8 text-center text-sm text-muted-foreground">No organizations match.</div>
                    )}
                    {!searching &&
                      pagedSearchResults.map((o) => {
                        const added = draftIdSet.has(o.id)
                        return (
                          <button
                            key={o.id}
                            type="button"
                            disabled={added}
                            className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                              added
                                ? "cursor-default border-border/60 bg-muted/40 opacity-90"
                                : "border-transparent bg-muted/20 hover:border-primary/25 hover:bg-muted/50"
                            }`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => !added && addOrgToDrafts(o)}
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/80 bg-background text-muted-foreground">
                              {added ? (
                                <Check className="h-4 w-4 text-primary" strokeWidth={2.5} aria-hidden />
                              ) : (
                                <Plus className="h-4 w-4" aria-hidden />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-foreground">{o.name}</div>
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                EIN {o.ein ?? "—"}
                                {o.email ? ` · ${o.email}` : ""}
                              </div>
                            </div>
                            {added ? (
                              <span className="shrink-0 text-xs font-medium text-primary">Added</span>
                            ) : (
                              <span className="shrink-0 text-xs font-medium text-muted-foreground">Add</span>
                            )}
                          </button>
                        )
                      })}
                  </div>
                  {!searching && searchTotalPages > 1 && (
                    <div className="flex flex-col gap-2 border-t border-border bg-muted/30 px-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="px-1 text-xs text-muted-foreground">
                        {searchRangeStart}–{searchRangeEnd} of {searchResults.length} · Page {effectiveSearchPage} of{" "}
                        {searchTotalPages}
                      </p>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-0.5 px-2"
                          disabled={effectiveSearchPage <= 1}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setSearchPage((p) => Math.max(1, p - 1))}
                        >
                          <ChevronLeft className="h-4 w-4" aria-hidden />
                          Prev
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-0.5 px-2"
                          disabled={effectiveSearchPage >= searchTotalPages}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setSearchPage((p) => Math.min(searchTotalPages, p + 1))}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Type at least 2 characters to search the server for organizations. Click a row to add it; you can add several and edit
              each invitation email before sending.
            </p>

            {inviteDrafts.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-sm font-semibold text-foreground">Invitation list</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => clearDrafts()}>
                    Clear all
                  </Button>
                </div>
                <div className="space-y-3">
                  {inviteDrafts.map((row) => (
                    <div
                      key={row.org.id}
                      className={`rounded-lg border border-border p-4 shadow-sm ${dashboardSurfaceClass}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">{row.org.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">EIN {row.org.ein ?? "—"}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          title="Remove from list"
                          onClick={() => removeDraft(row.org.id)}
                        >
                          <X className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                      <div className="mt-3 space-y-1.5">
                        <Label htmlFor={`ca-invite-email-${row.org.id}`} className="text-xs text-muted-foreground">
                          Invitation email
                        </Label>
                        <Input
                          id={`ca-invite-email-${row.org.id}`}
                          className={dashboardInputClass}
                          type="email"
                          autoComplete="email"
                          value={row.email}
                          onChange={(e) => updateDraftEmail(row.org.id, e.target.value)}
                          placeholder="recipient@organization.org"
                        />
                        {(row.org.email ?? "").trim() ? (
                          <p className="text-xs text-muted-foreground">
                            Org on file: {(row.org.email ?? "").trim()} — you can override above.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => sendInvite()} disabled={!canSend}>
                {inviteDrafts.length > 1 ? `Send ${inviteDrafts.length} invitations` : "Send invitation"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="requests" className="mt-0 outline-none">
        <Card className={dashboardCardClass}>
          <CardHeader className="space-y-0 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg tracking-tight">Membership requests</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Organizations that asked to join your alliance. Approve to add them as active members, or decline if you are
                  not ready to partner.
                </CardDescription>
              </div>
              {pendingJoinRequests.length > 0 ? (
                <Badge
                  variant="secondary"
                  className="h-7 shrink-0 border border-border px-2.5 font-mono text-xs font-semibold tabular-nums"
                >
                  {pendingJoinRequests.length} pending
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {pendingJoinRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/80 text-muted-foreground">
                  <Inbox className="h-6 w-6" aria-hidden />
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">No membership requests</p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                  When a nonprofit requests to join your alliance, you will see them here to approve or decline.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <ul className="divide-y divide-border" role="list">
                  {pendingJoinRequests.map((jr) => {
                    const title = jr.organization?.name ?? "Organization"
                    const busy = joinRequestActingId === jr.id
                    return (
                      <li key={jr.id}>
                        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-base font-semibold leading-tight text-foreground">{title}</span>
                              <Badge
                                variant="outline"
                                className="border-sky-500/35 bg-sky-500/10 text-[10px] font-semibold uppercase tracking-wider text-sky-900 dark:text-sky-100"
                              >
                                Requested
                              </Badge>
                            </div>
                            {jr.organization?.ein ? (
                              <p className="text-xs text-muted-foreground">EIN {jr.organization.ein}</p>
                            ) : null}
                            {jr.requested_by?.email || jr.requested_by?.name ? (
                              <p className="text-xs text-muted-foreground">
                                Submitted by{" "}
                                <span className="font-medium text-foreground/80">
                                  {jr.requested_by?.name || jr.requested_by?.email}
                                </span>
                                {jr.requested_by?.name && jr.requested_by?.email ? (
                                  <span className="text-muted-foreground"> · {jr.requested_by.email}</span>
                                ) : null}
                              </p>
                            ) : null}
                            {jr.created_at ? (
                              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                                {formatListDate(jr.created_at)}
                              </p>
                            ) : null}
                            {jr.message?.trim() ? (
                              <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm text-foreground">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Message</p>
                                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{jr.message.trim()}</p>
                              </div>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border pt-4 sm:border-0 sm:pt-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              disabled={busy}
                              onClick={() => respondToJoinRequest(jr.id, "decline")}
                            >
                              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                              Decline
                            </Button>
                            <Button type="button" size="sm" className="gap-1.5" disabled={busy} onClick={() => respondToJoinRequest(jr.id, "approve")}>
                              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                              Approve
                            </Button>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="invitations" className="mt-0 outline-none">
        <Card className={dashboardCardClass}>
          <CardHeader className="space-y-0 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg tracking-tight">Pending invitations</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Awaiting a response from the organization. You can resend the email or cancel the invite.
                </CardDescription>
              </div>
              {pendingInvitations.length > 0 ? (
                <Badge
                  variant="secondary"
                  className="h-7 shrink-0 border border-border px-2.5 font-mono text-xs font-semibold tabular-nums"
                >
                  {pendingInvitations.length} open
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {pendingInvitations.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/80 text-muted-foreground">
                  <Inbox className="h-6 w-6" aria-hidden />
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">No pending invitations</p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                  When you send invites, they appear here until the organization accepts or you cancel.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <ul className="divide-y divide-border" role="list">
                  {pendingInvitations.map((i) => {
                    const title = i.organization?.name ?? i.email ?? "Organization"
                    return (
                      <li key={i.id}>
                        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-base font-semibold leading-tight text-foreground">{title}</span>
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                              >
                                Pending
                              </Badge>
                            </div>
                            {i.organization?.ein ? (
                              <p className="text-xs text-muted-foreground">EIN {i.organization.ein}</p>
                            ) : null}
                            {i.email ? (
                              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                                <span className="truncate">{i.email}</span>
                              </p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border pt-4 sm:border-0 sm:pt-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              title="Send invitation again"
                              disabled={resendingId === i.id}
                              onClick={() => resendInvite(i.id)}
                            >
                              {resendingId === i.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                              ) : (
                                <Send className="h-3.5 w-3.5" aria-hidden />
                              )}
                              Resend
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              title="Cancel invitation"
                              onClick={() =>
                                setCancelInviteTarget({
                                  id: i.id,
                                  name: i.organization?.name ?? i.email ?? "this organization",
                                })
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="memberships" className="mt-0 outline-none">
        <Card className={dashboardCardClass}>
          <CardHeader className="space-y-0 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg tracking-tight">Memberships</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Organizations that have joined or are in progress with this alliance.
                </CardDescription>
              </div>
              {memberships.length > 0 ? (
                <Badge
                  variant="secondary"
                  className="h-7 shrink-0 border border-border px-2.5 font-mono text-xs font-semibold tabular-nums"
                >
                  {memberships.length} total
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {memberships.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/80 text-muted-foreground">
                  <Users className="h-6 w-6" aria-hidden />
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">No memberships yet</p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                  Accepted invitations will show here with status and key dates.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <ul className="divide-y divide-border" role="list">
                  {memberships.map((m) => {
                    const st = membershipStatusStyles(m.status)
                    const invited = formatListDate(m.invited_at)
                    const responded = formatListDate(m.responded_at)
                    return (
                      <li key={m.id}>
                        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-base font-semibold leading-tight text-foreground">
                                {m.organization?.name ?? "—"}
                              </span>
                              <Badge variant="outline" className={st.className}>
                                {st.label}
                              </Badge>
                            </div>
                            {m.organization?.ein ? (
                              <p className="text-xs text-muted-foreground">EIN {m.organization.ein}</p>
                            ) : null}
                            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1">
                              {invited ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                                  Invited {invited}
                                </span>
                              ) : null}
                              {responded ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                                  Updated {responded}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
        </TabsContent>

        <AlertDialog open={cancelInviteTarget !== null} onOpenChange={(open) => !open && setCancelInviteTarget(null)}>
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel invitation?</AlertDialogTitle>
              <AlertDialogDescription>
                This will revoke the pending invite to{" "}
                <span className="font-medium text-foreground">{cancelInviteTarget?.name}</span>. They will no longer be able to
                accept it from their dashboard. You can send a new invitation later if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel>Keep invitation</AlertDialogCancel>
              <Button type="button" variant="destructive" onClick={() => confirmCancelInvite()}>
                Yes, cancel invitation
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Tabs>
    </CareAllianceWorkspaceShell>
  )
}
