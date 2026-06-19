import type { UnityCallParticipantRow, UnityCallPayload } from "@/hooks/useUnityCallNotifications"
import { isUnityCallEndedLocally } from "@/lib/unityCall"

export function normalizeCallParticipants(
  call: UnityCallPayload,
  participants: UnityCallParticipantRow[],
): UnityCallParticipantRow[] {
  if (call.status !== "accepted" || !participants.some((participant) => participant.role === "callee")) {
    return participants
  }

  return participants.map((participant) =>
    participant.role === "callee" &&
    (participant.status === "ringing" || participant.status === "missed")
      ? { ...participant, status: "accepted" as const }
      : participant,
  )
}

export function computeUnityCallMediaState(
  call: UnityCallPayload,
  participants: UnityCallParticipantRow[],
  authUserId: number,
  isCaller: boolean,
  participantStatus?: string | null,
) {
  const normalizedParticipants = normalizeCallParticipants(call, participants)
    normalizedParticipants.find((p) => p.userId === authUserId)?.status ?? participantStatus ?? null
  const acceptedCallees = normalizedParticipants.filter(
    (p) => p.role === "callee" && p.status === "accepted",
  )
  const callEndedLocally = isUnityCallEndedLocally(call.id)
  const callIsActive = call.status === "ringing" || call.status === "accepted"
  const callLive =
    callIsActive && !callEndedLocally && (call.status === "accepted" || acceptedCallees.length > 0)
  const callConnected = callLive && (isCaller || selfStatus === "accepted")
  const mediaActive = !callEndedLocally && (isCaller ? callIsActive : callConnected)
  const canBackgroundCall = callIsActive && !callEndedLocally

  return { selfStatus, callLive, callConnected, mediaActive, acceptedCallees, canBackgroundCall }
}
