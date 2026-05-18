"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { Head, Link, router, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal"
import { ChallengeHubAdminNav } from "@/components/challenge-hub-admin-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight, ImageIcon, Layers, Pencil, Plus, Trash2 } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

declare global {
  function route(name: string, params?: Record<string, unknown> | (string | number)[]): string
}

interface EntryRow {
  id: number
  title: string
  description: string | null
  subcategory_key: string | null
  sort_order: number
  is_active: boolean
  cover_image_url: string | null
  track: { id: number; name: string; slug: string }
}

interface LaravelPagination<T> {
  data: T[]
  links: { url: string | null; label: string; active: boolean }[]
  current_page: number
  last_page: number
  from: number | null
  to: number | null
  total: number
  prev_page_url: string | null
  next_page_url: string | null
}

interface TrackOption {
  id: number
  name: string
}

interface Props {
  entries: LaravelPagination<EntryRow>
  filters: { track: string; search: string }
  track_options: TrackOption[]
}

function getNumericLinks(links: LaravelPagination<EntryRow>["links"]) {
  return links.filter((l) => l.label !== "&laquo; Previous" && l.label !== "Next &raquo;")
}

const SEARCH_DEBOUNCE_MS = 400

export default function AdminChallengeHubChallengesIndex() {
  const { entries, filters, track_options } = usePage<Props>().props
  const { flash } = usePage().props as { flash?: { success?: string; error?: string } }

  const [track, setTrack] = useState(() => filters.track || "")
  const [search, setSearch] = useState(() => filters.search || "")
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: number | null; title: string }>({
    open: false,
    id: null,
    title: "",
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteConfirm = () => {
    if (deleteModal.id == null) return
    setIsDeleting(true)
    router.delete(`${route("admin.challenge-hub.entries.destroy", deleteModal.id)}?redirect=challenges`, {
      preserveScroll: true,
      onFinish: () => {
        setIsDeleting(false)
        setDeleteModal({ open: false, id: null, title: "" })
      },
    })
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Challenge Hub", href: route("admin.challenge-hub.categories.index") },
    { title: "Challenges", href: route("admin.challenge-hub.challenges.index") },
  ]

  const visit = useCallback((nextTrack: string, nextSearch: string) => {
    router.get(
      route("admin.challenge-hub.challenges.index"),
      {
        track: nextTrack || undefined,
        search: nextSearch || undefined,
      },
      { preserveState: true, replace: true }
    )
  }, [])

  useEffect(() => {
    setTrack(filters.track || "")
    setSearch(filters.search || "")
  }, [filters.track, filters.search])

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
    }
  }, [])

  const onTrackChange = (v: string) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = null
    }
    const next = v === "__all__" ? "" : v
    setTrack(next)
    visit(next, search)
  }

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextSearch = e.target.value
    setSearch(nextSearch)
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }
    searchDebounceRef.current = setTimeout(() => {
      searchDebounceRef.current = null
      visit(track, nextSearch)
    }, SEARCH_DEBOUNCE_MS)
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Challenge Hub — Challenges" />
      <div className="w-full max-w-full space-y-6 p-4 sm:p-6">
        <ChallengeHubAdminNav active="challenges" />
        <div className="flex w-full flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Challenges</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Per-track quiz cards shown on the public track challenges page. Create, edit, cover art, and delete here.
            </p>
          </div>
          <div className="flex shrink-0 justify-end">
            <Button asChild>
              <Link href={route("admin.challenge-hub.challenges.create")}>
                <Plus className="mr-2 h-4 w-4" />
                Create challenge
              </Link>
            </Button>
          </div>
        </div>

        {flash?.success ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            {flash.success}
          </div>
        ) : null}
        {flash?.error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
            {flash.error}
          </div>
        ) : null}

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              All challenges
            </CardTitle>
            <CardDescription>Filter by track or search by title or description.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="space-y-2 sm:w-56">
                <Label>Track</Label>
                <Select value={track === "" ? "__all__" : track} onValueChange={onTrackChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All tracks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All tracks</SelectItem>
                    {track_options.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="ch-search">Search</Label>
                <Input
                  id="ch-search"
                  value={search}
                  onChange={onSearchChange}
                  placeholder="Title or description…"
                  className="max-w-md"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 dark:text-gray-400">
                    <th className="pb-2 pr-4 font-medium">Cover</th>
                    <th className="pb-2 pr-4 font-medium">Title</th>
                    <th className="pb-2 pr-4 font-medium">Track</th>
                    <th className="pb-2 pr-4 font-medium">Subcategory</th>
                    <th className="pb-2 pr-4 font-medium">Active</th>
                    <th className="pb-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No challenges match your filters.
                      </td>
                    </tr>
                  ) : (
                    entries.data.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 pr-4">
                          {row.cover_image_url ? (
                            <img
                              src={row.cover_image_url}
                              alt=""
                              className="h-12 w-12 rounded-md border object-cover bg-gray-100 dark:bg-gray-900"
                            />
                          ) : (
                            <span className="inline-flex text-gray-400">
                              <ImageIcon className="h-5 w-5" />
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">{row.title}</td>
                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{row.track.name}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                          {row.subcategory_key ?? "—"}
                        </td>
                        <td className="py-3 pr-4">{row.is_active ? "Yes" : "No"}</td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button asChild variant="outline" size="sm">
                              <Link href={route("admin.challenge-hub.challenges.edit", row.id)}>
                                <Pencil className="mr-1 h-4 w-4" />
                                Edit
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                              onClick={() => setDeleteModal({ open: true, id: row.id, title: row.title })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {entries.last_page > 1 ? (
              <div className="flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">
                  Showing {entries.from ?? 0}–{entries.to ?? 0} of {entries.total}
                </p>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {entries.prev_page_url ? (
                    <Link href={entries.prev_page_url}>
                      <Button variant="outline" size="sm" type="button">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : null}
                  {getNumericLinks(entries.links).map((link, i) => (
                    <span key={i}>
                      {link.url ? (
                        <Link href={link.url}>
                          <Button variant={link.active ? "default" : "outline"} size="sm" type="button" className="min-w-9">
                            <span dangerouslySetInnerHTML={{ __html: link.label }} />
                          </Button>
                        </Link>
                      ) : (
                        <span className="px-2 text-gray-400" dangerouslySetInnerHTML={{ __html: link.label }} />
                      )}
                    </span>
                  ))}
                  {entries.next_page_url ? (
                    <Link href={entries.next_page_url}>
                      <Button variant="outline" size="sm" type="button">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          You can also manage challenges from{" "}
          <Link href={route("admin.challenge-hub.tracks.index")} className="underline underline-offset-2">
            Tracks
          </Link>{" "}
          → edit a track.
        </p>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null, title: "" })}
        onConfirm={handleDeleteConfirm}
        title="Delete challenge"
        message={`Delete “${deleteModal.title}”? This cannot be undone.`}
        isLoading={isDeleting}
      />
    </AppLayout>
  )
}
