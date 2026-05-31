function getCsrfToken(): string {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? ""
}

export async function postMeetingPresenceJson(
  url: string,
  body: Record<string, unknown>,
): Promise<boolean> {
  const token = getCsrfToken()
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": token,
        "X-Requested-With": "XMLHttpRequest",
      },
      credentials: "same-origin",
      body: JSON.stringify(body),
    })
    return res.ok
  } catch {
    return false
  }
}

export function beaconMeetingPresenceLeave(roomName: string, sessionId: string): void {
  const token = getCsrfToken()
  const body = new FormData()
  body.append("_token", token)
  body.append("sessionId", sessionId)

  const url = route("livestreams.presence.leave", roomName)
  if (typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(url, body)
    return
  }

  void fetch(url, {
    method: "POST",
    headers: {
      "X-CSRF-TOKEN": token,
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json",
    },
    credentials: "same-origin",
    keepalive: true,
    body,
  })
}
