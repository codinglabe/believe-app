"use client"

import { Head } from "@inertiajs/react"
import UnityMeetLayout from "@/layouts/UnityMeetLayout"
import { PageHead } from "@/components/frontend/PageHead"
import UnityMeetSetupCards, { type UnityMeetSetupCardsProps } from "@/components/livestreams/UnityMeetSetupCards"
import { Settings } from "lucide-react"

const BRAND = {
  fromMuted: "rgba(147,51,234,0.15)",
  toMuted: "rgba(37,99,235,0.1)",
}

type Props = UnityMeetSetupCardsProps

export default function UnityMeetSettings(props: Props) {
  return (
    <UnityMeetLayout>
      <PageHead
        title="Settings"
        description="Connect YouTube and Dropbox for Unity Meet streaming and cloud recordings."
      />
      <Head title="Settings · Unity Meet" />

      <div className="min-h-screen bg-background">
        <div
          className="relative overflow-hidden border-b border-purple-200 dark:border-purple-500/20"
          style={{
            background: `linear-gradient(135deg, ${BRAND.fromMuted} 0%, rgba(147,51,234,0.2) 50%, ${BRAND.toMuted} 100%)`,
          }}
        >
          <div className="relative w-full px-4 py-8 md:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 ring-1 ring-purple-500/20">
                <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="space-y-1">
                <h1 className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
                  Settings
                </h1>
                <p className="text-sm text-muted-foreground">
                  Connect YouTube for live streaming, Dropbox for cloud recordings, and manage your meetings.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full px-4 py-8 md:px-6 lg:px-8">
          <UnityMeetSetupCards {...props} />
        </div>
      </div>
    </UnityMeetLayout>
  )
}
