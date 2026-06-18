import type { UnityCallParticipantRow, UnityCallPayload } from "@/hooks/useUnityCallNotifications"
import { isUnityCallEndedLocally } from "@/lib/unityCall"

export function computeUnityCallMediaState(
  call: UnityCallPayload,
  participants: UnityCallParticipantRow[],
  authUserId: number,
  isCaller: boolean,
  participantStatus?: string | null,
) {
  const selfStatus = participants.find((p) => p.userId === authUserId)?.status ?? participantStatus ?? null
  const acceptedCallees = participants.filter((p) => p.role === "callee" && p.status === "accepted")
  const callEndedLocally = isUnityCallEndedLocally(call.id)
  const callIsActive = call.status === "ringing" || call.status === "accepted"
  const callLive =
    callIsActive && !callEndedLocally && (call.status === "accepted" || acceptedCallees.length > 0)
  const callConnected = callLive && (isCaller || selfStatus === "accepted")
  const mediaActive = !callEndedLocally && (isCaller ? callIsActive : callConnected)

  return { selfStatus, callLive, callConnected, mediaActive, acceptedCallees }
}
