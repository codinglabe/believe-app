/**
 * Chat theme — aligned with Believe In Unity brand (see components/site-title.tsx).
 * Purple-600 → blue-600 gradient, purple/blue accents, shadcn semantic surfaces.
 */

/** Headline / title gradient (sidebar logo wordmark). */
export const chatGradientText =
  "bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-blue-400"

export const chatGradientBg = "bg-gradient-to-r from-purple-600 to-blue-600"

export const chatGradientBgHover = "hover:from-purple-500 hover:to-blue-500"

/** Subtle ambient background for message areas (light + dark). */
export const chatAmbientBg =
  "bg-gradient-to-b from-background via-purple-500/[0.03] to-blue-500/[0.04] dark:via-purple-500/[0.06] dark:to-blue-500/[0.07]"

/** Top accent bar for panels, sheets, and modals. */
export const chatGradientTopBar =
  "pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-purple-600 via-violet-500 to-blue-600"

/** Primary CTA — overrides shadcn default primary on buttons. */
export const chatPrimaryButtonClass =
  "!bg-gradient-to-r !from-purple-600 !to-blue-600 hover:!from-purple-500 hover:!to-blue-500 text-white shadow-md shadow-purple-500/20 border-transparent dark:shadow-none"

/** Bordered inset regions (scroll lists, pickers). */
export const chatInsetBorder =
  "rounded-xl border border-purple-500/15 bg-muted/20 dark:bg-muted/10"

/** Form controls — search field focus. */
export const chatInputFocusRing =
  "focus-visible:ring-2 focus-visible:ring-purple-500/25 focus-visible:border-purple-500/40 dark:focus-visible:ring-purple-400/20 dark:focus-visible:border-purple-400/35"

/** Tab / segmented control track (inactive surface). */
export const chatSegmentTrack =
  "rounded-xl border border-purple-500/15 bg-purple-500/5 dark:border-purple-500/20 dark:bg-muted/40 p-1"

/** Sent message bubble — brand gradient. */
export const chatSentBubble =
  "bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-sm shadow-purple-500/20 dark:shadow-purple-900/30"

/** Received message bubble — card surface with brand border tint. */
export const chatReceivedBubble =
  "bg-card text-foreground border border-purple-500/10 shadow-sm dark:border-purple-500/20 dark:bg-muted/70"

/** Chat wallpaper — soft purple/blue wash (mobile message area). */
export const chatWallpaperBg =
  "bg-gradient-to-b from-purple-50/50 via-background to-blue-50/40 dark:from-purple-950/25 dark:via-background dark:to-blue-950/20"

/** Composer / input bar surface. */
export const chatInputBarBg =
  "bg-purple-500/5 dark:bg-card/90"

/** Mobile list surfaces (search, tabs, input pill). */
export const chatMobileSurface =
  "bg-purple-500/5 border-purple-500/10 dark:bg-muted/40 dark:border-purple-500/15"

/** Primary accent text (typing, unread time, reply icon). */
export const chatAccentText = "text-purple-600 dark:text-purple-400"

/** Secondary accent (blue end of gradient). */
export const chatAccentTextStrong = "text-blue-600 dark:text-blue-400"

/** Unread count badge. */
export const chatUnreadBadge = "bg-gradient-to-r from-purple-600 to-blue-600 text-white"

/** Active send button (mobile pill composer). */
export const chatSendButtonActive =
  "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-sm shadow-purple-500/20 dark:shadow-none"

/** Reply quote left border. */
export const chatReplyBorder = "border-purple-500/40 dark:border-purple-400/35"

/** Conversation list row divider. */
export const chatListDivider = "border-b border-purple-500/10 dark:border-purple-500/15"

/** Mobile header / panel dividers. */
export const chatMobileDivider = "border-purple-500/10 dark:border-purple-500/15"
