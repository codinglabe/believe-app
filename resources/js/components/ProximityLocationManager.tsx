"use client"

import { usePage } from "@inertiajs/react"
import { isProximityEnabledForUser, useProximityLocation } from "@/hooks/use-proximity-location"

type AuthProps = {
  auth?: {
    user?: {
      id?: number
      proximity_notifications_enabled?: boolean
    } | null
  }
}

/** Requests location on visit for signed-in users unless they turned off nearby alerts. */
export function ProximityLocationManager() {
  const { auth } = usePage<AuthProps>().props
  const enabled = isProximityEnabledForUser(auth?.user ?? null)

  useProximityLocation({ enabled })

  return null
}
