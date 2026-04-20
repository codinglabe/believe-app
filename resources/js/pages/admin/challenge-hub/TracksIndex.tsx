"use client"

import React, { useState } from "react"
import { Head, Link, router, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal"
import { ChallengeHubAdminNav } from "@/components/challenge-hub-admin-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, ImageIcon, Plus, Trash2, Trophy } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

declare global {
  function route(name: string, params?: Record<string, unknown> | (string | number)[]): string
}

interface TrackRow {
  id: number
  slug: string
  name: string
  status: string
  has_cover: boolean
  entries_count: number
}

interface Props {
  tracks: TrackRow[]
}

export default function AdminChallengeHubTracksIndex({ tracks }: Props) {
  const { flash } = usePage().props as { flash?: { success?: string; error?: string } }

  const [deleteModal, setDeleteModal] = useState<{ open: boolean; slug: string; name: string }>({
    open: false,
    slug: "",
    name: "",
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteConfirm = () => {
    if (!deleteModal.slug) return
    setIsDeleting(true)
    router.delete(route("admin.challenge-hub.tracks.destroy", deleteModal.slug), {
      preserveScroll: true,
      onFinish: () => {
        setIsDeleting(false)
        setDeleteModal({ open: false, slug: "", name: "" })
      },
    })
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Challenge Hub", href: route("admin.challenge-hub.categories.index") },
    { title: "Tracks", href: route("admin.challenge-hub.tracks.index") },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Challenge Hub — Tracks" />
      <div className="w-full max-w-full space-y-6 p-4 sm:p-6">
        <ChallengeHubAdminNav active="tracks" />
        <div className="flex w-full flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tracks</h1>
            <p className="mt-1.5 text-gray-600 dark:text-gray-400">
              Each track appears as a card on the public Challenge Hub. Edit cover art, copy, and per-track challenge entries.
            </p>
          </div>
          <div className="flex shrink-0 justify-end">
            <Button asChild>
              <Link href={route("admin.challenge-hub.tracks.create")}>
                <Plus className="mr-2 h-4 w-4" />
                Create track
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
              <Trophy className="h-5 w-5" />
              Tracks
            </CardTitle>
            <CardDescription>Create opens a dedicated page; edit for hub card, cover, and entries.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500 dark:text-gray-400">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Slug</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Cover</th>
                  <th className="pb-2 pr-4 font-medium">Entries</th>
                  <th className="pb-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tracks.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">{t.name}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-600 dark:text-gray-300">{t.slug}</td>
                    <td className="py-3 pr-4 capitalize">{t.status.replace("_", " ")}</td>
                    <td className="py-3 pr-4">
                      {t.has_cover ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <ImageIcon className="h-4 w-4" /> Yes
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">{t.entries_count}</td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={route("admin.challenge-hub.tracks.edit", t.slug)}>
                            Edit
                            <ArrowRight className="ml-1 h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                          onClick={() => setDeleteModal({ open: true, slug: t.slug, name: t.name })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tracks.length === 0 ? <p className="text-gray-500">No tracks found.</p> : null}
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, slug: "", name: "" })}
        onConfirm={handleDeleteConfirm}
        title="Delete track"
        message={`Delete track “${deleteModal.name}”? Challenge entries and related play history for this track will be removed. This cannot be undone.`}
        isLoading={isDeleting}
      />
    </AppLayout>
  )
}
