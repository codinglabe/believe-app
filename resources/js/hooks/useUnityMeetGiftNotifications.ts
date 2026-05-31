import { useEcho } from "@laravel/echo-react"
import { useCallback } from "react"
import toast from "react-hot-toast"

export type UnityMeetGiftPayload = {
  recipientId: number
  senderId: number
  senderName: string
  amount: number
  amountLabel: string
  occasion: string
  message?: string | null
  title?: string
  body?: string
}

/**
 * In-meeting toast when the signed-in user receives a Believe Points gift.
 */
export function useUnityMeetGiftNotifications(
  broadcastChannel: string | null | undefined,
  authUserId: number,
): void {
  const onGift = useCallback(
    (payload: UnityMeetGiftPayload) => {
      if (!authUserId || payload.recipientId !== authUserId) {
        return
      }

      const detail = payload.message
        ? `${payload.body ?? ""}\n"${payload.message}"`
        : (payload.body ?? `${payload.senderName} sent you ${payload.amountLabel} BP.`)

      toast.success(detail, {
        duration: 8000,
        icon: "🎁",
      })
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
}
