import type { ConnectionHubListingLockType } from "@/lib/connection-hub-hero-hrefs"
import type { ConnectionHubType } from "@/lib/connection-hub-type"

export type EventTypeOption = {
  id: number
  name: string
  category: string
}

export function eventTypeCatalogForHub(
  hub: ConnectionHubType,
  companionEventTypes: EventTypeOption[],
  eventTypes: EventTypeOption[],
): EventTypeOption[] {
  return hub === "companion" ? companionEventTypes : eventTypes
}

export function defaultHubTypeForCreate(
  lockedHubListingType: ConnectionHubListingLockType | null | undefined,
  companionEventTypes: EventTypeOption[],
): ConnectionHubType {
  if (lockedHubListingType) return lockedHubListingType
  if (companionEventTypes.length > 0) return "companion"
  return "learning"
}

export function defaultEventTypeIdForHub(
  hub: ConnectionHubType,
  companionEventTypes: EventTypeOption[],
  eventTypes: EventTypeOption[],
): string {
  const catalog = eventTypeCatalogForHub(hub, companionEventTypes, eventTypes)
  const first = catalog[0]?.id
  return first != null ? String(first) : ""
}

export function eventTypeIdInCatalog(
  eventTypes: EventTypeOption[],
  eventTypeId: string,
): boolean {
  if (!eventTypeId) return false
  return eventTypes.some((t) => t.id.toString() === eventTypeId)
}

export function groupEventTypesByCategory(
  eventTypes: EventTypeOption[],
): Record<string, EventTypeOption[]> {
  return eventTypes.reduce(
    (acc, type) => {
      const category = type.category || "Other"
      if (!acc[category]) acc[category] = []
      acc[category].push(type)
      return acc
    },
    {} as Record<string, EventTypeOption[]>,
  )
}

export function eventTypeCategories(eventTypes: EventTypeOption[]): string[] {
  return Object.keys(groupEventTypesByCategory(eventTypes)).sort((a, b) =>
    a.localeCompare(b),
  )
}

export function categoryForEventTypeId(
  eventTypes: EventTypeOption[],
  eventTypeId: string,
): string | null {
  const found = eventTypes.find((t) => t.id.toString() === eventTypeId)
  return found ? found.category || "Other" : null
}

export function subTopicsForCategory(
  eventTypes: EventTypeOption[],
  category: string,
): EventTypeOption[] {
  return eventTypes.filter((t) => (t.category || "Other") === category)
}

export function defaultEventTypeIdForCategory(
  eventTypes: EventTypeOption[],
  category: string,
): string {
  return subTopicsForCategory(eventTypes, category)[0]?.id?.toString() ?? ""
}
