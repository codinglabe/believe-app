"use client"

import React from "react"
import { Head, Link, useForm, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
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
import { ArrowLeft } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

declare global {
  function route(name: string, params?: Record<string, unknown> | (string | number)[]): string
}

interface TrackOption {
  id: number
  name: string
  slug: string
}

interface Props {
  tracks: TrackOption[]
}

export default function AdminChallengeHubChallengeCreate() {
  const { tracks } = usePage<Props>().props
  const { flash } = usePage().props as { flash?: { success?: string; error?: string } }

  const form = useForm({
    level_up_track_id: tracks[0]?.id != null ? String(tracks[0].id) : "",
    title: "",
    description: "",
    sort_order: 0,
    is_active: true,
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    form.post(route("admin.challenge-hub.challenges.store"))
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Challenge Hub", href: route("admin.challenge-hub.categories.index") },
    { title: "Challenges", href: route("admin.challenge-hub.challenges.index") },
    { title: "Create", href: route("admin.challenge-hub.challenges.create") },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Create challenge — Challenge Hub" />
      <div className="w-full max-w-full p-4 sm:p-6">
        <ChallengeHubAdminNav active="challenges" />
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
          <Link href={route("admin.challenge-hub.challenges.index")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to challenges
          </Link>
        </Button>

        {flash?.error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
            {flash.error}
          </div>
        ) : null}

        <Card className="w-full">
          <CardHeader>
            <CardTitle>New challenge</CardTitle>
            <CardDescription>
              Pick a track and set the card title and description. You can add a subcategory filter and cover image on the
              edit screen after saving.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tracks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tracks yet.{" "}
                <Link href={route("admin.challenge-hub.tracks.create")} className="underline underline-offset-2">
                  Create a track
                </Link>{" "}
                first.
              </p>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Track</Label>
                  <Select
                    value={form.data.level_up_track_id || undefined}
                    onValueChange={(v) => form.setData("level_up_track_id", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select track" />
                    </SelectTrigger>
                    <SelectContent>
                      {tracks.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.errors.level_up_track_id ? (
                    <p className="text-sm text-red-600">{form.errors.level_up_track_id}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={form.data.title}
                    onChange={(e) => form.setData("title", e.target.value)}
                    required
                    className="w-full"
                  />
                  {form.errors.title ? <p className="text-sm text-red-600">{form.errors.title}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    rows={3}
                    value={form.data.description}
                    onChange={(e) => form.setData("description", e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Sort order</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.data.sort_order}
                      onChange={(e) => form.setData("sort_order", parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="is_active"
                        checked={form.data.is_active}
                        onCheckedChange={(v) => form.setData("is_active", v === true)}
                      />
                      <Label htmlFor="is_active">Active</Label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={form.processing}>
                    Create challenge
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
