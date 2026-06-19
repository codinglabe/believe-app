import type { UnityCallParticipantRow } from "@/hooks/useUnityCallNotifications"

const PARTICIPANT_STATUS_RANK: Record<string, number> = {
  accepted: 50,
  ringing: 40,
  left: 30,
  declined: 20,
  missed: 10,
}

function pickParticipantStatus(current?: string, incoming?: string): string {
  const left = current ?? ""
  const right = incoming ?? ""
  if (!left) {
    return right
  }
  if (!right) {
    return left
  }
  return (PARTICIPANT_STATUS_RANK[left] ?? 0) >= (PARTICIPANT_STATUS_RANK[right] ?? 0) ? left : right
}

export function participantsSnapshotEqual(
  left: UnityCallParticipantRow[],
  right: UnityCallParticipantRow[],
): boolean {
  if (left.length !== right.length) {
    return false
  }

  return left.every((row) => {
    const other = right.find((candidate) => candidate.userId === row.userId)
    if (!other) {
      return false
    }

    return (
      row.status === other.status &&
      row.role === other.role &&
      row.incomingDelivered === other.incomingDelivered
    )
  })
}

export function mergeCallParticipants(
  previous: UnityCallParticipantRow[],
  incoming: UnityCallParticipantRow[],
): UnityCallParticipantRow[] {
  const map = new Map(previous.map((row) => [row.userId, row]))
  for (const row of incoming) {
    const prev = map.get(row.userId)
    const merged = { ...(prev ?? row), ...row }
    merged.status = pickParticipantStatus(prev?.status, row.status)
    if (prev?.incomingDelivered || row.incomingDelivered) {
      merged.incomingDelivered = true
    }
    map.set(row.userId, merged)
  }
  return Array.from(map.values())
}
