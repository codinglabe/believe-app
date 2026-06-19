import type { UnityCallParticipantRow } from "@/hooks/useUnityCallNotifications"

export function mergeCallParticipants(
  previous: UnityCallParticipantRow[],
  incoming: UnityCallParticipantRow[],
): UnityCallParticipantRow[] {
  const map = new Map(previous.map((row) => [row.userId, row]))
  for (const row of incoming) {
    const prev = map.get(row.userId)
    const merged = { ...(prev ?? row), ...row }
    if (prev?.incomingDelivered || row.incomingDelivered) {
      merged.incomingDelivered = true
    }
    map.set(row.userId, merged)
  }
  return Array.from(map.values())
}
