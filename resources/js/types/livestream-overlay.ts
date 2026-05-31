export type UnityLiveOverlay = {
  accentColor: string
  logoUrl: string | null
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
  bannerMessage: string
  bannerCta: string
}

export type OverlayStudioPayload = {
  enabled: boolean
  accentColor: string
  logoUrl: string | null
  logoFromProfile: boolean
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

export function overlayToLivePreview(studio: OverlayStudioPayload): UnityLiveOverlay | null {
  if (!studio.enabled) return null

  const hasContent =
    studio.logoUrl ||
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
  if (!studio.logoUrl && !studio.bannerMessage && !studio.bannerCta) return null

  return {
    accentColor: studio.accentColor,
    logoUrl: studio.logoUrl,
    bannerMessage: studio.bannerMessage,
    bannerCta: studio.bannerCta,
  }
}
