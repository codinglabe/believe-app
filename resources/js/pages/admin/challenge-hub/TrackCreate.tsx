"use client"

import React, { useState } from "react"
import { Head, Link, useForm } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
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
import { ArrowLeft, Plus, Wand2 } from "lucide-react"
import { CHALLENGE_HUB_COVER_MAX_BYTES, validateChallengeHubCoverFile } from "@/lib/challenge-hub-cover-limit"
import type { BreadcrumbItem } from "@/types"

declare global {
  function route(name: string, params?: Record<string, unknown> | (string | number)[]): string
}

type HubRow = { id: number; label: string; slug: string }

interface Props {
  hub_categories: HubRow[]
  subcategories_by_category: Record<string, string[]>
}

export default function AdminChallengeHubTrackCreate({ hub_categories, subcategories_by_category }: Props) {
  const [coverClientError, setCoverClientError] = useState<string | null>(null)

  const form = useForm({
    name: "",
    status: "coming_soon" as "active" | "coming_soon",
    hub_category_id: "" as string | number,
    quiz_subcategory: "",
    sort_order: 0,
    cover_image: null as File | null,
    cover_prompt: "",
  })

  const selectedHub = hub_categories.find((h) => String(h.id) === String(form.data.hub_category_id))
  const hubLabel = selectedHub?.label ?? ""
  const subOptions = hubLabel ? subcategories_by_category[hubLabel] ?? [] : []

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const msg = validateChallengeHubCoverFile(form.data.cover_image, CHALLENGE_HUB_COVER_MAX_BYTES)
    if (msg) {
      setCoverClientError(msg)
      return
    }
    setCoverClientError(null)
    form.post(route("admin.challenge-hub.tracks.store"), {
      forceFormData: true,
    })
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Challenge Hub", href: route("admin.challenge-hub.categories.index") },
    { title: "Tracks", href: route("admin.challenge-hub.tracks.index") },
    { title: "New track", href: route("admin.challenge-hub.tracks.create") },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="New track" />
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
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Plus className="h-6 w-6" />
                New track
              </CardTitle>
              <CardDescription className="mt-1.5">
                The URL slug is generated automatically from the name (unique). Link the track to a hub category and quiz
                subcategory. Optionally add a cover by upload or AI; challenge entries can be added after save.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {hub_categories.length === 0 ? (
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Create at least one hub category before adding a track.
              </p>
            ) : null}
            <form onSubmit={submit} className="w-full">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="tr-name">Name</Label>
                  <Input
                    id="tr-name"
                    className="w-full"
                    value={form.data.name}
                    onChange={(e) => form.setData("name", e.target.value)}
                    required
                  />
                  {form.errors.name ? <p className="text-sm text-red-600">{form.errors.name}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.data.status}
                    onValueChange={(v) => form.setData("status", v as "active" | "coming_soon")}
                  >
                    <SelectTrigger id="tr-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coming_soon">Coming soon</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tr-sort">Sort order</Label>
                  <Input
                    id="tr-sort"
                    className="w-full"
                    type="number"
                    min={0}
                    value={form.data.sort_order}
                    onChange={(e) => form.setData("sort_order", parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hub category</Label>
                  <Select
                    value={form.data.hub_category_id !== "" ? String(form.data.hub_category_id) : ""}
                    onValueChange={(v) => {
                      form.setData("hub_category_id", v)
                      const row = hub_categories.find((h) => String(h.id) === v)
                      const label = row?.label ?? ""
                      const nextSubs = label ? subcategories_by_category[label] ?? [] : []
                      form.setData("quiz_subcategory", nextSubs[0] ?? "")
                    }}
                  >
                    <SelectTrigger id="tr-hub-cat" className="w-full">
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
                  {form.errors.hub_category_id ? (
                    <p className="text-sm text-red-600">{form.errors.hub_category_id}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Quiz subcategory (required)</Label>
                  <Select
                    value={form.data.quiz_subcategory !== "" ? form.data.quiz_subcategory : undefined}
                    onValueChange={(v) => form.setData("quiz_subcategory", v)}
                    disabled={!hubLabel || subOptions.length === 0}
                  >
                    <SelectTrigger id="tr-quiz-sub" className="w-full">
                      <SelectValue
                        placeholder={
                          !hubLabel
                            ? "Pick a hub category first"
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
                  {hubLabel && subOptions.length === 0 ? (
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      No subcategories for this hub yet. Create them under Challenge Hub → Subcategories.
                    </p>
                  ) : null}
                  {form.errors.quiz_subcategory ? (
                    <p className="text-sm text-red-600">{form.errors.quiz_subcategory}</p>
                  ) : null}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 md:col-span-2">
                  Quiz questions for this track are limited to this subcategory. Options come from the taxonomy and from
                  questions in the bank for the selected hub category label.
                </p>

                <div className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-800 md:col-span-2">
                  <h3 className="text-base font-semibold">Cover image (optional)</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Upload a file or describe an image for AI (min. 12 characters). If both are set, upload wins. Max 5MB
                    per image.
                  </p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="tr-create-cover-file">Upload image</Label>
                      <Input
                        id="tr-create-cover-file"
                        className="w-full cursor-pointer"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null
                          form.setData("cover_image", f)
                          form.clearErrors("cover_image")
                          setCoverClientError(
                            f ? validateChallengeHubCoverFile(f, CHALLENGE_HUB_COVER_MAX_BYTES) : null
                          )
                        }}
                      />
                      {coverClientError ? (
                        <p className="text-sm text-red-600">{coverClientError}</p>
                      ) : null}
                      {form.errors.cover_image ? (
                        <p className="text-sm text-red-600">{form.errors.cover_image}</p>
                      ) : null}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="tr-create-cover-prompt">
                        <Wand2 className="mr-1 inline h-4 w-4" />
                        Generate with AI (prompt)
                      </Label>
                      <Textarea
                        id="tr-create-cover-prompt"
                        className="w-full"
                        rows={3}
                        placeholder='e.g. Premium app icon for this challenge track, dark purple and gold, isolated subject'
                        value={form.data.cover_prompt}
                        onChange={(e) => form.setData("cover_prompt", e.target.value)}
                      />
                      {form.errors.cover_prompt ? (
                        <p className="text-sm text-red-600">{form.errors.cover_prompt}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end md:col-span-2">
                  <Button
                    type="submit"
                    disabled={
                      form.processing ||
                      !!coverClientError ||
                      hub_categories.length === 0 ||
                      !form.data.hub_category_id ||
                      !form.data.quiz_subcategory ||
                      subOptions.length === 0
                    }
                  >
                    Create track
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
