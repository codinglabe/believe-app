export type UnityLiveOverlay = {
  accentColor: string
  logoUrl: string | null
  speakerName: string
  bannerMessage: string
  bannerCta: string
  donationMessage: string
  donationCta: string
  sponsorImageUrl: string | null
  sponsorLabel: string
  scrollingMessage: string
  qrCodeUrl: string | null
  qrLabel: string
  showLiveBadge: boolean
}

export type UnityLiveVideoOverlay = {
  accentColor: string
  logoUrl: string | null
  speakerName: string
  bannerMessage: string
  bannerCta: string
  sponsorImageUrl: string | null
  sponsorLabel: string
}

export type OverlayStudioPayload = {
  enabled: boolean
  accentColor: string
  logoUrl: string | null
  logoFromProfile: boolean
  speakerName: string
  bannerMessage: string
  bannerCta: string
  donationMessage: string
  donationCta: string
  sponsorImageUrl: string | null
  sponsorLabel: string
  scrollingMessage: string
  qrCodeUrl: string | null
  qrLabel: string
  showLiveBadge: boolean
}

export type OverlayCtaPreset = {
  id: string
  label: string
  bannerMessage: string
  bannerCta: string
  donationMessage?: string
  donationCta?: string
  scrollingMessage?: string
}

export const OVERLAY_CTA_PRESETS: OverlayCtaPreset[] = [
  {
    id: "donate-families",
    label: "Donations · Feed Families",
    bannerMessage: "Help Us Feed 100 Families",
    bannerCta: "Donate Today",
    donationMessage: "Support Our Mission",
    donationCta: "Give Now",
  },
  {
    id: "donate-mission",
    label: "Donations · Support Mission",
    bannerMessage: "Support Our Mission",
    bannerCta: "Donate Today",
    donationMessage: "Every gift makes a difference",
    donationCta: "Give Now",
  },
  {
    id: "join-community",
    label: "Community · Join Us",
    bannerMessage: "Built by a nonprofit for nonprofits",
    bannerCta: "Join Believe In Unity",
    scrollingMessage: "Join Our Community · Volunteer Today · Become a Supporter",
  },
  {
    id: "sunday-service",
    label: "Church · Sunday Service",
    bannerMessage: "Join Sunday Service",
    bannerCta: "Register Now",
    donationMessage: "Prayer Available",
    donationCta: "Text PRAYER to 55555",
    scrollingMessage: "Join Sunday Service · Scan the QR Code · Volunteer Today",
  },
  {
    id: "live-event",
    label: "Events · Join Live",
    bannerMessage: "You're watching live — don't miss out",
    bannerCta: "Join Us Live",
    scrollingMessage: "Register Now · Scan the QR Code · Join Our Community",
  },
]

export function overlayToLivePreview(studio: OverlayStudioPayload): UnityLiveOverlay | null {
  if (!studio.enabled) return null

  const hasContent =
    studio.logoUrl ||
    studio.speakerName ||
    studio.bannerMessage ||
    studio.bannerCta ||
    studio.donationMessage ||
    studio.donationCta ||
    studio.sponsorImageUrl ||
    studio.scrollingMessage ||
    studio.qrCodeUrl

  if (!hasContent) return null

  return {
    accentColor: studio.accentColor,
    logoUrl: studio.logoUrl,
    speakerName: studio.speakerName,
    bannerMessage: studio.bannerMessage,
    bannerCta: studio.bannerCta,
    donationMessage: studio.donationMessage,
    donationCta: studio.donationCta,
    sponsorImageUrl: studio.sponsorImageUrl,
    sponsorLabel: studio.sponsorLabel,
    scrollingMessage: studio.scrollingMessage,
    qrCodeUrl: studio.qrCodeUrl,
    qrLabel: studio.qrLabel,
    showLiveBadge: studio.showLiveBadge,
  }
}

export function overlayToVideoPreview(studio: OverlayStudioPayload): UnityLiveVideoOverlay | null {
  if (!studio.enabled) return null

  const hasContent =
    studio.logoUrl ||
    studio.speakerName ||
    studio.bannerMessage ||
    studio.bannerCta ||
    studio.sponsorImageUrl

  if (!hasContent) return null

  return {
    accentColor: studio.accentColor,
    logoUrl: studio.logoUrl,
    speakerName: studio.speakerName,
    bannerMessage: studio.bannerMessage,
    bannerCta: studio.bannerCta,
    sponsorImageUrl: studio.sponsorImageUrl,
    sponsorLabel: studio.sponsorLabel,
  }
}
