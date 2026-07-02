import { usePage } from "@inertiajs/react"

export function resolveAppEnv(pageProps?: { appEnv?: string }): string {
  if (pageProps?.appEnv) {
    return pageProps.appEnv
  }

  if (typeof window !== "undefined") {
    const inertia = (window as Window & { __INERTIA__?: { page?: { props?: { appEnv?: string } } } }).__INERTIA__
    const env = inertia?.page?.props?.appEnv
    if (typeof env === "string" && env.length > 0) {
      return env
    }
  }

  return "production"
}

export function isProductionAppEnv(pageProps?: { appEnv?: string }): boolean {
  return resolveAppEnv(pageProps) === "production"
}

/** Outbound Unity Call start button — off on production; elsewhere controlled by UNITY_CALL_ENABLED (default: on). */
export function isUnityCallStartUiEnabled(pageProps?: {
  appEnv?: string
  unityCallEnabled?: boolean
}): boolean {
  if (isProductionAppEnv(pageProps)) {
    return false
  }

  if (typeof pageProps?.unityCallEnabled === "boolean") {
    return pageProps.unityCallEnabled
  }

  return true
}

export function useAppEnv(): string {
  const { appEnv } = usePage<{ appEnv?: string }>().props
  return resolveAppEnv({ appEnv })
}

export function useUnityCallStartUiEnabled(): boolean {
  const { appEnv, unityCallEnabled } = usePage<{ appEnv?: string; unityCallEnabled?: boolean }>().props
  return isUnityCallStartUiEnabled({ appEnv, unityCallEnabled })
}
