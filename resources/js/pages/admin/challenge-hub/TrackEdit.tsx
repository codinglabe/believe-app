"use client"

import React, { useEffect, useState } from "react"
import { Head, Link, router, useForm, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal"
import { ChallengeHubAdminNav } from "@/components/challenge-hub-admin-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Trash2, Upload, Wand2 } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

declare global {
  function route(name: string, params?: Record<string, unknown> | (string | number)[]): string
}

interface TrackPayload {
  id: number
  slug: string
  name: string
  status: string
  subject_categories: string[]
  hub_category_id: number | null
  quiz_subcategory: string | null
  hub_card_description: string | null
  cover_image_url: string | null
}

interface EntryRow {
  id: number
  title: string
  slug?: string | null
  description: string | null
  subcategory_key: string | null
  sort_order: number
  is_active: boolean
  cover_image_url: string | null
  last_image_prompt: string | null
}

type HubRow = { id: number; label: string; slug: string }

interface Props {
  track: TrackPayload
  entries: EntryRow[]
  hub_categories: HubRow[]
  subcategories_by_category: Record<string, string[]>
}

function EntryEditor({
  entry,
  subcategoryOptions,
}: {
  entry: EntryRow
  subcategoryOptions: string[]
}) {
  const [imgPrompt, setImgPrompt] = useState(entry.last_image_prompt || `Illustration for "${entry.title}", quiz card, isolated graphic`)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeletingEntry, setIsDeletingEntry] = useState(false)
  const f = useForm({
    title: entry.title,
    description: entry.description ?? "",
    subcategory_key: entry.subcategory_key ?? "",
    sort_order: entry.sort_order,
    is_active: entry.is_active,
  })

  useEffect(() => {
    if (f.data.subcategory_key === "" && subcategoryOptions.length > 0) {
      f.setData("subcategory_key", subcategoryOptions[0])
    }
  }, [entry.id, subcategoryOptions.join("|")])

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    f.put(route("admin.challenge-hub.entries.update", entry.id))
  }

  const genImage = () => {
    router.post(route("admin.challenge-hub.entries.generate-cover", entry.id), { prompt: imgPrompt })
  }

  const confirmRemove = () => {
    setIsDeletingEntry(true)
    router.delete(route("admin.challenge-hub.entries.destroy", entry.id), {
      onFinish: () => {
        setIsDeletingEntry(false)
        setDeleteOpen(false)
      },
    })
  }

  return (
    <>
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/50 p-4 dark:border-gray-600 dark:bg-gray-900/30">
      <p className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">Entry #{entry.id}</p>
      {entry.slug ? (
        <p className="mb-3 font-mono text-xs text-gray-600 dark:text-gray-400">{entry.slug}</p>
      ) : null}
      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        Subcategory must match a name from Challenge Hub → Subcategories for this track’s hub (same as quiz subcategory
        filters).
      </p>
      <div className="space-y-4">
        <form onSubmit={save} className="w-full">
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
                  id={`active-${entry.id}`}
                  checked={f.data.is_active}
                  onCheckedChange={(v) => f.setData("is_active", v === true)}
                />
                <Label htmlFor={`active-${entry.id}`}>Active</Label>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea
                className="w-full"
                rows={2}
                value={f.data.description}
                onChange={(e) => f.setData("description", e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Subcategory (required)</Label>
              <Select
                value={f.data.subcategory_key !== "" ? f.data.subcategory_key : undefined}
                onValueChange={(v) => f.setData("subcategory_key", v)}
                disabled={subcategoryOptions.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      subcategoryOptions.length === 0
                        ? "Add subcategories for this hub first"
                        : "Select subcategory"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {subcategoryOptions.map((s) => (
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
              <Button type="submit" disabled={f.processing || subcategoryOptions.length === 0}>
                Save entry
              </Button>
            </div>
          </div>
        </form>

        <div className="w-full rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <p className="mb-2 text-sm font-medium">Cover image (OpenAI)</p>
          {entry.cover_image_url ? (
            <div className="mb-3 flex items-center gap-3">
              <img
                src={entry.cover_image_url}
                alt=""
                className="h-20 w-20 rounded-md border object-cover bg-gray-100 dark:bg-gray-900"
              />
            </div>
          ) : (
            <p className="mb-2 text-xs text-gray-500">No image yet.</p>
          )}
          <Textarea
            rows={3}
            value={imgPrompt}
            onChange={(e) => setImgPrompt(e.target.value)}
            className="mb-2 w-full"
          />
          <div className="flex w-full justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={genImage}>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate / replace image
            </Button>
          </div>
        </div>

        <div className="flex w-full justify-end">
          <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete entry
          </Button>
        </div>
      </div>
    </div>

    <DeleteConfirmModal
      isOpen={deleteOpen}
      onClose={() => setDeleteOpen(false)}
      onConfirm={confirmRemove}
      title="Delete challenge entry"
      message={`Delete “${entry.title}”? This cannot be undone.`}
      isLoading={isDeletingEntry}
    />
    </>
  )
}

export default function AdminChallengeHubTrackEdit({
  track,
  entries,
  hub_categories,
  subcategories_by_category,
}: Props) {
  const { flash } = usePage().props as { flash?: { success?: string; error?: string } }

  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Challenge Hub", href: route("admin.challenge-hub.categories.index") },
    { title: "Tracks", href: route("admin.challenge-hub.tracks.index") },
    { title: track.name, href: `/admin/challenge-hub/tracks/${track.slug}/edit` },
  ]

  const inferredHub =
    track.hub_category_id != null
      ? hub_categories.find((h) => h.id === track.hub_category_id)
      : hub_categories.find((h) => h.label === track.subject_categories?.[0])
  const initialHubId = inferredHub != null ? String(inferredHub.id) : ""

  const trackForm = useForm({
    name: track.name,
    status: track.status,
    hub_card_description: track.hub_card_description ?? "",
    hub_category_id: initialHubId,
    quiz_subcategory: track.quiz_subcategory ?? "",
  })

  const coverForm = useForm({
    prompt: `Premium app icon style illustration for "${track.name}", challenge hub, dark purple and gold, isolated subject`,
  })

  const uploadCoverForm = useForm<{ cover_image: File | null }>({
    cover_image: null,
  })

  const selectedHub = hub_categories.find((h) => String(h.id) === String(trackForm.data.hub_category_id))
  const hubLabel = selectedHub?.label ?? ""
  const subOptions = hubLabel ? subcategories_by_category[hubLabel] ?? [] : []
  const quizSubVal = trackForm.data.quiz_subcategory
  const subList = [...subOptions]
  if (quizSubVal && !subList.includes(quizSubVal)) {
    subList.unshift(quizSubVal)
  }

  useEffect(() => {
    if (trackForm.data.quiz_subcategory === "" && subList.length > 0) {
      trackForm.setData("quiz_subcategory", subList[0])
    }
  }, [track.slug, hubLabel, subList.join("|")])

  const createForm = useForm({
    title: "",
    description: "",
    subcategory_key: "",
    sort_order: 0,
    is_active: true,
  })

  useEffect(() => {
    if (subOptions.length === 0) {
      createForm.setData("subcategory_key", "")
      return
    }
    createForm.setData("subcategory_key", subOptions[0])
  }, [track.slug, hubLabel, subOptions.join("|")])

  const saveTrack = (e: React.FormEvent) => {
    e.preventDefault()
    trackForm.put(route("admin.challenge-hub.tracks.update", track.slug))
  }

  const genTrackCover = (e: React.FormEvent) => {
    e.preventDefault()
    coverForm.post(route("admin.challenge-hub.tracks.generate-cover", track.slug))
  }

  const uploadTrackCover = (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadCoverForm.data.cover_image) return
    uploadCoverForm.post(route("admin.challenge-hub.tracks.upload-cover", track.slug), {
      forceFormData: true,
      onSuccess: () => uploadCoverForm.setData("cover_image", null),
    })
  }

  const createEntry = (e: React.FormEvent) => {
    e.preventDefault()
    createForm.post(route("admin.challenge-hub.tracks.entries.store", track.slug), {
      onSuccess: () => createForm.reset(),
    })
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Edit ${track.name} — Challenge Hub`} />
      <div className="w-full max-w-full p-4 sm:p-6">
        <ChallengeHubAdminNav active="tracks" />
        <Card className="w-full">
          <CardHeader className="space-y-4">
            <div className="w-full">
              <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
                <Link href={route("admin.challenge-hub.tracks.index")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to tracks
                </Link>
              </Button>
              <CardTitle className="text-2xl">{track.name}</CardTitle>
              <CardDescription className="mt-1.5">
                Slug <span className="font-mono text-xs">{track.slug}</span> is generated from the track name and kept unique when you save.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-10">
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

            <section className="w-full">
              <h3 className="mb-4 text-lg font-semibold">Track details</h3>
              <form onSubmit={saveTrack} className="w-full">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Name</Label>
                    <Input
                      className="w-full"
                      value={trackForm.data.name}
                      onChange={(e) => trackForm.setData("name", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={trackForm.data.status}
                      onValueChange={(v) => trackForm.setData("status", v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="coming_soon">Coming soon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Hub category</Label>
                    <Select
                      value={trackForm.data.hub_category_id !== "" ? String(trackForm.data.hub_category_id) : ""}
                      onValueChange={(v) => {
                        trackForm.setData("hub_category_id", v)
                        const row = hub_categories.find((h) => String(h.id) === v)
                        const label = row?.label ?? ""
                        const nextSubs = label ? subcategories_by_category[label] ?? [] : []
                        trackForm.setData("quiz_subcategory", nextSubs[0] ?? "")
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {hub_categories.map((h) => (
                          <SelectItem key={h.id} value={String(h.id)}>
                            {h.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {trackForm.errors.hub_category_id ? (
                      <p className="text-sm text-red-600">{trackForm.errors.hub_category_id}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Quiz subcategory (required)</Label>
                    <Select
                      value={trackForm.data.quiz_subcategory !== "" ? trackForm.data.quiz_subcategory : undefined}
                      onValueChange={(v) => trackForm.setData("quiz_subcategory", v)}
                      disabled={!hubLabel || subList.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            !hubLabel
                              ? "Pick a hub category first"
                              : subList.length === 0
                                ? "Add subcategories for this hub first"
                                : "Select subcategory"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {subList.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hubLabel && subList.length === 0 ? (
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        No subcategories for this hub yet. Create them under Challenge Hub → Subcategories.
                      </p>
                    ) : null}
                    {trackForm.errors.quiz_subcategory ? (
                      <p className="text-sm text-red-600">{trackForm.errors.quiz_subcategory}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Hub card description</Label>
                    <Textarea
                      className="w-full"
                      rows={3}
                      value={trackForm.data.hub_card_description}
                      onChange={(e) => trackForm.setData("hub_card_description", e.target.value)}
                      placeholder="Short line shown on the Challenge Hub grid (optional)."
                    />
                  </div>
                  <div className="flex justify-end md:col-span-2">
                    <Button
                      type="submit"
                      disabled={
                        trackForm.processing ||
                        !trackForm.data.hub_category_id ||
                        !trackForm.data.quiz_subcategory ||
                        subList.length === 0
                      }
                    >
                      Save track
                    </Button>
                  </div>
                </div>
              </form>
            </section>

            <div className="w-full border-t border-gray-200 pt-10 dark:border-gray-800">
              <section className="w-full">
                <h3 className="mb-1 text-lg font-semibold">Track cover image</h3>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Upload an image or generate one with AI; files are resized and stored under public storage.
                </p>
                {track.cover_image_url ? (
                  <img
                    src={track.cover_image_url}
                    alt=""
                    className="mb-4 h-32 w-32 rounded-lg border object-cover bg-gray-100 dark:bg-gray-900"
                  />
                ) : (
                  <p className="mb-4 text-sm text-gray-500">No cover image yet.</p>
                )}
                <form onSubmit={uploadTrackCover} className="mb-6 w-full space-y-3">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end md:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="track-cover-file">Upload image</Label>
                      <Input
                        id="track-cover-file"
                        className="w-full cursor-pointer"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null
                          uploadCoverForm.setData("cover_image", f)
                        }}
                      />
                    </div>
                    <div className="flex justify-end md:pb-0.5">
                      <Button type="submit" disabled={uploadCoverForm.processing || !uploadCoverForm.data.cover_image}>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload cover
                      </Button>
                    </div>
                  </div>
                  {uploadCoverForm.errors.cover_image ? (
                    <p className="text-sm text-red-600">{uploadCoverForm.errors.cover_image}</p>
                  ) : null}
                </form>
                <form onSubmit={genTrackCover} className="w-full space-y-2">
                  <Label>Generate with AI (prompt)</Label>
                  <Textarea
                    className="w-full"
                    rows={4}
                    value={coverForm.data.prompt}
                    onChange={(e) => coverForm.setData("prompt", e.target.value)}
                    required
                  />
                  {coverForm.errors.prompt ? <p className="text-sm text-red-600">{coverForm.errors.prompt}</p> : null}
                  <div className="flex w-full justify-end">
                    <Button type="submit" disabled={coverForm.processing}>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate cover
                    </Button>
                  </div>
                </form>
              </section>
            </div>

            <div className="w-full border-t border-gray-200 pt-10 dark:border-gray-800">
              <section className="w-full">
                <h3 className="mb-1 text-lg font-semibold">Challenge entries (View Challenges page)</h3>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                  The public page always builds cards from your question bank for this track (hub category + quiz subcategory).
                  Entries are optional: use them to override title, description, and cover art for a subcategory that already
                  has questions, or add a card before questions exist. Match <span className="font-mono">subcategory_key</span>{" "}
                  to the subcategory name shown on grouped questions.
                </p>

                <form onSubmit={createEntry} className="mb-8 w-full rounded-lg border border-dashed p-4">
                  <p className="mb-4 text-sm font-medium">New entry</p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Title</Label>
                      <Input
                        className="w-full"
                        value={createForm.data.title}
                        onChange={(e) => createForm.setData("title", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sort order</Label>
                      <Input
                        className="w-full"
                        type="number"
                        value={createForm.data.sort_order}
                        onChange={(e) => createForm.setData("sort_order", parseInt(e.target.value, 10) || 0)}
                      />
                    </div>
                    <div className="flex items-end pb-1">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="create-active"
                          checked={createForm.data.is_active}
                          onCheckedChange={(v) => createForm.setData("is_active", v === true)}
                        />
                        <Label htmlFor="create-active">Active</Label>
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        className="w-full"
                        rows={2}
                        value={createForm.data.description}
                        onChange={(e) => createForm.setData("description", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Subcategory (required)</Label>
                      <Select
                        value={createForm.data.subcategory_key !== "" ? createForm.data.subcategory_key : undefined}
                        onValueChange={(v) => createForm.setData("subcategory_key", v)}
                        disabled={!hubLabel || subOptions.length === 0}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              !hubLabel
                                ? "Set track hub category first"
                                : subOptions.length === 0
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
                      {createForm.errors.subcategory_key ? (
                        <p className="text-sm text-red-600">{createForm.errors.subcategory_key}</p>
                      ) : null}
                    </div>
                    <div className="flex justify-end md:col-span-2">
                      <Button
                        type="submit"
                        disabled={
                          createForm.processing ||
                          !hubLabel ||
                          !createForm.data.subcategory_key ||
                          subOptions.length === 0
                        }
                      >
                        Add entry
                      </Button>
                    </div>
                  </div>
                </form>

                <div className="space-y-4">
                  {entries.length === 0 ? (
                    <p className="text-sm text-gray-500">No entries — the site falls back to grouped quiz data.</p>
                  ) : (
                    entries.map((e) => {
                      const opts = [...subOptions]
                      if (e.subcategory_key && !opts.includes(e.subcategory_key)) {
                        opts.unshift(e.subcategory_key)
                      }
                      return <EntryEditor key={e.id} entry={e} subcategoryOptions={opts} />
                    })
                  )}
                </div>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
