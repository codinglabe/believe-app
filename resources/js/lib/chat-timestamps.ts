/**
 * Chat timestamps are stored in UTC and serialized as ISO-8601 with an offset.
 * MySQL-style strings without a timezone must be treated as UTC (not browser local).
 */

/** True when the string already includes Z or a numeric UTC offset. */
function hasTimezoneOffset(value: string): boolean {
  return /[Zz]$|[+-]\d{2}:\d{2}$/.test(value.trim())
}

/**
 * Parse a chat timestamp for sorting and display in the viewer's local timezone.
 */
export function parseChatTimestamp(value: string | null | undefined): Date {
  if (!value) {
    return new Date(Number.NaN)
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return new Date(Number.NaN)
  }

  if (hasTimezoneOffset(trimmed)) {
    return new Date(trimmed)
  }

  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T")
  return new Date(`${normalized}Z`)
}

export function chatTimestampMs(value: string | null | undefined): number {
  const ms = parseChatTimestamp(value).getTime()
  return Number.isNaN(ms) ? 0 : ms
}

/** Local wall-clock time for a message bubble (24h). */
export function formatChatTime(value: string | null | undefined): string {
  const date = parseChatTimestamp(value)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)
}
