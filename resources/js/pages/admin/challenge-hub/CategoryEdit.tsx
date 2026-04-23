"use client"

import React, { useState } from "react"
import { Head, Link, useForm } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { ChallengeHubAdminNav } from "@/components/challenge-hub-admin-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Upload, Wand2 } from "lucide-react"
import { CHALLENGE_HUB_COVER_MAX_BYTES, validateChallengeHubCoverFile } from "@/lib/challenge-hub-cover-limit"
import type { BreadcrumbItem } from "@/types"

declare global {
  function route(name: string, params?: Record<string, unknown> | (string | number)[]): string
}

interface CategoryPayload {
  id: number
  slug: string
  label: string
  icon: string
  filter_key: string
  is_new: boolean
  is_active: boolean
  sort_order: number
  cover_image_url: string | null
}

interface Props {
  category: CategoryPayload
}

export default function AdminChallengeHubCategoryEdit({ category }: Props) {
  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Challenge Hub", href: route("admin.challenge-hub.categories.index") },
    { title: "Categories", href: route("admin.challenge-hub.categories.index") },
    { title: category.label, href: `/admin/challenge-hub/categories/${category.slug}/edit` },
  ]

  const form = useForm({
    label: category.label,
    is_new: category.is_new,
    is_active: category.is_active,
    sort_order: category.sort_order,
  })

  const coverForm = useForm({
    prompt: `Small circular hub icon artwork for "${category.label}", ${category.filter_key} theme, isolated graphic`,
  })

  const uploadForm = useForm<{ cover_image: File | null }>({
    cover_image: null,
  })

  const [coverClientError, setCoverClientError] = useState<string | null>(null)

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    form.put(route("admin.challenge-hub.categories.update", category.slug))
  }

  const genCover = (e: React.FormEvent) => {
    e.preventDefault()
    coverForm.post(route("admin.challenge-hub.categories.generate-cover", category.slug))
  }

  const uploadCover = (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadForm.data.cover_image) return
    const msg = validateChallengeHubCoverFile(uploadForm.data.cover_image, CHALLENGE_HUB_COVER_MAX_BYTES)
    if (msg) {
      setCoverClientError(msg)
      return
    }
    setCoverClientError(null)
    uploadForm.clearErrors()
    uploadForm.post(route("admin.challenge-hub.categories.upload-cover", category.slug), {
      forceFormData: true,
      onSuccess: () => {
        uploadForm.setData("cover_image", null)
        setCoverClientError(null)
      },
    })
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`${category.label} — Hub category`} />
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
              <CardTitle className="text-2xl">{category.label}</CardTitle>
              <CardDescription>
                Slug <span className="font-mono text-xs">{category.slug}</span> and filter key{" "}
                <span className="font-mono text-xs">{category.filter_key}</span> are derived from the label when you save.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-10">
            <form onSubmit={save} className="w-full">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label>Label</Label>
                  <Input
                    className="w-full"
                    value={form.data.label}
                    onChange={(e) => form.setData("label", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sort order</Label>
                  <Input
                    className="w-full"
                    type="number"
                    value={form.data.sort_order}
                    onChange={(e) => form.setData("sort_order", parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div className="flex flex-wrap items-end gap-x-6 gap-y-2 pb-1">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="is_new"
                      checked={form.data.is_new}
                      onCheckedChange={(v) => form.setData("is_new", v === true)}
                    />
                    <Label htmlFor="is_new">Show &quot;New&quot; badge</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="is_active"
                      checked={form.data.is_active}
                      onCheckedChange={(v) => form.setData("is_active", v === true)}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                </div>
                <div className="flex justify-end md:col-span-2">
                  <Button type="submit" disabled={form.processing}>
                    Save category
                  </Button>
                </div>
              </div>
            </form>

            <div className="w-full border-t border-gray-200 pt-8 dark:border-gray-800">
              <h3 className="mb-1 text-lg font-semibold">Category cover (optional)</h3>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                Upload your own image or generate one with AI. Images are resized and stored for the hub.
              </p>
              {category.cover_image_url ? (
                <img
                  src={category.cover_image_url}
                  alt=""
                  className="mb-4 h-28 w-28 rounded-lg border object-cover bg-gray-100 dark:bg-gray-900"
                />
              ) : (
                <p className="mb-4 text-sm text-gray-500">No image yet.</p>
              )}
              <form onSubmit={uploadCover} className="mb-8 w-full space-y-3">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end md:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="category-cover-file">Upload image</Label>
                    <Input
                      id="category-cover-file"
                      className="w-full cursor-pointer"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null
                        uploadForm.setData("cover_image", f)
                        setCoverClientError(null)
                      }}
                    />
                  </div>
                  <div className="flex justify-end md:pb-0.5">
                    <Button type="submit" disabled={uploadForm.processing || !uploadForm.data.cover_image}>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload cover
                    </Button>
                  </div>
                </div>
                {coverClientError ? <p className="text-sm text-red-600">{coverClientError}</p> : null}
                {uploadForm.errors.cover_image ? (
                  <p className="text-sm text-red-600">{uploadForm.errors.cover_image}</p>
                ) : null}
              </form>
              <form onSubmit={genCover} className="w-full space-y-3">
                <Label>Generate with AI (prompt)</Label>
                <textarea
                  id="category-cover-prompt"
                  name="prompt"
                  title="Image generation prompt"
                  placeholder="Describe the illustration you want (no text in the image)."
                  className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={coverForm.data.prompt}
                  onChange={(e) => coverForm.setData("prompt", e.target.value)}
                  required
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={coverForm.processing}>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate image
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
