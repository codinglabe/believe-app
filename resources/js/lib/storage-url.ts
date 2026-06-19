/**
 * Normalize Laravel public-disk paths and Storage::url() values for use in img/Avatar src.
 */
export function resolveStorageUrl(
  path: string | null | undefined,
  fallback?: string | null,
): string | undefined {
  if (path == null || typeof path !== "string") {
    return fallback ?? undefined
  }

  const trimmed = path.trim()
  if (trimmed === "") {
    return fallback ?? undefined
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed
  }

  if (trimmed.startsWith("/storage/") || trimmed.startsWith("/")) {
    return trimmed
  }

  return `/storage/${trimmed.replace(/^\/+/, "")}`
}
