/** 1 AI Media Studio credit = US$1.00; balance and per-video charges can be fractional. */

export function roundMediaCredits(n: number): number {
  return Math.round(n * 100) / 100
}

export function formatMediaStudioCredits(n: number): string {
  const x = roundMediaCredits(n)
  if (Number.isNaN(x)) {
    return "0"
  }
  return x % 1 === 0 ? String(x) : x.toFixed(2)
}

export function retailCreditsFor(
  matrix: Record<string, Record<string, number>>,
  tier: string,
  durationSeconds: number,
): number {
  const inner = matrix[tier]
  if (!inner) {
    return 0
  }
  const key = String(durationSeconds)
  const v = inner[key] ?? inner["5"] ?? inner["10"]
  return typeof v === "number" && !Number.isNaN(v) ? roundMediaCredits(v) : 0
}
