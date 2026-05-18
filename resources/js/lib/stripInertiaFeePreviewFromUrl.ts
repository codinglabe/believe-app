/**
 * Inertia `router.get` adds fee preview params to the query string. Strip them
 * from the address bar after the visit; props are already updated.
 */
export function stripInertiaFeePreviewFromUrl(): void {
  if (typeof window === 'undefined') return
  const u = new URL(window.location.href)
  let changed = false
  for (const k of [...u.searchParams.keys()]) {
    if (k.startsWith('fee_preview_')) {
      u.searchParams.delete(k)
      changed = true
    }
  }
  if (!changed) return
  const q = u.searchParams.toString()
  window.history.replaceState({}, '', u.pathname + (q ? '?' + q : '') + u.hash)
}
