"use client"

import { Head, router, useForm, usePage, Link } from "@inertiajs/react"
import { useCallback, useEffect, useMemo, useState } from "react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Textarea } from "@/components/frontend/ui/textarea"
import { Badge } from "@/components/frontend/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/frontend/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/frontend/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/frontend/ui/dialog"
import {
  Gift,
  Loader2,
  Search,
  ArrowLeft,
  Clock,
  Mail,
  UserRound,
  Sparkles,
  RefreshCw,
  Pencil,
  XCircle,
} from "lucide-react"
import toast from "react-hot-toast"

interface GiftOccasion {
  id: number
  occasion: string
  icon: string | null
  category: string | null
}

interface SearchResult {
  id: number
  name: string
  email: string
  slug: string | null
  image: string | null
  display_name: string
}

interface PendingInvite {
  id: number
  recipient_email: string
  amount: number
  occasion: string | null
  expires_at: string | null
  created_at: string | null
}

interface GiftBpPageProps {
  senderBalances: {
    purchased_believe_points: number
    gifted_believe_points: number
    holding_believe_points: number
  }
  giftOccasions: GiftOccasion[]
  holdDays: number
  pendingInvites: PendingInvite[]
  preselectedRecipient?: SearchResult | null
  viewerRole?: string | null
  flash?: { success?: string }
  errors?: Record<string, string>
}

const PRESETS = [10, 25, 50] as const

export default function GiftBpPage() {
  const {
    senderBalances,
    giftOccasions,
    holdDays,
    pendingInvites,
    preselectedRecipient = null,
    viewerRole = null,
    flash,
    errors: pageErrors,
  } = usePage().props as unknown as GiftBpPageProps

  const isOrgViewer =
    viewerRole === "organization" ||
    viewerRole === "organization_pending" ||
    viewerRole === "care_alliance" ||
    viewerRole === "admin"

  const backHref = isOrgViewer ? "/gift-cards" : "/gift-cards/my-cards"
  const backLabel = isOrgViewer ? "Gift Cards" : "My Gift Cards"

  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [inviteEmail, setInviteEmail] = useState<string | null>(null)
  const [selected, setSelected] = useState<SearchResult | null>(preselectedRecipient)
  const [mode, setMode] = useState<"user" | "invite" | null>(preselectedRecipient ? "user" : null)
  const [preset, setPreset] = useState<number | "custom">(10)
  const [cancelTarget, setCancelTarget] = useState<PendingInvite | null>(null)
  const [editTarget, setEditTarget] = useState<PendingInvite | null>(null)
  const [editEmail, setEditEmail] = useState("")
  const [inviteActionId, setInviteActionId] = useState<number | null>(null)
  const [inviteAction, setInviteAction] = useState<"resend" | "cancel" | "email" | null>(null)

  const defaultOccasionId = giftOccasions[0]?.id ?? 0

  const { data, setData, post, processing, errors, reset } = useForm({
    mode: (preselectedRecipient ? "user" : "user") as "user" | "invite",
    recipient_id: preselectedRecipient?.id ?? (null as number | null),
    email: "",
    amount: 10,
    gift_occasion_id: defaultOccasionId,
    message: "",
  })

  useEffect(() => {
    if (!preselectedRecipient) return
    setSelected(preselectedRecipient)
    setMode("user")
    setData("mode", "user")
    setData("recipient_id", preselectedRecipient.id)
    setData("email", "")
  }, [preselectedRecipient?.id])

  useEffect(() => {
    if (flash?.success) toast.success(flash.success)
  }, [flash?.success])

  useEffect(() => {
    const err = pageErrors?.amount || pageErrors?.email || pageErrors?.recipient || pageErrors?.error
    if (err) toast.error(err)
  }, [pageErrors])

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (trimmed.length < 2) {
      setResults([])
      setInviteEmail(null)
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/gift-bp/search?q=${encodeURIComponent(trimmed)}`, {
        headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "same-origin",
      })
      const json = (await res.json()) as { results: SearchResult[]; invite_email: string | null }
      setResults(json.results ?? [])
      setInviteEmail(json.invite_email ?? null)
    } catch {
      toast.error("Search failed. Try again.")
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => runSearch(query), 300)
    return () => window.clearTimeout(t)
  }, [query, runSearch])

  const selectUser = (user: SearchResult) => {
    setSelected(user)
    setMode("user")
    setInviteEmail(null)
    setData("mode", "user")
    setData("recipient_id", user.id)
    setData("email", "")
  }

  const selectInvite = (email: string) => {
    setSelected(null)
    setMode("invite")
    setInviteEmail(email)
    setData("mode", "invite")
    setData("recipient_id", null)
    setData("email", email)
  }

  const clearRecipient = () => {
    setSelected(null)
    setMode(null)
    setInviteEmail(null)
    setData("mode", "user")
    setData("recipient_id", null)
    setData("email", "")
  }

  const applyPreset = (v: number | "custom") => {
    setPreset(v)
    if (v !== "custom") setData("amount", v)
  }

  const purchased = senderBalances.purchased_believe_points
  const holding = senderBalances.holding_believe_points
  const canSubmit = mode !== null && data.amount > 0 && purchased >= data.amount && !processing

  const recipientLabel = useMemo(() => {
    if (mode === "user" && selected) return selected.name
    if (mode === "invite" && data.email) return data.email
    return null
  }, [mode, selected, data.email])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    post("/gift-bp/send", {
      preserveScroll: true,
      onSuccess: () => {
        clearRecipient()
        setQuery("")
        setResults([])
        reset("amount", "message", "email", "recipient_id")
        setData("gift_occasion_id", defaultOccasionId)
        setData("amount", 10)
        setPreset(10)
      },
      onError: (errs) => {
        const msg = errs.amount || errs.email || errs.recipient || "Could not send gift."
        toast.error(msg)
      },
    })
  }

  const runInviteAction = (
    invite: PendingInvite,
    action: "resend" | "cancel" | "email",
    payload?: Record<string, string>,
  ) => {
    const urls = {
      resend: `/gift-bp/invites/${invite.id}/resend`,
      cancel: `/gift-bp/invites/${invite.id}/cancel`,
      email: `/gift-bp/invites/${invite.id}/email`,
    } as const

    setInviteActionId(invite.id)
    setInviteAction(action)

    router.post(urls[action], payload ?? {}, {
      preserveScroll: true,
      onSuccess: () => {
        if (action === "cancel") setCancelTarget(null)
        if (action === "email") {
          setEditTarget(null)
          setEditEmail("")
        }
      },
      onError: (errs) => {
        const msg =
          errs.invite || errs.email || errs.error || "Could not update this invitation."
        toast.error(typeof msg === "string" ? msg : "Could not update this invitation.")
      },
      onFinish: () => {
        setInviteActionId(null)
        setInviteAction(null)
      },
    })
  }

  const openEditEmail = (invite: PendingInvite) => {
    setEditTarget(invite)
    setEditEmail(invite.recipient_email)
  }

  const submitEditEmail = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget) return
    const next = editEmail.trim().toLowerCase()
    if (!next || next === editTarget.recipient_email.toLowerCase()) {
      toast.error("Enter a different email address.")
      return
    }
    runInviteAction(editTarget, "email", { email: next })
  }

  const pageBody = (
      <div className={isOrgViewer ? "container mx-auto flex h-full flex-1 flex-col gap-6 px-4 py-4 md:px-10 md:py-6" : "space-y-6"}>
        <div className="flex items-center justify-between gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {backLabel}
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-600/10 via-blue-600/5 to-transparent p-5 sm:p-6 dark:from-violet-500/15 dark:via-blue-500/10">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-lg">
              <Gift className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight dark:text-white">Send Believe Points</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Search a supporter by name or email. If they are not on the app yet, we email an invite and hold
                your BP for {holdDays} days until they register.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/40 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-slate-950/40">
              <p className="text-xs text-muted-foreground">Available (purchased)</p>
              <p className="text-lg font-semibold tabular-nums dark:text-white">{purchased.toFixed(2)} BP</p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <p className="text-xs text-amber-800 dark:text-amber-200">Holding (pending invites)</p>
              <p className="text-lg font-semibold tabular-nums text-amber-900 dark:text-amber-100">
                {holding.toFixed(2)} BP
              </p>
            </div>
            <div className="rounded-xl border border-white/40 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-slate-950/40">
              <p className="text-xs text-muted-foreground">Hold window</p>
              <p className="text-lg font-semibold dark:text-white">{holdDays} days</p>
            </div>
          </div>
        </div>

        <Card className="border-violet-500/20 shadow-sm dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5 text-violet-600" />
              Find recipient
            </CardTitle>
            <CardDescription>Type a name or full email address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!recipientLabel ? (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name or email…"
                    className="h-12 pl-10"
                    autoComplete="off"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>

                {results.length > 0 && (
                  <ul className="divide-y rounded-xl border dark:divide-white/10 dark:border-white/10">
                    {results.map((user) => (
                      <li key={user.id}>
                        <button
                          type="button"
                          onClick={() => selectUser(user)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-violet-500/5"
                        >
                          {user.image ? (
                            <img src={user.image} alt="" className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600/20 text-sm font-semibold">
                              {(user.name || "?")[0]}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium dark:text-white">{user.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                          <UserRound className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {inviteEmail && (
                  <button
                    type="button"
                    onClick={() => selectInvite(inviteEmail)}
                    className="flex w-full items-start gap-3 rounded-xl border border-dashed border-violet-500/40 bg-violet-500/5 p-4 text-left hover:bg-violet-500/10"
                  >
                    <Mail className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
                    <div>
                      <p className="font-medium dark:text-white">Invite {inviteEmail}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Not registered yet. We’ll email an invite and hold your BP for {holdDays} days.
                      </p>
                    </div>
                    <Sparkles className="ml-auto h-4 w-4 shrink-0 text-violet-500" />
                  </button>
                )}

                {query.trim().length >= 2 && !searching && results.length === 0 && !inviteEmail && (
                  <p className="text-sm text-muted-foreground">
                    No supporters found. Enter a full email address to send an invite gift.
                  </p>
                )}
              </>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-violet-500/30 bg-violet-500/5 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {mode === "invite" ? "Invite & hold" : "Sending to"}
                  </p>
                  <p className="truncate font-semibold dark:text-white">{recipientLabel}</p>
                  {mode === "invite" && (
                    <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
                      BP moves to Holding until they register
                    </p>
                  )}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={clearRecipient}>
                  Change
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {mode && (
          <Card className="border-violet-500/20 shadow-sm dark:bg-slate-900/60">
            <CardHeader>
              <CardTitle className="text-lg">Gift details</CardTitle>
              <CardDescription>
                Uses Available (purchased) BP only. Recipients receive Gifted BP.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <Label>Occasion</Label>
                  <Select
                    value={String(data.gift_occasion_id)}
                    onValueChange={(value) => setData("gift_occasion_id", Number(value))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose an occasion" />
                    </SelectTrigger>
                    <SelectContent>
                      {giftOccasions.map((occasion) => (
                        <SelectItem key={occasion.id} value={String(occasion.id)}>
                          {occasion.icon ? `${occasion.icon} ` : ""}
                          {occasion.occasion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(errors.gift_occasion_id || pageErrors?.gift_occasion_id) && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.gift_occasion_id || pageErrors?.gift_occasion_id}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Amount (Believe Points)</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {PRESETS.map((n) => (
                      <Button
                        key={n}
                        type="button"
                        variant={preset === n ? "default" : "outline"}
                        onClick={() => applyPreset(n)}
                      >
                        {n}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant={preset === "custom" ? "default" : "outline"}
                      onClick={() => applyPreset("custom")}
                    >
                      Custom
                    </Button>
                  </div>
                  {preset === "custom" && (
                    <Input
                      type="number"
                      step="0.01"
                      min={0.01}
                      className="mt-2"
                      value={data.amount}
                      onChange={(e) => setData("amount", parseFloat(e.target.value) || 0)}
                    />
                  )}
                  {(errors.amount || pageErrors?.amount) && (
                    <p className="mt-1 text-sm text-destructive">{errors.amount || pageErrors?.amount}</p>
                  )}
                </div>

                <div>
                  <Label>Message (optional)</Label>
                  <Textarea
                    className="mt-2"
                    placeholder="Write a short note"
                    value={data.message}
                    onChange={(e) => setData("message", e.target.value)}
                    maxLength={500}
                  />
                </div>

                {mode === "invite" && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-900 dark:text-amber-100">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      {data.amount.toFixed(2)} BP will move to Holding. If {data.email} does not register within{" "}
                      {holdDays} days, it returns to your Available balance. You can also Resend, Change Email,
                      or Cancel from Pending invitations anytime before they claim — Cancel returns BP
                      immediately. Both of you get email and app notifications.
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-violet-600"
                  disabled={!canSubmit}
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : mode === "invite" ? (
                    "Send invite & hold BP"
                  ) : (
                    "Send gift"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {pendingInvites.length > 0 && (
          <Card className="dark:bg-slate-900/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-amber-500" />
                Pending invitations
              </CardTitle>
              <CardDescription>
                Holding BP waiting for registration. Resend, change email, or cancel anytime before claim.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingInvites.map((invite) => {
                const busy = inviteActionId === invite.id
                return (
                  <div
                    key={invite.id}
                    className="rounded-xl border px-4 py-3 dark:border-white/10"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium dark:text-white">{invite.recipient_email}</p>
                        <p className="text-xs text-muted-foreground">
                          {invite.occasion ? `${invite.occasion} · ` : ""}
                          Expires{" "}
                          {invite.expires_at
                            ? new Date(invite.expires_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </p>
                        <Badge
                          variant="outline"
                          className="mt-2 border-amber-500/40 text-amber-800 dark:text-amber-200"
                        >
                          {Number(invite.amount).toFixed(2)} BP holding
                        </Badge>
                      </div>
                      <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:flex-wrap sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-10 touch-manipulation sm:h-9"
                          disabled={busy}
                          onClick={() => runInviteAction(invite, "resend")}
                        >
                          {busy && inviteAction === "resend" ? (
                            <Loader2 className="h-4 w-4 animate-spin sm:mr-1.5" />
                          ) : (
                            <RefreshCw className="h-4 w-4 sm:mr-1.5" />
                          )}
                          <span className="hidden sm:inline">Resend</span>
                          <span className="sm:hidden text-xs">Resend</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-10 touch-manipulation sm:h-9"
                          disabled={busy}
                          onClick={() => openEditEmail(invite)}
                        >
                          <Pencil className="h-4 w-4 sm:mr-1.5" />
                          <span className="hidden sm:inline">Change Email</span>
                          <span className="sm:hidden text-xs">Edit</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-10 touch-manipulation border-rose-500/40 text-rose-700 hover:bg-rose-500/10 dark:text-rose-300 sm:h-9"
                          disabled={busy}
                          onClick={() => setCancelTarget(invite)}
                        >
                          <XCircle className="h-4 w-4 sm:mr-1.5" />
                          <span className="hidden sm:inline">Cancel</span>
                          <span className="sm:hidden text-xs">Cancel</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        <AlertDialog
          open={!!cancelTarget}
          onOpenChange={(open) => {
            if (!open && inviteAction !== "cancel") setCancelTarget(null)
          }}
        >
          <AlertDialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Gift Invitation?</AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                This gift has not yet been claimed. The invitation will be cancelled and the BP will be
                returned to your Available BP wallet immediately.
                {cancelTarget ? (
                  <span className="mt-2 block text-foreground">
                    {Number(cancelTarget.amount).toFixed(2)} BP · {cancelTarget.recipient_email}
                  </span>
                ) : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel disabled={inviteAction === "cancel"}>Keep Invitation</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
                disabled={!cancelTarget || inviteAction === "cancel"}
                onClick={(e) => {
                  e.preventDefault()
                  if (cancelTarget) runInviteAction(cancelTarget, "cancel")
                }}
              >
                {inviteAction === "cancel" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling…
                  </>
                ) : (
                  "Cancel & Return BP"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={!!editTarget}
          onOpenChange={(open) => {
            if (!open && inviteAction !== "email") {
              setEditTarget(null)
              setEditEmail("")
            }
          }}
        >
          <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Change invitation email</DialogTitle>
              <DialogDescription>
                Holding BP stays the same. We’ll notify the previous address that the gift was cancelled
                for them, and send a fresh invite to the new email.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submitEditEmail} className="space-y-4">
              <div>
                <Label htmlFor="gift-invite-edit-email">New email</Label>
                <Input
                  id="gift-invite-edit-email"
                  type="email"
                  className="mt-2 h-12"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  disabled={inviteAction === "email"}
                  onClick={() => {
                    setEditTarget(null)
                    setEditEmail("")
                  }}
                >
                  Back
                </Button>
                <Button type="submit" disabled={inviteAction === "email" || !editTarget}>
                  {inviteAction === "email" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Update email"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
  )

  if (isOrgViewer) {
    return (
      <AppSidebarLayout>
        <Head title="Gift BP" />
        {pageBody}
      </AppSidebarLayout>
    )
  }

  if (viewerRole === "user") {
    return (
      <ProfileLayout title="Gift BP" description="Send Believe Points to supporters — or invite someone new">
        <Head title="Gift BP" />
        {pageBody}
      </ProfileLayout>
    )
  }

  return (
    <FrontendLayout>
      <Head title="Gift BP" />
      <div className="container mx-auto max-w-3xl px-4 py-8">{pageBody}</div>
    </FrontendLayout>
  )
}
