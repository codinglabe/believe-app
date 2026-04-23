"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { Button } from "@/components/frontend/ui/button"
import { Deferred, Link, router, usePage } from "@inertiajs/react"
import {
    Award,
    CheckCircle,
    Clock,
    Download,
    Eye,
    Gift,
    Loader2,
    Search,
    Ticket,
    X,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import RaffleTicket from "@/components/ui/raffle-ticket"
import { downloadTicket, printTicket } from "@/lib/ticket-download"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/frontend/ui/select"

interface RaffleTicketRow {
    id: number
    ticket_number: string
    price: number
    purchased_at?: string | null
    created_at?: string | null
    raffle: {
        id: number
        title: string
        description: string
        draw_date: string
        status: string
        image?: string
        organization: {
            name: string
            organization?: {
                name: string
            } | null
        }
        winners: Array<{
            id: number
            position: number
            ticket: {
                ticket_number: string
            }
        }>
    }
}

interface PaginationLink {
    url: string | null
    label: string
    active: boolean
}

interface PaginatedRaffleTickets {
    data: RaffleTicketRow[]
    links: PaginationLink[]
    current_page: number
    last_page: number
    total: number
    per_page: number
}

interface PageProps {
    auth: {
        user: {
            id: number
            name: string
            email: string
        }
    }
    filters: {
        search: string
        status: string
    }
    /** Present after deferred load completes */
    raffleTickets?: PaginatedRaffleTickets
}

const cardSurface =
    "rounded-xl border border-border bg-card text-card-foreground shadow-sm"

const SEARCH_DEBOUNCE_MS = 400

type TicketExportBusy =
    | null
    | {
          ticketId: number
          action: "download" | "print"
      }

function RaffleTicketsLoading() {
    return (
        <div
            className="space-y-8"
            aria-busy="true"
            aria-live="polite"
            aria-label="Loading raffle tickets"
        >
            <div className="flex flex-col items-center justify-center gap-3 py-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
                <p className="text-sm font-medium text-muted-foreground">Loading your tickets…</p>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {[0, 1].map((key) => (
                    <div
                        key={key}
                        className={cn("space-y-4 p-4 sm:p-5", cardSurface, "animate-pulse")}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="h-4 flex-1 rounded-md bg-muted" />
                            <div className="h-6 w-24 rounded-full bg-muted" />
                        </div>
                        <div className="h-64 w-full rounded-lg bg-muted/70" />
                        <div className="flex flex-wrap justify-center gap-2">
                            <div className="h-9 w-[7.5rem] rounded-lg bg-muted" />
                            <div className="h-9 w-24 rounded-lg bg-muted" />
                            <div className="h-9 w-16 rounded-lg bg-muted" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

const RAFFLE_TICKETS_SEARCH_ID = "raffle-tickets-search"

function TicketFiltersToolbar({ filters }: { filters: PageProps["filters"] }) {
    const [searchDraft, setSearchDraft] = useState(filters.search)

    useEffect(() => {
        const el = document.getElementById(RAFFLE_TICKETS_SEARCH_ID)
        if (document.activeElement === el) return
        setSearchDraft(filters.search)
    }, [filters.search])

    function applyVisit(patch: Partial<{ search: string; status: string; page: number }>) {
        router.get(
            route("profile.raffle-tickets.index"),
            {
                search: patch.search ?? searchDraft,
                status: patch.status ?? filters.status,
                page: patch.page ?? 1,
            },
            { preserveScroll: true, replace: true },
        )
    }

    useEffect(() => {
        if (searchDraft === filters.search) return

        const id = window.setTimeout(() => {
            router.get(
                route("profile.raffle-tickets.index"),
                {
                    search: searchDraft,
                    status: filters.status,
                    page: 1,
                },
                { preserveScroll: true, replace: true },
            )
        }, SEARCH_DEBOUNCE_MS)

        return () => window.clearTimeout(id)
    }, [searchDraft, filters.search, filters.status])

    const hasFilters =
        filters.search.trim().length > 0 || filters.status !== "all"

    return (
        <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
                <div className="min-w-0 flex-1 space-y-2">
                    <Label htmlFor={RAFFLE_TICKETS_SEARCH_ID}>Search</Label>
                    <div className="relative min-w-0">
                        <Search
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden
                        />
                        <Input
                            id={RAFFLE_TICKETS_SEARCH_ID}
                            type="search"
                            value={searchDraft}
                            onChange={(e) => setSearchDraft(e.target.value)}
                            placeholder="Raffle title or ticket number"
                            className="h-10 pl-9"
                            autoComplete="off"
                            aria-busy={searchDraft !== filters.search}
                        />
                    </div>
                </div>

                <div className="w-full space-y-2 sm:max-w-[200px] lg:w-auto">
                    <Label htmlFor="raffle-tickets-status">Raffle status</Label>
                    <Select
                        value={filters.status}
                        onValueChange={(v) => applyVisit({ status: v, page: 1, search: searchDraft })}
                    >
                        <SelectTrigger id="raffle-tickets-status" className="h-10 w-full">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {hasFilters ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground">Filters are applied to your list.</p>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-muted-foreground"
                        onClick={() => {
                            setSearchDraft("")
                            router.get(
                                route("profile.raffle-tickets.index"),
                                { search: "", status: "all", page: 1 },
                                { preserveScroll: true, replace: true },
                            )
                        }}
                    >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Clear filters
                    </Button>
                </div>
            ) : null}
        </div>
    )
}

function RaffleTicketsBody() {
    const { auth, filters, raffleTickets } = usePage<PageProps>().props
    const ticketRefs = useRef<Record<number, HTMLDivElement | null>>({})
    const [ticketExportBusy, setTicketExportBusy] = useState<TicketExportBusy>(null)

    const list = raffleTickets?.data ?? []
    const total = raffleTickets?.total ?? 0

    const isWinner = (ticket: RaffleTicketRow) =>
        ticket.raffle.winners.some((w) => w.ticket.ticket_number === ticket.ticket_number)

    const isTicketExportBusy = (ticketId: number) => ticketExportBusy?.ticketId === ticketId

    const hasActiveFilters = filters.search.trim().length > 0 || filters.status !== "all"

    async function handleDownloadTicket(ticketId: number, ticketNumber: string) {
        const el = ticketRefs.current[ticketId]
        if (!el) {
            toast.error("Ticket is not ready yet. Refresh and try again.")
            return
        }
        setTicketExportBusy({ ticketId, action: "download" })
        try {
            await downloadTicket(el, ticketNumber)
        } catch (err) {
            console.error(err)
            toast.error("Could not download the ticket. Try Print or refresh.")
        } finally {
            setTicketExportBusy(null)
        }
    }

    async function handlePrintTicket(ticketId: number) {
        const el = ticketRefs.current[ticketId]
        if (!el) {
            toast.error("Ticket is not ready yet. Refresh and try again.")
            return
        }
        setTicketExportBusy({ ticketId, action: "print" })
        try {
            await printTicket(el)
        } catch (err) {
            console.error(err)
            toast.error("Could not open print. Allow popups or try Download.")
        } finally {
            setTicketExportBusy(null)
        }
    }

    if (list.length === 0 && !hasActiveFilters && total === 0) {
        return (
            <div className={cn("mx-auto max-w-lg py-14 text-center", cardSurface)}>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg">
                    <Ticket className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-foreground">No tickets yet</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                    Browse live raffles and buy tickets—your digital stubs will show up here.
                </p>
                <Link href={route("frontend.raffles.index")} className="mt-6 inline-block">
                    <Button className="h-11 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 font-semibold text-white shadow-md hover:from-blue-700 hover:to-purple-700">
                        <Gift className="mr-2 h-4 w-4" />
                        Browse raffles
                    </Button>
                </Link>
            </div>
        )
    }

    if (list.length === 0 && hasActiveFilters) {
        return (
            <div className={cn("mx-auto max-w-lg py-14 text-center", cardSurface)}>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                    <Search className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground">No matching tickets</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                    Try a different search term or raffle status.
                </p>
                <Button
                    type="button"
                    variant="outline"
                    className="mt-6"
                    onClick={() =>
                        router.get(route("profile.raffle-tickets.index"), {
                            search: "",
                            status: "all",
                            page: 1,
                        })
                    }
                >
                    Clear filters
                </Button>
            </div>
        )
    }

    const paginationLinks = raffleTickets?.links ?? []
    const showPagination =
        raffleTickets &&
        raffleTickets.last_page > 1 &&
        paginationLinks.length > 0

    return (
        <>
            <header className="text-center">
                <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    Your tickets
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    {total} ticket{total !== 1 ? "s" : ""}{" "}
                    {hasActiveFilters ? "match your filters" : "on file"}
                    {raffleTickets ? (
                        <span className="text-muted-foreground/80">
                            {" "}
                            (page {raffleTickets.current_page} of {raffleTickets.last_page})
                        </span>
                    ) : null}
                </p>
            </header>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {list.map((ticket) => {
                    const won = isWinner(ticket)
                    return (
                        <div key={ticket.id} className={cn("p-4 sm:p-5", cardSurface)}>
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <span className="line-clamp-1 text-sm font-semibold text-foreground">
                                    {ticket.raffle.title}
                                </span>
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                        ticket.raffle.status === "active" &&
                                            "bg-primary/10 text-primary",
                                        ticket.raffle.status === "completed" &&
                                            "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100",
                                        ticket.raffle.status === "cancelled" &&
                                            "bg-red-500/15 text-red-900 dark:text-red-100",
                                        !["active", "completed", "cancelled"].includes(ticket.raffle.status) &&
                                            "border border-border bg-muted text-muted-foreground",
                                    )}
                                >
                                    {ticket.raffle.status === "active" ? (
                                        <Clock className="h-3.5 w-3.5" />
                                    ) : ticket.raffle.status === "completed" ? (
                                        <CheckCircle className="h-3.5 w-3.5" />
                                    ) : (
                                        <Award className="h-3.5 w-3.5" />
                                    )}
                                    {ticket.raffle.status}
                                </span>
                            </div>
                            {won ? (
                                <p className="mb-3 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-950 dark:text-amber-100">
                                    <Award className="h-3.5 w-3.5" />
                                    Winner
                                </p>
                            ) : null}

                            <div
                                ref={(el) => {
                                    ticketRefs.current[ticket.id] = el
                                }}
                                className="w-full"
                            >
                                <RaffleTicket
                                    ticket={{
                                        ...ticket,
                                        user: auth.user,
                                        is_winner: won,
                                    }}
                                    showStub
                                    className="w-full"
                                />
                            </div>

                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                <Link href={route("frontend.raffles.show", ticket.raffle.id)}>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 rounded-lg border-border bg-background"
                                    >
                                        <Eye className="mr-2 h-4 w-4" />
                                        View raffle
                                    </Button>
                                </Link>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isTicketExportBusy(ticket.id)}
                                    aria-busy={
                                        ticketExportBusy?.ticketId === ticket.id &&
                                        ticketExportBusy?.action === "download"
                                    }
                                    className="h-9 rounded-lg border-primary/25 bg-primary/5 text-primary hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-70"
                                    onClick={() => void handleDownloadTicket(ticket.id, ticket.ticket_number)}
                                >
                                    {ticketExportBusy?.ticketId === ticket.id &&
                                    ticketExportBusy?.action === "download" ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                                    ) : (
                                        <Download className="mr-2 h-4 w-4" aria-hidden />
                                    )}
                                    {ticketExportBusy?.ticketId === ticket.id &&
                                    ticketExportBusy?.action === "download"
                                        ? "Preparing…"
                                        : "Download"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isTicketExportBusy(ticket.id)}
                                    aria-busy={
                                        ticketExportBusy?.ticketId === ticket.id &&
                                        ticketExportBusy?.action === "print"
                                    }
                                    className="h-9 rounded-lg border-border bg-background disabled:pointer-events-none disabled:opacity-70"
                                    onClick={() => void handlePrintTicket(ticket.id)}
                                >
                                    {ticketExportBusy?.ticketId === ticket.id &&
                                    ticketExportBusy?.action === "print" ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                                    ) : null}
                                    {ticketExportBusy?.ticketId === ticket.id &&
                                    ticketExportBusy?.action === "print"
                                        ? "Preparing…"
                                        : "Print"}
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {showPagination ? (
                <div className="flex flex-wrap items-center justify-end gap-2 pt-6">
                    {paginationLinks.map((link, i) =>
                        link.url ? (
                            <Link
                                key={i}
                                href={link.url}
                                preserveScroll
                                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                                    link.active
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border bg-background text-foreground hover:bg-muted"
                                }`}
                            >
                                {link.label
                                    .replace("&laquo; Previous", "Previous")
                                    .replace("Next &raquo;", "Next")}
                            </Link>
                        ) : (
                            <span key={i} className="px-3 py-2 text-sm text-muted-foreground">
                                {link.label
                                    .replace("&laquo; Previous", "Previous")
                                    .replace("Next &raquo;", "Next")}
                            </span>
                        ),
                    )}
                </div>
            ) : null}
        </>
    )
}

export default function RaffleTicketsPage() {
    const { filters } = usePage<PageProps>().props

    return (
        <ProfileLayout
            title="My raffle tickets"
            description="Your purchased tickets, downloads, and links back to each fundraiser."
        >
            <div className="space-y-6">
                <TicketFiltersToolbar filters={filters} />

                <div className="rounded-xl border border-border bg-background p-6 sm:p-8">
                    <div className="space-y-8">
                        <Deferred data="raffleTickets" fallback={<RaffleTicketsLoading />}>
                            <RaffleTicketsBody />
                        </Deferred>
                    </div>
                </div>
            </div>
        </ProfileLayout>
    )
}
