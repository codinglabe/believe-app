"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { Head, router, useForm } from "@inertiajs/react"
import UnityMeetLayout from "@/layouts/UnityMeetLayout"
import { PageHead } from "@/components/frontend/PageHead"
import UnityLiveOverlayLayer from "@/components/unity-live/UnityLiveOverlayLayer"
import UnityLiveVideoOverlayLayer from "@/components/unity-live/UnityLiveVideoOverlayLayer"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  OVERLAY_CTA_PRESETS,
  overlayToLivePreview,
  overlayToVideoPreview,
  type OverlayStudioPayload,
} from "@/types/livestream-overlay"
import { Layers, Upload, Trash2, Save, Radio, Film, Sparkles } from "lucide-react"

type Props = {
  overlay: OverlayStudioPayload
  meta: {
    scope: "organization" | "user"
    ownerLabel: string
    updateUrl: string
    uploadLogoUrl: string
    uploadSponsorUrl: string
    uploadQrUrl: string
    removeAssetUrl: string
  }
  ffmpegAvailable: boolean
}

const BRAND = {
  fromMuted: "rgba(147,51,234,0.15)",
  toMuted: "rgba(37,99,235,0.1)",
}

function AssetUpload({
  label,
  hint,
  currentUrl,
  onUpload,
  onRemove,
  uploading,
}: {
  label: string
  hint: string
  currentUrl: string | null
  onUpload: (file: File) => void
  onRemove: () => void
  uploading: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {currentUrl ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <img src={currentUrl} alt="" className="max-h-14 max-w-[140px] object-contain rounded" />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={onRemove}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" className="gap-2" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          Upload image
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUpload(file)
          e.target.value = ""
        }}
      />
    </div>
  )
}

export default function OverlayStudio({ overlay: initialOverlay, meta, ffmpegAvailable }: Props) {
  const [uploading, setUploading] = useState<string | null>(null)

  const form = useForm({
    enabled: initialOverlay.enabled,
    accent_color: initialOverlay.accentColor,
    speaker_name: initialOverlay.speakerName,
    banner_message: initialOverlay.bannerMessage,
    banner_cta: initialOverlay.bannerCta,
    donation_message: initialOverlay.donationMessage,
    donation_cta: initialOverlay.donationCta,
    sponsor_label: initialOverlay.sponsorLabel,
    scrolling_message: initialOverlay.scrollingMessage,
    qr_label: initialOverlay.qrLabel,
    show_live_badge: initialOverlay.showLiveBadge,
  })

  const applyCtaPreset = useCallback(
    (presetId: string) => {
      const preset = OVERLAY_CTA_PRESETS.find((p) => p.id === presetId)
      if (!preset) return
      form.setData({
        ...form.data,
        banner_message: preset.bannerMessage,
        banner_cta: preset.bannerCta,
        donation_message: preset.donationMessage ?? form.data.donation_message,
        donation_cta: preset.donationCta ?? form.data.donation_cta,
        scrolling_message: preset.scrollingMessage ?? form.data.scrolling_message,
      })
    },
    [form],
  )

  const previewOverlay = useMemo(
    (): OverlayStudioPayload => ({
      enabled: form.data.enabled,
      accentColor: form.data.accent_color,
      logoUrl: initialOverlay.logoUrl,
      logoFromProfile: initialOverlay.logoFromProfile,
      speakerName: form.data.speaker_name,
      bannerMessage: form.data.banner_message,
      bannerCta: form.data.banner_cta,
      donationMessage: form.data.donation_message,
      donationCta: form.data.donation_cta,
      sponsorImageUrl: initialOverlay.sponsorImageUrl,
      sponsorLabel: form.data.sponsor_label,
      scrollingMessage: form.data.scrolling_message,
      qrCodeUrl: initialOverlay.qrCodeUrl,
      qrLabel: form.data.qr_label,
      showLiveBadge: form.data.show_live_badge,
    }),
    [form.data, initialOverlay],
  )

  const livePreview = useMemo(() => overlayToLivePreview(previewOverlay), [previewOverlay])
  const videoPreview = useMemo(() => overlayToVideoPreview(previewOverlay), [previewOverlay])

  const uploadFile = useCallback(
    (url: string, field: string, file: File) => {
      setUploading(field)
      router.post(
        url,
        { [field]: file },
        {
          forceFormData: true,
          preserveScroll: true,
          onFinish: () => setUploading(null),
        },
      )
    },
    [],
  )

  const removeAsset = useCallback(
    (asset: "logo" | "sponsor" | "qr") => {
      router.delete(meta.removeAssetUrl, {
        data: { asset },
        preserveScroll: true,
      })
    },
    [meta.removeAssetUrl],
  )

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    form.patch(meta.updateUrl, { preserveScroll: true })
  }

  return (
    <UnityMeetLayout>
      <PageHead
        title="Unity Live Overlay Studio"
        description="Configure logos, CTAs, sponsors, and branding for Unity Live streams and recordings."
      />
      <Head title="Overlay Studio · Unity Meet" />

      <div className="min-h-screen bg-background">
        <div
          className="relative overflow-hidden border-b border-purple-200 dark:border-purple-500/20"
          style={{
            background: `linear-gradient(135deg, ${BRAND.fromMuted} 0%, rgba(147,51,234,0.2) 50%, ${BRAND.toMuted} 100%)`,
          }}
        >
          <div className="relative w-full px-4 py-8 md:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 ring-1 ring-purple-500/20">
                <Layers className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="space-y-1">
                <h1 className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
                  Unity Live Overlay Studio
                </h1>
                <p className="text-sm text-muted-foreground">
                  Brand {meta.ownerLabel} on Unity Live — logo, CTAs, sponsors, and ticker. Recordings get the same logo, speaker, sponsor, and bottom banner.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid w-full gap-8 px-4 py-8 md:px-6 lg:grid-cols-2 lg:px-8">
          <form onSubmit={saveSettings} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Overlay settings</CardTitle>
                <CardDescription>
                  Upload your logo, enter banner text, and add sponsor images. Changes preview instantly on the right.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">Show overlays on Unity Live</p>
                    <p className="text-xs text-muted-foreground">Turn off to hide all overlay layers.</p>
                  </div>
                  <Switch
                    checked={form.data.enabled}
                    onCheckedChange={(v) => form.setData("enabled", v)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="accent_color">Accent color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="accent_color"
                      type="color"
                      value={form.data.accent_color}
                      onChange={(e) => form.setData("accent_color", e.target.value.toUpperCase())}
                      className="h-10 w-14 cursor-pointer p-1"
                    />
                    <Input
                      value={form.data.accent_color}
                      onChange={(e) => form.setData("accent_color", e.target.value)}
                      className="max-w-[120px] font-mono text-sm"
                    />
                  </div>
                </div>

                <AssetUpload
                  label="Organization logo"
                  hint={
                    initialOverlay.logoFromProfile && !initialOverlay.logoUrl
                      ? "Uses your profile logo until you upload a custom one."
                      : "Top-right on live streams and recordings."
                  }
                  currentUrl={initialOverlay.logoUrl}
                  uploading={uploading === "logo"}
                  onUpload={(file) => uploadFile(meta.uploadLogoUrl, "logo", file)}
                  onRemove={() => removeAsset("logo")}
                />

                <div className="grid gap-2">
                  <Label htmlFor="speaker_name">Speaker / host name</Label>
                  <Input
                    id="speaker_name"
                    placeholder="Kenneth Matthews"
                    value={form.data.speaker_name}
                    onChange={(e) => form.setData("speaker_name", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower-third name shown on live streams and burned into recordings. VDO.Ninja also labels speakers in multi-guest streams.
                  </p>
                </div>

                <div className="space-y-2 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <p className="text-sm font-medium">CTA presets (Call To Action)</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    CTAs tell viewers what to do next — donate, register, join, or scan. Pick a preset to fill banner fields, then edit as needed.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {OVERLAY_CTA_PRESETS.map((preset) => (
                      <Button
                        key={preset.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto whitespace-normal py-1.5 text-left text-xs"
                        onClick={() => applyCtaPreset(preset.id)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="banner_message">Bottom banner message</Label>
                    <Input
                      id="banner_message"
                      placeholder="Help Us Feed 100 Families"
                      value={form.data.banner_message}
                      onChange={(e) => form.setData("banner_message", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="banner_cta">Bottom banner CTA</Label>
                    <Input
                      id="banner_cta"
                      placeholder="Donate Today"
                      value={form.data.banner_cta}
                      onChange={(e) => form.setData("banner_cta", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">The action you want viewers to take — shown with 👉 on screen.</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="donation_message">Donation banner message</Label>
                    <Input
                      id="donation_message"
                      placeholder="Support Our Mission"
                      value={form.data.donation_message}
                      onChange={(e) => form.setData("donation_message", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="donation_cta">Donation banner CTA</Label>
                    <Input
                      id="donation_cta"
                      placeholder="Give Now"
                      value={form.data.donation_cta}
                      onChange={(e) => form.setData("donation_cta", e.target.value)}
                    />
                  </div>
                </div>

                <AssetUpload
                  label="Sponsor image"
                  hint="Shown above the bottom banner on live streams and in branded recording downloads."
                  currentUrl={initialOverlay.sponsorImageUrl}
                  uploading={uploading === "sponsor"}
                  onUpload={(file) => uploadFile(meta.uploadSponsorUrl, "sponsor", file)}
                  onRemove={() => removeAsset("sponsor")}
                />

                <div className="grid gap-2">
                  <Label htmlFor="sponsor_label">Sponsor label</Label>
                  <Input
                    id="sponsor_label"
                    value={form.data.sponsor_label}
                    onChange={(e) => form.setData("sponsor_label", e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="scrolling_message">Scrolling message</Label>
                  <Input
                    id="scrolling_message"
                    placeholder="Join Sunday Service · Scan the QR Code · Volunteer Today"
                    value={form.data.scrolling_message}
                    onChange={(e) => form.setData("scrolling_message", e.target.value)}
                  />
                </div>

                <AssetUpload
                  label="QR code"
                  hint="Donation or registration QR — shown bottom-right on live streams."
                  currentUrl={initialOverlay.qrCodeUrl}
                  uploading={uploading === "qr"}
                  onUpload={(file) => uploadFile(meta.uploadQrUrl, "qr", file)}
                  onRemove={() => removeAsset("qr")}
                />

                <div className="grid gap-2">
                  <Label htmlFor="qr_label">QR label</Label>
                  <Input
                    id="qr_label"
                    value={form.data.qr_label}
                    onChange={(e) => form.setData("qr_label", e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">Live badge on video</p>
                    <p className="text-xs text-muted-foreground">Red LIVE pill on the player (Unity Live page also shows one in the header).</p>
                  </div>
                  <Switch
                    checked={form.data.show_live_badge}
                    onCheckedChange={(v) => form.setData("show_live_badge", v)}
                  />
                </div>

                <Button type="submit" className="gap-2" disabled={form.processing}>
                  <Save className="h-4 w-4" />
                  Save overlay settings
                </Button>
              </CardContent>
            </Card>
          </form>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="h-4 w-4" />
                  Live preview
                </CardTitle>
                <CardDescription>What viewers see on Unity Live while you stream.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-video overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-border">
                  <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950" />
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-white/30">
                    Your stream video
                  </div>
                  {livePreview ? (
                    <UnityLiveOverlayLayer overlay={livePreview} hideLiveBadge={false} />
                  ) : (
                    <p className="absolute inset-0 flex items-center justify-center text-sm text-white/50">
                      Add a logo or banner text to preview
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Film className="h-4 w-4" />
                  Recording preview
                </CardTitle>
                <CardDescription>
                  Finished clips get logo, speaker name, sponsor, and bottom CTA banner
                  {ffmpegAvailable ? " (FFmpeg ready — use Download branded on Recordings)." : " (install FFmpeg to burn into MP4 downloads)."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-video overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-border">
                  <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950" />
                  {videoPreview ? (
                    <UnityLiveVideoOverlayLayer overlay={videoPreview} />
                  ) : (
                    <p className="absolute inset-0 flex items-center justify-center text-sm text-white/50">
                      Add a logo, speaker name, or banner text to preview
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </UnityMeetLayout>
  )
}
