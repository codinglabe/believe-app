/**
 * Placeholder image for VDO.Ninja `&avatar=` (tile when camera is off).
 * Must be a full URL; VDO loads it in the meeting UI.
 */
export function vdoUiAvatarUrl(displayName: string): string {
  const name = displayName.trim() || "Guest"
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=256&length=2`
}

/** VDO preset: name overlay on each video tile (see Ninja docs → &showlabels). */
export const VDO_SHOW_LABELS_STYLE = "zoom"

/**
 * One horizontal row for the auto grid — e.g. 2 participants = two tiles in one row.
 * See Ninja docs → &rows
 */
export const VDO_GROUP_ROWS_SINGLE = "1"

/** Guest label font size as % (Ninja docs → &fontsize). */
export const VDO_LABEL_FONT_PCT = "82"

/**
 * Meet-style grid labels + single row + showall.
 * `nocontrols` hides VDO’s **video** control bar (play / progress on tiles), not the main **user** bar (mic, hang up, etc.).
 * `clock=false` disables the optional wall-clock overlay (VDO &clock).
 */
export function applyVdoGroupRoomPresentation(url: URL): void {
  url.searchParams.set("showlabels", VDO_SHOW_LABELS_STYLE)
  url.searchParams.set("rows", VDO_GROUP_ROWS_SINGLE)
  url.searchParams.set("fontsize", VDO_LABEL_FONT_PCT)
  url.searchParams.set("nocontrols", "")
  url.searchParams.set("clock", "false")
  if (!url.searchParams.has("showall")) {
    url.searchParams.set("showall", "")
  }
}
