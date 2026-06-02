export function postProximityLocation(latitude: number, longitude: number): void {
  const csrf =
    typeof document !== "undefined"
      ? document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")
      : null

  void fetch("/api/user/proximity-location", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrf ? { "X-CSRF-TOKEN": csrf } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ latitude, longitude }),
  }).catch((err) => {
    console.warn("[ProximityLocation] Failed to report location:", err)
  })
}
