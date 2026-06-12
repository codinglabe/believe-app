import { echo, echoIsConfigured } from "@laravel/echo-react"
import { getCsrfToken } from "./csrf"

const LOOPBACK_HOSTS = ["127.0.0.1", "0.0.0.0", "localhost"] as const

export const isLoopbackHost = (host?: string) =>
  Boolean(host && (LOOPBACK_HOSTS as readonly string[]).includes(host))

export const resolveReverbHost = () => {
  const configured = import.meta.env.VITE_REVERB_HOST as string | undefined
  const runtime = typeof window !== "undefined" ? window.location.hostname : "127.0.0.1"

  if (isLoopbackHost(configured) && !isLoopbackHost(runtime)) {
    return runtime
  }

  return configured || runtime
}

export const resolveReverbScheme = () => {
  const configured = import.meta.env.VITE_REVERB_SCHEME as string | undefined
  if (configured === "http" || configured === "https") {
    return configured
  }

  if (typeof window !== "undefined" && isLoopbackHost(window.location.hostname)) {
    return "http"
  }

  return "https"
}

export const resolveReverbPort = (scheme: string) => {
  const parsed = Number(import.meta.env.VITE_REVERB_PORT)
  const runtimeHost = typeof window !== "undefined" ? window.location.hostname : ""
  const wsHost = resolveReverbHost()

  // ForgeStack / nginx: HTTPS site on 443, Reverb on 127.0.0.1:8080 behind /app proxy.
  if (
    scheme === "https" &&
    typeof window !== "undefined" &&
    runtimeHost === wsHost &&
    window.location.protocol === "https:" &&
    (!Number.isFinite(parsed) || parsed === 8080)
  ) {
    const pagePort = Number(window.location.port)
    return Number.isFinite(pagePort) && pagePort > 0 ? pagePort : 443
  }

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }

  return scheme === "https" ? 443 : 8080
}

export const buildReverbEchoConfig = () => {
  const scheme = resolveReverbScheme()
  const port = resolveReverbPort(scheme)

  return {
    broadcaster: "reverb" as const,
    key: import.meta.env.VITE_REVERB_APP_KEY as string,
    wsHost: resolveReverbHost(),
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === "https",
    enabledTransports: scheme === "https" ? (["ws", "wss"] as const) : (["ws"] as const),
    disableStats: true,
    authEndpoint: "/broadcasting/auth",
    auth: {
      headers: {
        Accept: "application/json",
        "X-CSRF-TOKEN": getCsrfToken(),
        "X-Requested-With": "XMLHttpRequest",
      },
    },
  }
}

export const syncEchoCsrfToken = (token: string) => {
  if (!token || typeof window === "undefined" || !echoIsConfigured()) return

  const connector = echo().connector as { pusher?: { config?: { auth?: { headers?: Record<string, string> } } } }
  if (connector.pusher?.config?.auth?.headers) {
    connector.pusher.config.auth.headers["X-CSRF-TOKEN"] = token
  }
}

export const refreshEchoAuthHeaders = () => {
  if (typeof window === "undefined" || !echoIsConfigured()) return

  const token = getCsrfToken()
  if (!token) return

  syncEchoCsrfToken(token)
}
