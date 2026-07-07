export const CONNECTION_HUB_TYPES = ["companion", "learning", "events", "earning"] as const

export type ConnectionHubType = (typeof CONNECTION_HUB_TYPES)[number]

const LABELS: Record<ConnectionHubType, string> = {
  companion: "Companion",
  learning: "Learning",
  events: "Meetups",
  earning: "Earning",
}

export function connectionHubTypeLabel(type: string): string {
  return LABELS[type as ConnectionHubType] ?? type
}

/** Registration-style copy for meetups (Connection Hub type `events`). */
export function isEventsHubType(type: string): boolean {
  return type === "events"
}

/** Suggested default for new listings; persisted value is {@code Course.allow_enrollment_after_start}. */
export function defaultAllowEnrollmentAfterStart(type: string): boolean {
  return type === "companion" || type === "events"
}

/** @deprecated Use course.allow_enrollment_after_start when a listing is loaded. */
export function allowsOpenEnrollmentAfterStart(type: string): boolean {
  return defaultAllowEnrollmentAfterStart(type)
}

export function isEnrollmentStyleHubType(type: string): boolean {
  return !isEventsHubType(type)
}
