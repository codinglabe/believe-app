"use client"

import { useMemo, useState } from "react"
import { Link } from "@inertiajs/react"
import { Gift, MoreVertical, Search, UserPlus, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type UnityMeetParticipant = {
  id: number | null
  email: string
  name: string
  image: string | null
  slug: string | null
  role: string
  isHost: boolean
  canReceiveGift: boolean
}

type UnityMeetParticipantPanelProps = {
  participants: UnityMeetParticipant[]
  authUserId: number
  onInvite?: () => void
  onCopyViewerLink?: () => void
  viewerLinkHint?: string
  className?: string
  onClose?: () => void
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
}

export default function UnityMeetParticipantPanel({
  participants,
  authUserId,
  onInvite,
  onCopyViewerLink,
  viewerLinkHint = "Guests can view the livestream when it's public.",
  className = "",
  onClose,
}: UnityMeetParticipantPanelProps) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return participants
    return participants.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q),
    )
  }, [participants, query])

  return (
    <aside
      className={`flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-border bg-linear-to-b from-muted/20 to-background ${className}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <h2 className="text-sm font-semibold text-foreground">
          Participants ({participants.length})
        </h2>
        {onClose ? (
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Close participants">
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="shrink-0 px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search participants"
            className="h-8 pl-8 text-sm"
            aria-label="Search participants"
          />
        </div>
      </div>

      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2 [scrollbar-width:thin]">
        {filtered.map((participant) => {
          const canGift =
            participant.canReceiveGift &&
            participant.id !== null &&
            participant.id !== authUserId

          return (
            <li
              key={`${participant.email}-${participant.id ?? "guest"}`}
              className="flex items-center gap-2 rounded-lg px-1.5 py-2 hover:bg-muted/50"
            >
              <Avatar className="h-9 w-9 shrink-0 border border-border">
                {participant.image ? (
                  <AvatarImage src={participant.image} alt={participant.name} />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-xs font-medium">
                  {initials(participant.name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{participant.name}</p>
                <p
                  className={`truncate text-[11px] ${
                    participant.isHost
                      ? "font-medium text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {participant.role}
                </p>
              </div>

              {canGift ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-purple-600 hover:bg-purple-500/10 hover:text-purple-700 dark:text-purple-400"
                  asChild
                  title="Give Gift"
                >
                  <Link href={route("supporters.gift", participant.id!)}>
                    <Gift className="h-4 w-4" />
                    <span className="sr-only">Give gift to {participant.name}</span>
                  </Link>
                </Button>
              ) : null}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Actions for ${participant.name}`}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {participant.slug ? (
                    <DropdownMenuItem asChild>
                      <Link href={route("users.show", participant.slug)}>View profile</Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem disabled>View profile</DropdownMenuItem>
                  )}
                  <DropdownMenuItem disabled>Message</DropdownMenuItem>
                  <DropdownMenuItem disabled>Donate</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          )
        })}
        {filtered.length === 0 ? (
          <li className="px-2 py-6 text-center text-xs text-muted-foreground">No participants match your search.</li>
        ) : null}
      </ul>

      <div className="shrink-0 space-y-2 border-t border-border px-3 py-3">
        {onInvite ? (
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full justify-center gap-1.5 text-sm"
            onClick={onInvite}
          >
            <UserPlus className="h-4 w-4" />
            Invite people
          </Button>
        ) : null}
        {onCopyViewerLink ? (
          <button
            type="button"
            onClick={onCopyViewerLink}
            className="w-full text-center text-xs font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
          >
            Copy viewer link
          </button>
        ) : null}
        {viewerLinkHint ? (
          <p className="text-center text-[10px] leading-snug text-muted-foreground">{viewerLinkHint}</p>
        ) : null}
      </div>
    </aside>
  )
}
