import { useCallback, useEffect, useState } from "react"

export type EmailCreditsStats = {
  emails_included: number
  emails_used: number
  emails_left: number
}

function normalizeCredits(stats: EmailCreditsStats | null | undefined): EmailCreditsStats | null {
  if (!stats) {
    return null
  }

  const included = Math.max(0, stats.emails_included)
  const used = Math.max(0, stats.emails_used)
  const left = Math.max(0, stats.emails_left ?? included - used)

  return {
    emails_included: included,
    emails_used: used,
    emails_left: left,
  }
}

/**
 * Live email credit balance for Unity Meet invites — updates instantly on send
 * (optimistic) and stays in sync when Inertia props refresh (e.g. after purchase).
 */
export function useEmailCreditsState(initial: EmailCreditsStats | null | undefined) {
  const [credits, setCredits] = useState<EmailCreditsStats | null>(() => normalizeCredits(initial))

  useEffect(() => {
    setCredits(normalizeCredits(initial))
  }, [initial?.emails_included, initial?.emails_used, initial?.emails_left])

  const applyDelta = useCallback((usedDelta: number) => {
    setCredits((prev) => {
      if (!prev || usedDelta === 0) {
        return prev
      }

      const emails_used = Math.max(0, prev.emails_used + usedDelta)
      const emails_left = Math.max(0, prev.emails_included - emails_used)

      return { ...prev, emails_used, emails_left }
    })
  }, [])

  const syncFromServer = useCallback((stats: EmailCreditsStats | null | undefined) => {
    setCredits(normalizeCredits(stats))
  }, [])

  const emailsLeft = credits?.emails_left ?? 0
  const canSend = emailsLeft > 0

  return { credits, emailsLeft, canSend, syncFromServer, applyDelta }
}
