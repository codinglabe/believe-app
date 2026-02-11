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
}

export default function CreateLivestream({ organization }: Props) {
  const { data, setData, post, processing, errors } = useForm({
    title: "",
    description: "",
    scheduled_at: "",
    youtube_stream_key: "",
    auto_create_youtube: false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/livestreams")
  }

  return (
    <AppLayout>
      <Head title="Create Livestream" />
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Link href="/livestreams" className="inline-flex items-center text-gray-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Livestreams
        </Link>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create New Livestream</h1>
          <p className="text-gray-400">
            Set up a VDO.Ninja room for your organization's virtual events
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
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
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
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
                  <p className="text-red-500 text-sm mt-1">{errors.description}</p>
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
                  <p className="text-red-500 text-sm mt-1">{errors.scheduled_at}</p>
                )}
                <p className="text-sm text-gray-400 mt-1">
                  Leave empty to create a draft stream
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Youtube className="w-5 h-5" />
                YouTube Integration (Optional)
              </CardTitle>
              <CardDescription>
                Automatically create YouTube broadcast or manually enter stream key
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <Label htmlFor="auto_create_youtube" className="font-semibold cursor-pointer">
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
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      <strong>How to get your YouTube Stream Key:</strong>
                      <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                        <li>Go to YouTube Studio → Go Live</li>
                        <li>Create a new stream or use an existing one</li>
                        <li>Copy the "Stream Key" (starts with "rtmp://" or similar)</li>
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
                      <p className="text-red-500 text-sm mt-1">{errors.youtube_stream_key}</p>
                    )}
                    <p className="text-sm text-gray-400 mt-1">
                      You can add this later from the host dashboard
                    </p>
                  </div>
                </>
              )}

              {data.auto_create_youtube && (
                <Alert className="bg-green-500/10 border-green-500/30">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <AlertDescription>
                    <strong>Auto-create enabled!</strong> A YouTube live broadcast will be automatically created when you save this livestream.
                    Make sure you've connected your YouTube account in <a href="/integrations/youtube" className="text-[#FF1493] hover:underline">Integrations</a>.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={processing}
              className="bg-gradient-to-r from-[#FF1493] to-[#DC143C] hover:from-[#FF1493]/90 hover:to-[#DC143C]/90"
            >
              {processing ? "Creating..." : "Create Livestream"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.visit("/livestreams")}
            >
              Cancel
            </Button>
          </div>
        </form>

        <Card className="mt-8 bg-blue-500/10 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-sm">What happens next?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-300">
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

