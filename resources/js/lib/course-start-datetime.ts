/**
 * Format listing start_date / start_time from Laravel (date cast + time string).
 * Uses local calendar components so ISO date strings from JSON don’t shift by timezone.
 */

export function parseCourseDateParts(raw: unknown): { y: number; mo: number; d: number } | null {
  if (raw == null || raw === "") return null
  const s = String(raw).trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!Number.isFinite(y) || mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return { y, mo, d }
}

export function parseCourseTimeParts(raw: unknown): { h: number; mi: number; s: number } | null {
  if (raw == null || raw === "") return null
  const s = String(raw).trim()
  const match = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (!match) return null
  const h = Number(match[1])
  const mi = Number(match[2])
  const sec = match[3] !== undefined ? Number(match[3]) : 0
  if (!Number.isFinite(h) || !Number.isFinite(mi) || h > 23 || mi > 59 || sec > 59) return null
  return { h, mi, s: sec }
}

/**
 * Date and time only (locale numeric date + time). No weekday or extra words.
 * Date-only when `start_time` is missing.
 */
export function formatCourseStartDisplay(
  course: { start_date: string; start_time?: string | null },
  locale?: string,
): string {
  const dp = parseCourseDateParts(course.start_date)
  if (!dp) return ""

  const tp = parseCourseTimeParts(course.start_time)
  const loc = locale ?? (typeof navigator !== "undefined" ? navigator.language : "en-US")

  if (!tp) {
    const d = new Date(dp.y, dp.mo - 1, dp.d)
    return new Intl.DateTimeFormat(loc, {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    }).format(d)
  }

  const d = new Date(dp.y, dp.mo - 1, dp.d, tp.h, tp.mi, tp.s)
  return new Intl.DateTimeFormat(loc, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d)
}

/** Compact badge like "MAY 3" for cards. */
export function formatCourseMonthDayBadge(start_date: string, locale = "en-US"): string {
  const dp = parseCourseDateParts(start_date)
  if (!dp) return ""
  const d = new Date(dp.y, dp.mo - 1, dp.d)
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(d).toUpperCase()
}
