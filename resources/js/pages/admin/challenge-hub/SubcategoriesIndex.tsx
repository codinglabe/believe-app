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
import { ChevronLeft, ChevronRight, ListTree, Pencil, Plus, Trash2 } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

declare global {
  function route(name: string, params?: Record<string, unknown> | (string | number)[]): string
}

interface SubcategoryRow {
  id: number
  name: string
  sort_order: number
  hub_label: string
  hub_slug: string
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

interface HubOption {
  id: number
  label: string
}

interface Props {
  subcategories: LaravelPagination<SubcategoryRow>
  filters: { hub: string; search: string }
  hub_options: HubOption[]
}

function getNumericLinks(links: LaravelPagination<SubcategoryRow>["links"]) {
  return links.filter((l) => l.label !== "&laquo; Previous" && l.label !== "Next &raquo;")
}

const SEARCH_DEBOUNCE_MS = 400

export default function AdminChallengeHubSubcategoriesIndex() {
  const { subcategories, filters, hub_options } = usePage<Props>().props
  const { flash } = usePage().props as { flash?: { success?: string; error?: string } }

  const [hub, setHub] = useState(() => filters.hub || "")
  const [search, setSearch] = useState(() => filters.search || "")
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: number | null; name: string }>({
    open: false,
    id: null,
    name: "",
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteConfirm = () => {
    if (deleteModal.id == null) return
    setIsDeleting(true)
    router.delete(route("admin.challenge-hub.subcategories.destroy", deleteModal.id), {
      preserveScroll: true,
      onFinish: () => {
        setIsDeleting(false)
        setDeleteModal({ open: false, id: null, name: "" })
      },
    })
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Challenge Hub", href: route("admin.challenge-hub.categories.index") },
    { title: "Subcategories", href: route("admin.challenge-hub.subcategories.index") },
  ]

  const visit = useCallback((nextHub: string, nextSearch: string) => {
    router.get(
      route("admin.challenge-hub.subcategories.index"),
      {
        hub: nextHub || undefined,
        search: nextSearch || undefined,
      },
      { preserveState: true, replace: true }
    )
  }, [])

  useEffect(() => {
    setHub(filters.hub || "")
    setSearch(filters.search || "")
  }, [filters.hub, filters.search])

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
    }
  }, [])

  const onHubChange = (v: string) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = null
    }
    const next = v === "__all__" ? "" : v
    setHub(next)
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
      visit(hub, nextSearch)
    }, SEARCH_DEBOUNCE_MS)
  }

  const hasFilters = Boolean(filters.hub || (filters.search && filters.search.trim() !== ""))

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Challenge Hub — Subcategories" />
      <div className="w-full max-w-full space-y-6 p-4 sm:p-6">
        <ChallengeHubAdminNav active="subcategories" />
        <div className="flex w-full flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subcategories</h1>
          </div>
          <div className="flex shrink-0 justify-end">
            <Button asChild>
              <Link href={route("admin.challenge-hub.subcategories.create")}>
                <Plus className="mr-2 h-4 w-4" />
                Create subcategory
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
              <ListTree className="h-5 w-5" />
              Quiz subcategories
            </CardTitle>
            <CardDescription>
              Filter by hub category; search matches subcategory name or hub label/slug. Pagination keeps your filters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 md:items-end">
              <div className="min-w-0 space-y-2">
                <Label>Hub category</Label>
                <Select value={hub || "__all__"} onValueChange={onHubChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All hubs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All hubs</SelectItem>
                    {hub_options.map((h) => (
                      <SelectItem key={h.id} value={String(h.id)}>
                        {h.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="subcat-search">Search</Label>
                <Input
                  id="subcat-search"
                  className="w-full"
                  value={search}
                  onChange={onSearchChange}
                  placeholder="Name, hub label, or slug…"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 dark:text-gray-400">
                    <th className="pb-2 pr-4 font-medium">Hub category</th>
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Sort</th>
                    <th className="pb-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subcategories.data.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">
                        {hasFilters ? "No subcategories match your filters." : "No subcategories yet."}
                      </td>
                    </tr>
                  ) : (
                    subcategories.data.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 pr-4">
                          <span className="font-medium text-gray-900 dark:text-white">{row.hub_label}</span>
                          <span className="ml-2 font-mono text-xs text-gray-400">{row.hub_slug}</span>
                        </td>
                        <td className="py-3 pr-4">{row.name}</td>
                        <td className="py-3 pr-4">{row.sort_order}</td>
                        <td className="py-3">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={route("admin.challenge-hub.subcategories.edit", row.id)}>
                                <Pencil className="mr-1 h-4 w-4" />
                                Edit
                              </Link>
                            </Button>
                            <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteModal({ open: true, id: row.id, name: row.name })}
                          >
                              <Trash2 className="mr-1 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {subcategories.last_page > 1 ? (
              <div className="flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">
                  Showing {subcategories.from ?? 0}–{subcategories.to ?? 0} of {subcategories.total}
                </p>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {subcategories.prev_page_url ? (
                    <Link href={subcategories.prev_page_url}>
                      <Button variant="outline" size="sm" type="button">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : null}
                  {getNumericLinks(subcategories.links).map((link, i) => (
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
                  {subcategories.next_page_url ? (
                    <Link href={subcategories.next_page_url}>
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
      </div>

      <DeleteConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null, name: "" })}
        onConfirm={handleDeleteConfirm}
        title="Delete subcategory"
        message={`Delete subcategory “${deleteModal.name}”? You can only remove it if no questions or tracks use it.`}
        isLoading={isDeleting}
      />
    </AppLayout>
  )
}
