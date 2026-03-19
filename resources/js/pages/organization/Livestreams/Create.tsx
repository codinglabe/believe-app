"use client"

import type React from "react"
import { Head, useForm, Link } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/admin/ui/switch"
import { Video, ArrowLeft, Mic, Camera, Download } from "lucide-react"
import AppLayout from "@/layouts/app-layout"

const BRAND = {
  from: "#9333ea",
  to: "#2563eb",
  fromMuted: "rgba(147,51,234,0.15)",
  toMuted: "rgba(37,99,235,0.1)",
}

interface Organization {
  id: number
  name: string
  slug: string
}

interface Props {
  organization: Organization
  hasYoutubeIntegrated: boolean
}

export default function CreateLivestream({ organization, hasYoutubeIntegrated }: Props) {
  const { data, setData, post, processing, errors } = useForm({
    title: "",
    display_name: organization.name ?? "",
    auto_create_youtube: hasYoutubeIntegrated,
    is_public: true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/livestreams")
  }

  return (
    <AppLayout>
      <Head title="Start a New Meeting" />
      <div className="min-h-screen bg-background">
        <div
          className="relative overflow-hidden border-b border-purple-200 dark:border-purple-500/20"
          style={{
            background: `linear-gradient(135deg, ${BRAND.fromMuted} 0%, rgba(147,51,234,0.2) 50%, ${BRAND.toMuted} 100%)`,
          }}
        >
          <div className="relative w-full px-4 py-8 md:px-6 lg:px-8">
            <Link
              href="/livestreams"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Start a New Meeting
            </h1>
            <p className="mt-1 text-muted-foreground">
              Create a meeting in one click. Invite others and go live when you’re ready.
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
                <Video className="mr-2 h-5 w-5" />
                {processing ? "Creating…" : "Create meeting"}
              </Button>
              <Link href="/livestreams" className="block w-full">
                <Button type="button" variant="outline" size="lg" className="h-12 w-full">
                  Join existing meeting
                </Button>
              </Link>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">Options</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mic className="h-4 w-4" />
                <span>Mic & camera</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Camera className="h-4 w-4" />
                <span>Audio only</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <a
                href="https://obsproject.com/download"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Download className="h-4 w-4" />
                Download OBS Studio (optional)
              </a>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
