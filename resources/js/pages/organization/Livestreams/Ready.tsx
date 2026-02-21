"use client"

import { useState } from "react"
import { Head, Link } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Copy, Check, Play } from "lucide-react"
import AppLayout from "@/layouts/app-layout"

const BRAND = {
  from: "#9333ea",
  to: "#2563eb",
}

interface Livestream {
  id: number
  title: string | null
  roomName: string
  roomPassword: string
  joinUrl: string
}

interface Organization {
  id: number
  name: string
}

interface Props {
  livestream: Livestream
  organization: Organization
}

export default function Ready({ livestream, organization }: Props) {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <AppLayout>
      <Head title="Meeting ready" />
      <div className="min-h-screen bg-background">
        <div
          className="relative overflow-hidden border-b border-purple-200 dark:border-purple-500/20"
          style={{
            background: `linear-gradient(135deg, rgba(147,51,234,0.12) 0%, rgba(37,99,235,0.1) 100%)`,
          }}
        >
          <div className="relative w-full px-4 py-10 md:px-6 lg:px-8 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg mb-4" style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}>
              <Check className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Meeting ready
            </h1>
            <p className="mt-2 text-muted-foreground">
              Invite others with the link below. When you’re ready, start the meeting.
            </p>
          </div>
        </div>

        <div className="w-full max-w-lg mx-auto px-4 py-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Meeting ID</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={livestream.roomName} readOnly className="font-mono" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copy(livestream.roomName, "room")}
                >
                  {copied === "room" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Passcode</p>
                <div className="flex gap-2">
                  <Input value={livestream.roomPassword} readOnly className="font-mono" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copy(livestream.roomPassword, "pass")}
                  >
                    {copied === "pass" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            <Link href={`/livestreams/${livestream.id}`} className="block w-full">
              <Button
                size="lg"
                className="h-12 w-full text-base font-semibold text-white"
                style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
              >
                <Play className="mr-2 h-5 w-5" />
                Start meeting
              </Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 w-full"
              onClick={() => copy(livestream.joinUrl, "invite")}
            >
              {copied === "invite" ? <Check className="mr-2 h-5 w-5 text-green-600" /> : <Copy className="mr-2 h-5 w-5" />}
              Copy invite link
            </Button>
          </div>

          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-sm">Invite link</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-mono text-muted-foreground break-all">
                {livestream.joinUrl}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
