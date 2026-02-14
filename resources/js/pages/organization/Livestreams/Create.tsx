"use client"

import type React from "react"
import { Head, useForm, router, Link } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/admin/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Video, Calendar, Youtube, Info, ArrowLeft, CheckCircle2 } from "lucide-react"
import { Switch } from "@/components/admin/ui/switch"
import AppLayout from "@/layouts/app-layout"

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
    description: "",
    scheduled_at: "",
    youtube_stream_key: "",
    auto_create_youtube: hasYoutubeIntegrated,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/livestreams")
  }

  return (
    <AppLayout>
      <Head title="Create Livestream" />
      <div className="w-full px-4 py-8 md:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6">
          <Link
            href="/livestreams"
            className="inline-flex w-fit items-center text-sm text-gray-400 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Livestreams
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Create New Livestream</h1>
            <p className="mt-1 text-gray-400">
              Set up a VDO.Ninja room for your organization's virtual events
            </p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Stream Details */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Stream Details
                </CardTitle>
                <CardDescription>
                  Basic information about your livestream
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title (Optional)</Label>
                  <Input
                    id="title"
                    value={data.title}
                    onChange={(e) => setData("title", e.target.value)}
                    placeholder="e.g., Weekly Service - February 10"
                    className="mt-1"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-500">{errors.title}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={data.description}
                    onChange={(e) => setData("description", e.target.value)}
                    placeholder="Describe your livestream event..."
                    className="mt-1"
                    rows={4}
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-500">{errors.description}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="scheduled_at">Scheduled Start Time (Optional)</Label>
                  <Input
                    id="scheduled_at"
                    type="datetime-local"
                    value={data.scheduled_at}
                    onChange={(e) => setData("scheduled_at", e.target.value)}
                    className="mt-1"
                  />
                  {errors.scheduled_at && (
                    <p className="mt-1 text-sm text-red-500">{errors.scheduled_at}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-400">
                    Leave empty to create a draft stream
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* YouTube Integration */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Youtube className="h-5 w-5" />
                  YouTube Integration (Optional)
                </CardTitle>
                <CardDescription>
                  {hasYoutubeIntegrated
                    ? "Automatically create YouTube broadcast or manually enter stream key"
                    : "Connect YouTube to auto-create live broadcasts"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasYoutubeIntegrated ? (
                  <>
                    <div className="flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                          <Label htmlFor="auto_create_youtube" className="cursor-pointer font-semibold">
                            Auto-create YouTube Broadcast
                          </Label>
                        </div>
                        <p className="text-sm text-gray-400">
                          Automatically create a YouTube live broadcast and get the stream key
                        </p>
                      </div>
                      <Switch
                        id="auto_create_youtube"
                        checked={data.auto_create_youtube}
                        onCheckedChange={(checked) => setData("auto_create_youtube", checked)}
                      />
                    </div>

                    {!data.auto_create_youtube && (
                      <>
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            <strong>How to get your YouTube Stream Key:</strong>
                            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm">
                              <li>Go to YouTube Studio → Go Live</li>
                              <li>Create a new stream or use an existing one</li>
                              <li>Copy the &quot;Stream Key&quot; (starts with &quot;rtmp://&quot; or similar)</li>
                              <li>Paste it here to enable OBS → YouTube streaming</li>
                            </ol>
                          </AlertDescription>
                        </Alert>
                        <div>
                          <Label htmlFor="youtube_stream_key">YouTube Stream Key</Label>
                          <Input
                            id="youtube_stream_key"
                            type="password"
                            value={data.youtube_stream_key}
                            onChange={(e) => setData("youtube_stream_key", e.target.value)}
                            placeholder="Paste your YouTube stream key here"
                            className="mt-1 font-mono text-sm"
                          />
                          {errors.youtube_stream_key && (
                            <p className="mt-1 text-sm text-red-500">{errors.youtube_stream_key}</p>
                          )}
                          <p className="mt-1 text-sm text-gray-400">
                            You can add this later from the host dashboard
                          </p>
                        </div>
                      </>
                    )}

                    {data.auto_create_youtube && (
                      <Alert className="border-green-500/30 bg-green-500/10">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <AlertDescription>
                          <strong>Auto-create enabled!</strong> A YouTube live broadcast will be automatically created when you save this livestream.
                          You can use the YouTube Live tab with VDO.Ninja + OBS to go live.
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                ) : (
                  <Alert className="border-amber-500/30 bg-amber-500/10">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Connect YouTube to enable auto-create.</strong> Link your YouTube account in Integrations to automatically create live broadcasts and get stream keys for this livestream.
                      <div className="mt-3">
                        <Link
                          href="/integrations/youtube"
                          className="inline-flex items-center gap-2 text-sm font-medium text-[#FF1493] hover:underline"
                        >
                          Connect YouTube in Integrations
                        </Link>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.visit("/livestreams")}
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:border-purple-400 hover:text-purple-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={processing}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500"
            >
              {processing ? "Creating..." : "Create Livestream"}
            </Button>
          </div>
        </form>

        {/* What happens next */}
        <Card className="mt-8 border-blue-500/30 bg-blue-500/10">
          <CardHeader>
            <CardTitle className="text-sm">What happens next?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-2 text-sm text-gray-300">
              <li>A unique VDO.Ninja room will be automatically generated</li>
              <li>You'll receive a secure password for the room</li>
              <li>Guests can join using a simple link (no accounts needed)</li>
              <li>You'll use OBS Studio to pull in guest feeds and stream to YouTube</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

