"use client"

import { useCallback, useRef } from "react"

export function useStableCallback<T extends (...args: any[]) => void>(callback: T): T {
  const callbackRef = useRef(callback)

  callbackRef.current = callback

  return useCallback(((...args: Parameters<T>) => {
    callbackRef.current(...args)
  }) as T, [])
}
