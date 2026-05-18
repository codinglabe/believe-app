/** Per-session length (minutes), 30–120 in 15-minute steps — matches `App\Support\SessionDurationMinutes::VALUES`. */
export const SESSION_DURATION_MINUTES_OPTIONS = [30, 45, 60, 75, 90, 105, 120] as const

export type SessionDurationMinutes = (typeof SESSION_DURATION_MINUTES_OPTIONS)[number]

export function sessionDurationLabel(minutes: number): string {
  return `${minutes} minutes`
}
