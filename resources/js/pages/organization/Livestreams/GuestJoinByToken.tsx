"use client"

import { usePage } from "@inertiajs/react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { GuestMeetJoinExperience } from "@/components/livestreams/GuestMeetJoinExperience"

interface Livestream {
  id: number
  title: string | null
  roomName: string
  participantUrl: string
  status: string
  hasPasscode: boolean
  recordingEnabled?: boolean
  declineContext?: { kind: "user" | "organization"; id: number }
}

interface Organization {
  id: number
  name: string
}

interface Props {
  livestream: Livestream
  organization: Organization
  recordingDeclineReturnTo: string
}

export default function GuestJoinByToken({ livestream, organization, recordingDeclineReturnTo }: Props) {
  const page = usePage()
  const authUser = (page.props as { auth?: { user?: { email?: string; name?: string } } }).auth?.user

  return (
    <FrontendLayout>
      <GuestMeetJoinExperience
        livestream={livestream}
        organization={organization}
        recordingDeclineReturnTo={recordingDeclineReturnTo}
        defaultDisplayName={authUser?.name?.trim() ?? ""}
        guestEmail={authUser?.email?.trim() ?? null}
        consentAppearance="light"
        pageClassName="min-h-screen"
      />
    </FrontendLayout>
  )
}
