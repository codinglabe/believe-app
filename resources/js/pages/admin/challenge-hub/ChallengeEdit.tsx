"use client"

import React, { useEffect, useState } from "react"
import { Head, Link, router, useForm, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal"
import { ChallengeHubAdminNav } from "@/components/challenge-hub-admin-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Trash2, Upload, Wand2 } from "lucide-react"
import { validateChallengeHubCoverFile } from "@/lib/challenge-hub-cover-limit"
import type { BreadcrumbItem } from "@/types"

declare global {
  function route(name: string, params?: Record<string, unknown> | (string | number)[]): string
}

interface EntryPayload {
  id: number
  title: string
  slug: string | null
  description: string | null
  subcategory_key: string | null
  sort_order: number
  is_active: boolean
  cover_image_url: string | null
  last_image_prompt: string | null
}

interface TrackPayload {
  id: number
  name: string
  slug: string
  hub_label: string
}

type HubRow = { id: number; label: string; slug: string }

interface Props {
  entry: EntryPayload
  track: TrackPayload
  subcategory_options: string[]
  hub_categories: HubRow[]
  subcategories_by_category: Record<string, string[]>
  /** Pre-POST limit (KB) — must stay ≤ nginx client_max_body_size or browser gets raw 413 HTML. */
  cover_client_max_kb: number
  /** Laravel validation max (KB) when the request reaches PHP. */
  cover_server_max_kb: number
}

function formatKbAsMb(kb: number): string {
  return (kb / 1024).toFixed(kb >= 1024 ? 1 : 2)
}

export default function AdminChallengeHubChallengeEdit() {
  const {
    entry,
    track,
    subcategory_options: subFromServer,
    subcategories_by_category,
    cover_client_max_kb: coverClientMaxKb = 5120,
    cover_server_max_kb: coverServerMaxKb = 5120,
  } = usePage<Props>().props
  const { flash } = usePage().props as { flash?: { success?: string; error?: string } }

  const coverClientMaxBytes = Math.max(64, coverClientMaxKb) * 1024

  const hubLabel = track.hub_label
  const subOptions = [...(subcategories_by_category[hubLabel] ?? subFromServer)]
  if (entry.subcategory_key && !subOptions.includes(entry.subcategory_key)) {
    subOptions.unshift(entry.subcategory_key)
  }

  const f = useForm({
    title: entry.title,
    description: entry.description ?? "",
    subcategory_key: entry.subcategory_key ?? "",
    sort_order: entry.sort_order,
    is_active: entry.is_active,
    redirect_to: "challenges" as const,
  })

  const [imgPrompt, setImgPrompt] = useState(
    entry.last_image_prompt || `Illustration for "${entry.title}", quiz card, isolated graphic`
  )
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null)

  const uploadForm = useForm<{ cover_image: File | null; redirect_to: "challenges" }>({
    cover_image: null,
    redirect_to: "challenges",
  })

  useEffect(() => {
    if (f.data.subcategory_key === "" && subOptions.length > 0) {
      f.setData("subcategory_key", subOptions[0])
    }
  }, [entry.id, subOptions.join("|")])

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    f.put(route("admin.challenge-hub.entries.update", entry.id))
  }

  const genImage = () => {
    router.post(route("admin.challenge-hub.entries.generate-cover", entry.id), {
      prompt: imgPrompt,
      redirect_to: "challenges",
    })
  }

  const validateCoverFile = (file: File | null): string | null =>
    validateChallengeHubCoverFile(file, coverClientMaxBytes)

  const uploadCover = (e: React.FormEvent) => {
    e.preventDefault()
    const file = uploadForm.data.cover_image
    if (!file) return
    const msg = validateCoverFile(file)
    if (msg) {
      setCoverUploadError(msg)
      return
    }
    setCoverUploadError(null)
    uploadForm.clearErrors()
    uploadForm.post(route("admin.challenge-hub.entries.upload-cover", entry.id), {
      forceFormData: true,
      onSuccess: () => {
        uploadForm.setData("cover_image", null)
        setCoverUploadError(null)
      },
      onError: (errors) => {
        const bag = errors as Record<string, unknown>
        const fromField = bag.cover_image
        const str =
          typeof fromField === "string"
            ? fromField
            : Array.isArray(fromField)
              ? String(fromField[0])
              : typeof bag.message === "string"
                ? bag.message
                : null
        const all = JSON.stringify(errors)
        if (
          str?.includes("413") ||
          all.includes("413") ||
          str?.toLowerCase().includes("too large") ||
          all.toLowerCase().includes("request entity too large")
        ) {
          setCoverUploadError(
            `The server rejected this upload (413). Use an image under ${formatKbAsMb(coverClientMaxKb)}MB, or raise nginx client_max_body_size (and CHALLENGE_HUB_ADMIN_ENTRY_COVER_CLIENT_MAX_KB) so larger files can reach PHP.`
          )
          return
        }
        setCoverUploadError(
          str ||
            `Upload failed. Use an image under ${formatKbAsMb(coverClientMaxKb)}MB (${coverClientMaxKb}KB). Server allows up to ${formatKbAsMb(coverServerMaxKb)}MB when nginx/PHP limits are high enough.`
        )
      },
    })
  }

  const confirmRemove = () => {
    setIsDeleting(true)
    router.delete(`${route("admin.challenge-hub.entries.destroy", entry.id)}?redirect=challenges`, {
      onFinish: () => {
        setIsDeleting(false)
        setDeleteOpen(false)
      },
    })
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Challenge Hub", href: route("admin.challenge-hub.categories.index") },
    { title: "Challenges", href: route("admin.challenge-hub.challenges.index") },
    { title: entry.title, href: route("admin.challenge-hub.challenges.edit", entry.id) },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`${entry.title} — Challenge`} />
      <div className="w-full max-w-none p-4 sm:p-6">
        <ChallengeHubAdminNav active="challenges" />

        {flash?.success ? (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            {flash.success}
          </div>
        ) : null}
        {flash?.error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
            {flash.error}
          </div>
        ) : null}

        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
          <Link href={route("admin.challenge-hub.challenges.index")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to challenges
          </Link>
        </Button>

        <div className="mb-4 text-sm text-muted-foreground">
          Track:{" "}
          <Link
            href={route("admin.challenge-hub.tracks.edit", track.slug)}
            className="font-medium text-foreground underline underline-offset-2"
          >
            {track.name}
          </Link>
        </div>

        <Card className="w-full max-w-none">
          <CardHeader>
            <CardTitle>Edit challenge</CardTitle>
            <CardDescription className="space-y-2">
              {entry.slug ? (
                <span className="block text-foreground">
                  URL slug: <span className="font-mono text-xs">{entry.slug}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    /challenge-hub/{track.slug}/play/{entry.slug}
                  </span>
                </span>
              ) : null}
              <span className="block">
                Subcategory must match a name from Challenge Hub → Subcategories for this track’s hub (same as quiz
                filters). Changing the title updates the slug when you save.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label>Title</Label>
                  <Input
                    className="w-full"
                    value={f.data.title}
                    onChange={(e) => f.setData("title", e.target.value)}
                    required
                  />
                  {f.errors.title ? <p className="text-sm text-red-600">{f.errors.title}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label>Sort order</Label>
                  <Input
                    className="w-full"
                    type="number"
                    min={0}
                    value={f.data.sort_order}
                    onChange={(e) => f.setData("sort_order", parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div className="flex items-end pb-1">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="active-entry"
                      checked={f.data.is_active}
                      onCheckedChange={(v) => f.setData("is_active", v === true)}
                    />
                    <Label htmlFor="active-entry">Active</Label>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    className="w-full"
                    rows={3}
                    value={f.data.description}
                    onChange={(e) => f.setData("description", e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Subcategory (required)</Label>
                  <Select
                    value={f.data.subcategory_key !== "" ? f.data.subcategory_key : undefined}
                    onValueChange={(v) => f.setData("subcategory_key", v)}
                    disabled={subOptions.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          subOptions.length === 0
                            ? "Add subcategories for this hub first"
                            : "Select subcategory"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {subOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {f.errors.subcategory_key ? (
                    <p className="text-sm text-red-600">{f.errors.subcategory_key}</p>
                  ) : null}
                </div>
                <div className="flex justify-end md:col-span-2">
                  <Button type="submit" disabled={f.processing || subOptions.length === 0}>
                    Save challenge
                  </Button>
                </div>
              </div>
            </form>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <p className="mb-2 text-sm font-medium">Cover image</p>
              {entry.cover_image_url ? (
                <div className="mb-3 flex items-center gap-3">
                  <img
                    src={entry.cover_image_url}
                    alt=""
                    className="h-24 w-24 rounded-md border object-cover bg-gray-100 dark:bg-gray-900"
                  />
                </div>
              ) : (
                <p className="mb-2 text-xs text-gray-500">No image yet.</p>
              )}

              <p className="mb-2 text-xs text-muted-foreground">Generate with OpenAI (replaces existing)</p>
              <Textarea rows={3} value={imgPrompt} onChange={(e) => setImgPrompt(e.target.value)} className="mb-2 w-full" />
              <div className="flex w-full justify-end">
                <Button type="button" variant="secondary" size="sm" onClick={genImage}>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate / replace image
                </Button>
              </div>

              <form onSubmit={uploadCover} className="mt-6 border-t pt-4">
                <p className="mb-2 text-xs text-muted-foreground">
                  Or upload a file (JPEG, PNG, WebP). Safe size for this environment: up to{" "}
                  <strong>
                    {formatKbAsMb(coverClientMaxKb)}MB ({coverClientMaxKb}KB)
                  </strong>{" "}
                  — larger files are often blocked by nginx before Laravel runs. Backend accepts up to{" "}
                  {formatKbAsMb(coverServerMaxKb)}MB when the server is configured for it.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Label htmlFor="cover-upload">Image file</Label>
                    <Input
                      id="cover-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="cursor-pointer"
                      onChange={(e) => {
                        const next = e.target.files?.[0] ?? null
                        uploadForm.setData("cover_image", next)
                        uploadForm.clearErrors()
                        setCoverUploadError(next ? validateCoverFile(next) : null)
                      }}
                    />
                  </div>
                  <Button type="submit" variant="outline" size="sm" disabled={!uploadForm.data.cover_image || uploadForm.processing}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                </div>
                {coverUploadError ? (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                    {coverUploadError}
                  </p>
                ) : null}
                {uploadForm.errors.cover_image ? (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                    {uploadForm.errors.cover_image}
                  </p>
                ) : null}
              </form>
            </div>

            <div className="flex justify-end border-t pt-4">
              <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete challenge
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmRemove}
        title="Delete challenge"
        message={`Delete “${entry.title}”? This cannot be undone.`}
        isLoading={isDeleting}
      />
    </AppLayout>
  )
}
