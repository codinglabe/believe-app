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

export function isVersionMismatch(localVersion: string | null, serverVersion: string): boolean {
  if (!localVersion) {
    return false
  }

  return localVersion !== serverVersion
}

export function serviceWorkerScriptUrl(version: string): string {
  return `/firebase-messaging-sw.js?v=${encodeURIComponent(version)}`
}

export async function checkServiceWorkerUpdate(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    await registration.update()
    return registration
  } catch {
    return null
  }
}

export function registrationHasWaitingWorker(registration: ServiceWorkerRegistration | null): boolean {
  return Boolean(registration?.waiting)
}

export function watchServiceWorkerInstall(
  registration: ServiceWorkerRegistration,
  onWaiting: (registration: ServiceWorkerRegistration) => void,
): () => void {
  const handleStateChange = (worker: ServiceWorker) => {
    if (worker.state === "installed" && navigator.serviceWorker.controller) {
      onWaiting(registration)
    }
  }

  if (registration.waiting) {
    onWaiting(registration)
    return () => undefined
  }

  const installing = registration.installing
  if (installing) {
    installing.addEventListener("statechange", () => handleStateChange(installing))
  }

  const onUpdateFound = () => {
    const worker = registration.installing || registration.waiting
    if (worker) {
      worker.addEventListener("statechange", () => handleStateChange(worker))
    }
  }

  registration.addEventListener("updatefound", onUpdateFound)

  return () => {
    registration.removeEventListener("updatefound", onUpdateFound)
  }
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

    window.setTimeout(finish, 1500)
  })
}

export function reloadForPwaUpdate(): void {
  const url = new URL(window.location.href)
  url.searchParams.set("_", Date.now().toString())
  window.location.replace(url.toString())
}

export function initStoredAppVersion(): void {
  storeAppVersion(getClientAppVersion())
}

export type PwaUpdateCheckResult = {
  serverVersion: string | null
  updateAvailable: boolean
  registration: ServiceWorkerRegistration | null
}

export async function runPwaUpdateCheck(): Promise<PwaUpdateCheckResult> {
  const server = await fetchServerAppVersion()
  const stored = getStoredAppVersion()
  const client = getClientAppVersion()
  const registration = await checkServiceWorkerUpdate()

  const serverVersion = server?.version ?? null
  const versionChanged =
    (serverVersion !== null && isVersionMismatch(stored, serverVersion)) ||
    (serverVersion !== null && isVersionMismatch(client, serverVersion))

  const swWaiting = registrationHasWaitingWorker(registration)

  return {
    serverVersion,
    updateAvailable: versionChanged || swWaiting,
    registration,
  }
}

export function startPwaUpdateListeners(onUpdate: () => void): () => void {
  const run = () => {
    if (!isStandalonePwa()) {
      return
    }

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

  const onFocus = () => run()
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) {
      run()
    }
  }

  document.addEventListener("visibilitychange", onVisible)
  window.addEventListener("focus", onFocus)
  window.addEventListener("pageshow", onPageShow)

  return () => {
    document.removeEventListener("visibilitychange", onVisible)
    window.removeEventListener("focus", onFocus)
    window.removeEventListener("pageshow", onPageShow)
  }
}
