import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

const STORAGE_KEY = "app-sidebar-width-px"
export const DEFAULT_SIDEBAR_WIDTH = 280
const MIN_WIDTH = 220
const MAX_WIDTH = 520

type SidebarResizeContextValue = {
  sidebarWidthPx: number
  setSidebarWidthPx: (w: number) => void
  minWidth: number
  maxWidth: number
}

const SidebarResizeContext = createContext<SidebarResizeContextValue | null>(null)

export function SidebarResizeProvider({ children }: { children: ReactNode }) {
  const [sidebarWidthPx, setSidebarWidthPxState] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_SIDEBAR_WIDTH
    const raw = localStorage.getItem(STORAGE_KEY)
    const n = raw ? parseInt(raw, 10) : NaN
    if (!Number.isFinite(n)) return DEFAULT_SIDEBAR_WIDTH
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n))
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(sidebarWidthPx))
  }, [sidebarWidthPx])

  const setSidebarWidthPx = useCallback((w: number) => {
    setSidebarWidthPxState((prev) => {
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(w)))
      return next === prev ? prev : next
    })
  }, [])

  const value = useMemo(
    () => ({
      sidebarWidthPx,
      setSidebarWidthPx,
      minWidth: MIN_WIDTH,
      maxWidth: MAX_WIDTH,
    }),
    [sidebarWidthPx, setSidebarWidthPx]
  )

  return <SidebarResizeContext.Provider value={value}>{children}</SidebarResizeContext.Provider>
}

export function useSidebarResize(): SidebarResizeContextValue {
  const ctx = useContext(SidebarResizeContext)
  if (!ctx) {
    throw new Error("useSidebarResize must be used within SidebarResizeProvider")
  }
  return ctx
}
