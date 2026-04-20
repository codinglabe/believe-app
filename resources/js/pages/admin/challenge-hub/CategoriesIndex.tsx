"use client"

import React, { useState } from "react"
import { Head, Link, router, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal"
import { ChallengeHubAdminNav } from "@/components/challenge-hub-admin-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Layers, Plus, Trash2 } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

declare global {
  function route(name: string, params?: Record<string, unknown> | (string | number)[]): string
}

interface CategoryRow {
  id: number
  slug: string
  label: string
  filter_key: string
  is_active: boolean
  has_cover: boolean
}

interface Props {
  categories: CategoryRow[]
}

export default function AdminChallengeHubCategoriesIndex({ categories }: Props) {
  const { flash } = usePage().props as { flash?: { success?: string; error?: string } }

  const [deleteModal, setDeleteModal] = useState<{ open: boolean; slug: string; label: string }>({
    open: false,
    slug: "",
    label: "",
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteConfirm = () => {
    if (!deleteModal.slug) return
    setIsDeleting(true)
    router.delete(route("admin.challenge-hub.categories.destroy", deleteModal.slug), {
      preserveScroll: true,
      onFinish: () => {
        setIsDeleting(false)
        setDeleteModal({ open: false, slug: "", label: "" })
      },
    })
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Challenge Hub", href: route("admin.challenge-hub.categories.index") },
    { title: "Categories", href: route("admin.challenge-hub.categories.index") },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Challenge Hub — Categories" />
      <div className="w-full max-w-full space-y-6 p-4 sm:p-6">
        <ChallengeHubAdminNav active="categories" />
        <div className="flex w-full flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Categories</h1>
            <p className="mt-1.5 text-gray-600 dark:text-gray-400">
              Hub category labels, icons, filters, and optional cover art for the public Challenge Hub.
            </p>
          </div>
          <div className="flex shrink-0 justify-end">
            <Button asChild>
              <Link href={route("admin.challenge-hub.categories.create")}>
                <Plus className="mr-2 h-4 w-4" />
                Create category
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
              Hub categories
            </CardTitle>
            <CardDescription>Create opens a dedicated page; edit a row for metadata and cover image.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500 dark:text-gray-400">
                  <th className="pb-2 pr-4 font-medium">Label</th>
                  <th className="pb-2 pr-4 font-medium">Slug</th>
                  <th className="pb-2 pr-4 font-medium">Filter</th>
                  <th className="pb-2 pr-4 font-medium">Active</th>
                  <th className="pb-2 pr-4 font-medium">Cover</th>
                  <th className="pb-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">{c.label}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{c.slug}</td>
                    <td className="py-3 pr-4">{c.filter_key}</td>
                    <td className="py-3 pr-4">{c.is_active ? "Yes" : "No"}</td>
                    <td className="py-3 pr-4">
                      {c.has_cover ? (
                        <span className="text-emerald-600 dark:text-emerald-400">Yes</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={route("admin.challenge-hub.categories.edit", c.slug)}>Edit</Link>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                          onClick={() => setDeleteModal({ open: true, slug: c.slug, label: c.label })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {categories.length === 0 ? <p className="text-gray-500">No categories found.</p> : null}
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, slug: "", label: "" })}
        onConfirm={handleDeleteConfirm}
        title="Delete hub category"
        message={`Delete hub category “${deleteModal.label}”? This cannot be undone.`}
        isLoading={isDeleting}
      />
    </AppLayout>
  )
}
