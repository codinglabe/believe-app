import type { UnityCallParticipantRow } from "@/hooks/useUnityCallNotifications"

export function mergeCallParticipants(
  previous: UnityCallParticipantRow[],
  incoming: UnityCallParticipantRow[],
): UnityCallParticipantRow[] {
  const map = new Map(previous.map((row) => [row.userId, row]))
  for (const row of incoming) {
    map.set(row.userId, { ...(map.get(row.userId) ?? row), ...row })
  }
  return Array.from(map.values())
}
