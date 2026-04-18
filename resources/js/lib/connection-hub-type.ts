export const CONNECTION_HUB_TYPES = ["companion", "learning", "events", "earning"] as const

export type ConnectionHubType = (typeof CONNECTION_HUB_TYPES)[number]

const LABELS: Record<ConnectionHubType, string> = {
  companion: "Companion",
  learning: "Learning",
  events: "Events",
  earning: "Earning",
}

export function connectionHubTypeLabel(type: string): string {
  return LABELS[type as ConnectionHubType] ?? type
}

/** Registration-style copy (formerly "event"). */
export function isEventsHubType(type: string): boolean {
  return type === "events"
}

export function isEnrollmentStyleHubType(type: string): boolean {
  return !isEventsHubType(type)
}
