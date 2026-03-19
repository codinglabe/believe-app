"use client"

import type React from "react"
import { Head, useForm, Link } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/admin/ui/switch"
import { ArrowLeft } from "lucide-react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"

const BRAND = {
  from: "#9333ea",
  to: "#2563eb",
  fromMuted: "rgba(147,51,234,0.15)",
  toMuted: "rgba(37,99,235,0.1)",
}

interface Livestream {
  id: number
  title: string | null
  description: string | null
  scheduledAt: string | null
  isPublic: boolean
  displayName: string | null
  status: string
}

interface Props {
  livestream: Livestream
}

export default function SupporterLivestreamEdit({ livestream }: Props) {
  const scheduledValue = livestream.scheduledAt
    ? new Date(livestream.scheduledAt).toISOString().slice(0, 16)
    : ""

  const { data, setData, put, processing, errors } = useForm({
    title: livestream.title ?? "",
    description: livestream.description ?? "",
    scheduled_at: scheduledValue,
    display_name: livestream.displayName ?? "",
    is_public: livestream.isPublic,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    put(`/livestreams/supporter/${livestream.id}`)
  }

  return (
    <FrontendLayout>
      <PageHead title="Edit Meeting" description="Update meeting details." />
      <Head title="Edit Meeting" />
      <div className="min-h-screen bg-background">
        <div
          className="relative overflow-hidden border-b border-purple-200 dark:border-purple-500/20"
          style={{
            background: `linear-gradient(135deg, ${BRAND.fromMuted} 0%, rgba(147,51,234,0.2) 50%, ${BRAND.toMuted} 100%)`,
          }}
        >
          <div className="relative w-full px-4 py-8 md:px-6 lg:px-8">
            <Link
              href={`/livestreams/supporter/${livestream.id}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to meeting
            </Link>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Edit Meeting
            </h1>
            <p className="mt-1 text-muted-foreground">
              Update title, description, schedule, and visibility.
            </p>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto px-4 py-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Meeting details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Meeting name</Label>
                  <Input
                    id="title"
                    value={data.title}
                    onChange={(e) => setData("title", e.target.value)}
                    placeholder="e.g. Sunday Service"
                    className="h-11"
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <textarea
                    id="description"
                    value={data.description}
                    onChange={(e) => setData("description", e.target.value)}
                    placeholder="Brief description"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive">{errors.description}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduled_at">Scheduled date & time (optional)</Label>
                  <Input
                    id="scheduled_at"
                    type="datetime-local"
                    value={data.scheduled_at}
                    onChange={(e) => setData("scheduled_at", e.target.value)}
                    className="h-11"
                  />
                  {errors.scheduled_at && (
                    <p className="text-sm text-destructive">{errors.scheduled_at}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_name">Your display name</Label>
                  <Input
                    id="display_name"
                    value={data.display_name}
                    onChange={(e) => setData("display_name", e.target.value)}
                    placeholder="Your name"
                    className="h-11"
                  />
                  {errors.display_name && (
                    <p className="text-sm text-destructive">{errors.display_name}</p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <div className="space-y-0.5 min-w-0">
                    <Label htmlFor="is_public" className="text-sm font-medium">
                      Public meeting
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      When live, show on Unity Live page. Off = private (only people with your viewer link can watch).
                    </p>
                  </div>
                  <Switch
                    id="is_public"
                    checked={data.is_public}
                    onCheckedChange={(checked) => setData("is_public", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={processing}
                size="lg"
                className="h-12 w-full text-base font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})`,
                }}
              >
                {processing ? "Saving…" : "Save changes"}
              </Button>
              <Link href={`/livestreams/supporter/${livestream.id}`} className="block w-full">
                <Button type="button" variant="outline" size="lg" className="h-12 w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </FrontendLayout>
  )
}
