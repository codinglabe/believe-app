import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "believe-password-reset-cooldown"

type CooldownRecord = {
  email: string
  until: number
}

function readRecord(): CooldownRecord | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (! raw) {
      return null
    }

    const parsed = JSON.parse(raw) as CooldownRecord
    if (! parsed?.email || ! parsed?.until) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeRecord(record: CooldownRecord | null) {
  if (typeof window === "undefined") {
    return
  }

  if (! record) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
}

export function formatPasswordResetCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

function initialSecondsLeft(cooldownUntil?: number | null): number {
  if (cooldownUntil && cooldownUntil > Math.floor(Date.now() / 1000)) {
    return cooldownUntil - Math.floor(Date.now() / 1000)
  }

  const record = readRecord()
  if (! record) {
    return 0
  }

  return Math.max(0, record.until - Math.floor(Date.now() / 1000))
}

export function usePasswordResetCooldown(
  email: string,
  cooldownUntil?: number | null,
  throttleSeconds = 60,
) {
  const [secondsLeft, setSecondsLeft] = useState(() => initialSecondsLeft(cooldownUntil))
  const [storedEmail, setStoredEmail] = useState<string | null>(() => readRecord()?.email ?? null)

  const persistCooldown = useCallback(
    (targetEmail: string, until?: number | null) => {
      const normalizedEmail = targetEmail.trim().toLowerCase()
      if (! normalizedEmail) {
        return
      }

      const untilTs =
        until && until > Math.floor(Date.now() / 1000)
          ? until
          : Math.floor(Date.now() / 1000) + throttleSeconds

      writeRecord({ email: normalizedEmail, until: untilTs })
      setStoredEmail(normalizedEmail)
      setSecondsLeft(Math.max(0, untilTs - Math.floor(Date.now() / 1000)))
    },
    [throttleSeconds],
  )

  useEffect(() => {
    const record = readRecord()
    if (! record) {
      return
    }

    const left = Math.max(0, record.until - Math.floor(Date.now() / 1000))
    if (left > 0) {
      setStoredEmail(record.email)
      setSecondsLeft(left)
      return
    }

    writeRecord(null)
  }, [])

  useEffect(() => {
    if (cooldownUntil && (email.trim() || storedEmail)) {
      persistCooldown(email.trim() || storedEmail || email, cooldownUntil)
    }
  }, [cooldownUntil, email, persistCooldown, storedEmail])

  const activeEmail = email.trim().toLowerCase() || storedEmail || ""

  useEffect(() => {
    const tick = () => {
      const record = readRecord()

      if (! record || record.email !== activeEmail) {
        if (! record) {
          setSecondsLeft(0)
        }
        return
      }

      const left = Math.max(0, record.until - Math.floor(Date.now() / 1000))
      setSecondsLeft(left)

      if (left === 0) {
        writeRecord(null)
        setStoredEmail(null)
      }
    }

    tick()
    const intervalId = window.setInterval(tick, 1000)

    return () => window.clearInterval(intervalId)
  }, [activeEmail])

  const isCoolingDown = secondsLeft > 0

  return {
    secondsLeft,
    isCoolingDown,
    countdownLabel: formatPasswordResetCountdown(secondsLeft),
    persistCooldown,
    cooldownEmail: storedEmail,
  }
}
