/** Must stay in sync with `config/challenge_hub.php` admin_entry_cover_* (kilobytes). Laravel `max:N` = N KB. */
export const CHALLENGE_HUB_COVER_MAX_KB = 5120

export const CHALLENGE_HUB_COVER_MAX_BYTES = CHALLENGE_HUB_COVER_MAX_KB * 1024

export function validateChallengeHubCoverFile(file: File | null, maxBytes: number): string | null {
  if (!file) return null
  if (!file.type.startsWith("image/")) {
    return "Please choose an image file (JPEG, PNG, or WebP)."
  }
  if (file.size > maxBytes) {
    const mb = (file.size / (1024 * 1024)).toFixed(2)
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(1)
    return `Image is too large (${mb}MB). Maximum is ${maxMb}MB.`
  }
  return null
}
