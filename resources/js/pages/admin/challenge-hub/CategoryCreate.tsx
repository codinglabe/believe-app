"use client"

import React from "react"
import { Head, Link, useForm } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { ChallengeHubAdminNav } from "@/components/challenge-hub-admin-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Plus, Wand2 } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

declare global {
  function route(name: string, params?: Record<string, unknown> | (string | number)[]): string
}

export default function AdminChallengeHubCategoryCreate() {
  const form = useForm({
    label: "",
    is_new: false,
    is_active: true,
    sort_order: 0,
    cover_image: null as File | null,
    cover_prompt: "",
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    form.post(route("admin.challenge-hub.categories.store"), {
      forceFormData: true,
    })
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Challenge Hub", href: route("admin.challenge-hub.categories.index") },
    { title: "Categories", href: route("admin.challenge-hub.categories.index") },
    { title: "New category", href: route("admin.challenge-hub.categories.create") },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="New hub category" />
      <div className="w-full max-w-full p-4 sm:p-6">
        <ChallengeHubAdminNav active="categories" />
        <Card className="w-full">
          <CardHeader className="space-y-4">
            <div className="w-full">
              <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
                <Link href={route("admin.challenge-hub.categories.index")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to categories
                </Link>
              </Button>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Plus className="h-6 w-6" />
                New category
              </CardTitle>
              <CardDescription className="mt-1.5">
                The URL slug and filter key are generated from the label (unique). Optionally add a cover image by upload
                or AI when you create; you can change it later on the edit page.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="w-full space-y-10">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="cat-label">Label</Label>
                  <Input
                    id="cat-label"
                    className="w-full"
                    value={form.data.label}
                    onChange={(e) => form.setData("label", e.target.value)}
                    required
                  />
                  {form.errors.label ? <p className="text-sm text-red-600">{form.errors.label}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-sort">Sort order</Label>
                  <Input
                    id="cat-sort"
                    className="w-full"
                    type="number"
                    min={0}
                    value={form.data.sort_order}
                    onChange={(e) => form.setData("sort_order", parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div className="flex items-end gap-6 pb-1 md:col-span-1">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="cat-new"
                      checked={form.data.is_new}
                      onCheckedChange={(v) => form.setData("is_new", v === true)}
                    />
                    <Label htmlFor="cat-new">Show “New” badge</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="cat-active"
                      checked={form.data.is_active}
                      onCheckedChange={(v) => form.setData("is_active", v === true)}
                    />
                    <Label htmlFor="cat-active">Active</Label>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-8 dark:border-gray-800">
                <h3 className="mb-1 text-lg font-semibold">Cover image (optional)</h3>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Upload a file or describe an image for AI generation (min. 12 characters). If both are set, upload
                  wins.
                </p>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cat-create-cover-file">Upload image</Label>
                    <Input
                      id="cat-create-cover-file"
                      className="w-full cursor-pointer"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null
                        form.setData("cover_image", f)
                      }}
                    />
                    {form.errors.cover_image ? (
                      <p className="text-sm text-red-600">{form.errors.cover_image}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="cat-create-cover-prompt">
                      <Wand2 className="mr-1 inline h-4 w-4" />
                      Generate with AI (prompt)
                    </Label>
                    <Textarea
                      id="cat-create-cover-prompt"
                      className="w-full"
                      rows={3}
                      placeholder="Describe the illustration you want (no text in the image). At least 12 characters."
                      value={form.data.cover_prompt}
                      onChange={(e) => form.setData("cover_prompt", e.target.value)}
                    />
                    {form.errors.cover_prompt ? (
                      <p className="text-sm text-red-600">{form.errors.cover_prompt}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={form.processing}>
                  Create category
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
