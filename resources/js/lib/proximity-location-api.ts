import { getCsrfHeaders } from "@/lib/csrf"

export function postProximityLocation(latitude: number, longitude: number): void {
  void fetch("/api/user/proximity-location", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...getCsrfHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({ latitude, longitude }),
  }).then(async (response) => {
    if (response.ok) {
      return
    }

    if (response.status === 403) {
      const data = (await response.json().catch(() => null)) as {
        requires_bridge_verification?: boolean
      } | null
      if (data?.requires_bridge_verification) {
        return
      }
    }

    console.warn("[ProximityLocation] Failed to report location:", response.status)
  }).catch((err) => {
    console.warn("[ProximityLocation] Failed to report location:", err)
  })
}
