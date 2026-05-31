const PWA_VERSION_STORAGE_KEY = "biu_pwa_version"
const VERSION_ENDPOINT = "/pwa/version.json"

type NavigatorExtended = Navigator & {
  standalone?: boolean
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") {
    return false
  }

  const mediaQuery = window.matchMedia("(display-mode: standalone)")
  const navigatorStandalone = (window.navigator as NavigatorExtended).standalone

  return mediaQuery.matches || Boolean(navigatorStandalone)
}

export type PwaVersionPayload = {
  version: string
  builtAt?: string | null
}

export function getClientAppVersion(): string {
  if (typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="app-version"]')?.getAttribute("content")
    if (meta) {
      return meta
    }
  }

  return import.meta.env.VITE_APP_VERSION || "dev"
}

export function getStoredAppVersion(): string | null {
  if (typeof window === "undefined") {
    return null
  }

  return localStorage.getItem(PWA_VERSION_STORAGE_KEY)
}

export function storeAppVersion(version: string): void {
  if (typeof window === "undefined") {
    return
  }

  localStorage.setItem(PWA_VERSION_STORAGE_KEY, version)
}

export async function fetchServerAppVersion(): Promise<PwaVersionPayload | null> {
  try {
    const response = await fetch(`${VERSION_ENDPOINT}?_=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    })

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as PwaVersionPayload
    if (!data?.version) {
      return null
    }

    return data
  } catch {
    return null
  }
}

/** Fixed SW URL — version bumps live inside the SW file (CACHE_NAME), not the register URL. */
export function serviceWorkerScriptUrl(_version?: string): string {
  return "/firebase-messaging-sw.js"
}

export async function checkServiceWorkerUpdate(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration("/")
    if (!registration) {
      return null
    }
    await registration.update()
    return registration
  } catch {
    return null
  }
}

export function registrationHasWaitingWorker(registration: ServiceWorkerRegistration | null): boolean {
  return Boolean(registration?.waiting)
}

export async function activateWaitingServiceWorker(
  registration: ServiceWorkerRegistration,
): Promise<void> {
  const waiting = registration.waiting
  if (!waiting) {
    return
  }

  await new Promise<void>((resolve) => {
    let settled = false

    const finish = () => {
      if (settled) {
        return
      }
      settled = true
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
      resolve()
    }

    const onControllerChange = () => {
      finish()
    }

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)
    waiting.postMessage({ type: "SKIP_WAITING" })

    window.setTimeout(finish, 8000)
  })
}

export function reloadForPwaUpdate(): void {
  const url = new URL(window.location.href)
  url.searchParams.set("_", Date.now().toString())
  window.location.replace(url.toString())
}

export function initStoredAppVersion(): void {
  const stored = getStoredAppVersion()
  if (!stored) {
    storeAppVersion(getClientAppVersion())
  }
}

export function markPwaUpdateComplete(version?: string | null): void {
  const resolved = version || getClientAppVersion()
  storeAppVersion(resolved)
}

export type PwaUpdateCheckResult = {
  serverVersion: string | null
  updateAvailable: boolean
  registration: ServiceWorkerRegistration | null
}

/**
 * A deploy is "pending" only when the user has not acknowledged the current server version.
 * Waiting service workers alone do NOT count — that caused the reload popup loop.
 */
export function isDeployPending(stored: string | null, serverVersion: string | null): boolean {
  if (!serverVersion) {
    return false
  }

  if (!stored) {
    return false
  }

  return stored !== serverVersion
}

export async function runPwaUpdateCheck(): Promise<PwaUpdateCheckResult> {
  if (import.meta.env.DEV) {
    return { serverVersion: null, updateAvailable: false, registration: null }
  }

  const server = await fetchServerAppVersion()
  const stored = getStoredAppVersion()
  const registration = await checkServiceWorkerUpdate()

  const serverVersion = server?.version ?? null
  const updateAvailable = isDeployPending(stored, serverVersion)

  return {
    serverVersion,
    updateAvailable,
    registration,
  }
}

/**
 * User already acknowledged this deploy — activate any waiting worker silently (no popup).
 */
export async function silentlyActivateIfAcknowledged(): Promise<void> {
  if (import.meta.env.DEV || typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return
  }

  const server = await fetchServerAppVersion()
  const stored = getStoredAppVersion()
  if (!server?.version || !stored || stored !== server.version) {
    return
  }

  const registration = await navigator.serviceWorker.getRegistration("/")
  if (!registration?.waiting) {
    return
  }

  await activateWaitingServiceWorker(registration)
}

export function startPwaUpdateListeners(onUpdate: () => void): () => void {
  const run = () => {
    void runPwaUpdateCheck().then((result) => {
      if (result.updateAvailable) {
        onUpdate()
      }
    })
  }

  run()

  const onVisible = () => {
    if (document.visibilityState === "visible") {
      run()
    }
  }

  document.addEventListener("visibilitychange", onVisible)

  return () => {
    document.removeEventListener("visibilitychange", onVisible)
  }
}
