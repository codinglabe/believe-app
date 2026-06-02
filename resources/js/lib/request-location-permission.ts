export type LocationPermissionResult =
  | { status: "granted"; latitude: number; longitude: number }
  | { status: "denied"; message: string }
  | { status: "unsupported"; message: string }
  | { status: "unavailable"; message: string }

export async function queryGeolocationPermissionState(): Promise<PermissionState | "unsupported"> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unsupported"
  }

  try {
    const result = await navigator.permissions.query({ name: "geolocation" })
    return result.state
  } catch {
    return "unsupported"
  }
}

/**
 * Triggers the browser location permission prompt (when still "prompt") via getCurrentPosition.
 */
export function requestLocationPermission(): Promise<LocationPermissionResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({
        status: "unsupported",
        message: "Location is not supported on this device or browser.",
      })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          status: "granted",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve({
            status: "denied",
            message: "Location access was denied. Allow location in your browser settings to use nearby alerts.",
          })
          return
        }

        resolve({
          status: "unavailable",
          message:
            error.code === error.TIMEOUT
              ? "Could not detect your location. Try again outdoors or check that location services are on."
              : "Location is temporarily unavailable. Please try again.",
        })
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20_000,
      },
    )
  })
}
