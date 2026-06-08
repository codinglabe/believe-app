export type EventTypeOption = {
  id: number
  name: string
  category: string
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
