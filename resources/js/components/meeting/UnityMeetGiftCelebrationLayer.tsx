"use client"

import { useCallback, useState } from "react"
import { useEcho } from "@laravel/echo-react"
import UnityMeetGiftCelebration from "@/components/meeting/UnityMeetGiftCelebration"
import type { UnityMeetGiftPayload } from "@/hooks/useUnityMeetGiftNotifications"

type Props = {
  broadcastChannel: string | null | undefined
  authUserId: number
}

export default function UnityMeetGiftCelebrationLayer({ broadcastChannel, authUserId }: Props) {
  const [gift, setGift] = useState<UnityMeetGiftPayload | null>(null)

  const onGift = useCallback(
    (payload: UnityMeetGiftPayload) => {
      if (!authUserId || payload.recipientId !== authUserId) {
        return
      }
      setGift(payload)
    },
    [authUserId],
  )

  useEcho<UnityMeetGiftPayload>(
    broadcastChannel ?? "unity-live.disabled",
    ".gift.received",
    onGift,
    [broadcastChannel, onGift],
    "public",
  )

  return <UnityMeetGiftCelebration gift={gift} onDismiss={() => setGift(null)} />
}
