"use client"

import { useMemo } from "react"
import { Head, Link, router, usePage } from "@inertiajs/react"
import type { PageProps } from "@/types"
import AppLayout from "@/layouts/app-layout"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  MessageCircle,
  MessagesSquare,
  Users,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Input } from "@/components/ui/input"

type ChatGroup = {
  id: number
  name: string
  description?: string | null
  type: "public" | "private" | "direct"
  type_label: string
  image?: string | null
  members_count: number
  unread_count: number
  chat_url: string
  topics: { id: number; name: string }[]
  latest_message?: {
    content: string
    created_at?: string
    user?: { id: number; name: string; image?: string | null }
  } | null
}

type Stats = {
  total: number
  public: number
  private: number
  direct: number
  group_total: number
}

type Props = PageProps & {
  groups: ChatGroup[]
  stats: Stats
  filter: "groups" | "direct" | "all"
  topicsSelectUrl: string
}

const FILTERS: { id: Props["filter"]; label: string; countKey: keyof Stats }[] = [
  { id: "groups", label: "Groups", countKey: "group_total" },
  { id: "direct", label: "Direct", countKey: "direct" },
  { id: "all", label: "All chats", countKey: "total" },
]

function formatRelativeDate(iso?: string) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function GroupsContent({
  groups,
  stats,
  filter,
  topicsSelectUrl,
}: Pick<Props, "groups" | "stats" | "filter" | "topicsSelectUrl">) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q) ||
        g.topics.some((t) => t.name.toLowerCase().includes(q))
    )
  }, [groups, search])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Group chats</p>
          <p className="mt-1 text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            {stats.group_total}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Public</p>
          <p className="mt-1 text-2xl font-bold">{stats.public}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Private</p>
          <p className="mt-1 text-2xl font-bold">{stats.private}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Direct</p>
          <p className="mt-1 text-2xl font-bold">{stats.direct}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => router.get(route("my-chat-groups.index"), { filter: tab.id }, { preserveState: true, preserveScroll: true })}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition",
                filter === tab.id
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {tab.label}
              <span className={cn("rounded-full px-1.5 text-xs", filter === tab.id ? "bg-white/20" : "bg-background")}>
                {stats[tab.countKey]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups..."
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((group) => (
            <div
              key={group.id}
              className="flex flex-col rounded-xl border bg-card p-4 shadow-sm transition hover:border-purple-300/60 hover:shadow-md dark:hover:border-purple-500/40"
            >
              <div className="flex items-start gap-3">
                <Link href={group.chat_url} className="shrink-0">
                  {group.image ? (
                    <img src={group.image} alt="" className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 text-white">
                      {group.type === "direct" ? (
                        <MessageCircle className="h-6 w-6" />
                      ) : (
                        <Users className="h-6 w-6" />
                      )}
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={group.chat_url}
                      className="font-semibold text-foreground hover:text-purple-600 dark:hover:text-purple-400 truncate"
                    >
                      {group.name}
                    </Link>
                    {group.unread_count > 0 && (
                      <Badge className="bg-purple-600 text-white">{group.unread_count} new</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{group.type_label}</p>
                  {group.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{group.description}</p>
                  )}
                  {group.topics.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {group.topics.slice(0, 3).map((topic) => (
                        <Badge key={topic.id} variant="secondary" className="text-xs">
                          {topic.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {group.latest_message && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  {group.latest_message.user?.image ? (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={group.latest_message.user.image} />
                      <AvatarFallback>{group.latest_message.user.name?.charAt(0) ?? "?"}</AvatarFallback>
                    </Avatar>
                  ) : null}
                  <p className="min-w-0 flex-1 truncate text-muted-foreground">
                    <span className="font-medium text-foreground">{group.latest_message.user?.name}: </span>
                    {group.latest_message.content}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeDate(group.latest_message.created_at)}
                  </span>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{group.members_count} members</span>
                </div>
                <Button
                  asChild
                  size="sm"
                  className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                  <Link href={group.chat_url}>
                    <MessageCircle className="h-4 w-4" />
                    Chat
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-14 text-center">
          <MessagesSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No chats in this view</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Join cause groups from chat topics or start a conversation from the chat page.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <Link href="/chat">Open chat</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={topicsSelectUrl}>Browse group topics</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MyChatGroupsPage({ groups, stats, filter, topicsSelectUrl }: Props) {
  const { auth } = usePage<PageProps>().props
  const isSupporter = auth.user.role === "user"

  const body = <GroupsContent groups={groups} stats={stats} filter={filter} topicsSelectUrl={topicsSelectUrl} />

  if (isSupporter) {
    return (
      <ProfileLayout title="My chat groups" description="Groups and chats you have joined">
        <Head title="My chat groups" />
        {body}
      </ProfileLayout>
    )
  }

  const breadcrumbs = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "My chat groups", href: route("my-chat-groups.index") },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="My chat groups" />
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              My chat groups
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {stats.total} chat{stats.total === 1 ? "" : "s"} joined — open any group to continue the conversation.
          </p>
        </div>
        {body}
      </div>
    </AppLayout>
  )
}
