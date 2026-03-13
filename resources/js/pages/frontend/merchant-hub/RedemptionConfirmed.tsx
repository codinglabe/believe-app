import React, { useState } from 'react'
import { Link, usePage } from '@inertiajs/react'
import { PageHead } from '@/components/frontend/PageHead'
import FrontendLayout from '@/layouts/frontend/frontend-layout'
import { Card, CardContent } from '@/components/frontend/ui/card'
import { Button } from '@/components/frontend/ui/button'
import { Input } from '@/components/frontend/ui/input'
import { CheckCircle2, QrCode, ArrowLeft, Share2, Copy, Gift } from 'lucide-react'

interface Redemption {
  id?: number | string
  code?: string
  offer?: { id: number | string; title: string; image?: string }
  points_spent?: number
  cash_spent?: number
  status?: string
  redeemed_at?: string
  qr_code_url?: string
  share_link?: string | null
  share_token?: string | null
}

interface Props {
  redemption?: Redemption | null
}

export default function RedemptionConfirmed({ redemption: propRedemption }: Props) {
  const redemption = propRedemption ?? (usePage().props as any).redemption ?? null
  const [showQR, setShowQR] = useState(false)
  const [copied, setCopied] = useState(false)
  const code = redemption?.code ?? ''
  const shareLink = redemption?.share_link ?? ''

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shareUrl = encodeURIComponent(shareLink)
  const shareTitle = redemption?.offer?.title ? encodeURIComponent(redemption.offer.title + ' - Merchant Hub') : ''
  const shareText = redemption?.offer?.title
    ? encodeURIComponent('Check out this offer: ' + redemption.offer.title)
    : ''
  const socialLinks = shareLink
    ? {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
        twitter: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}`,
        whatsapp: `https://wa.me/?text=${shareText}%20${shareUrl}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
      }
    : null
  const pointsUsed = redemption?.points_spent ?? 0
  const cashPaid = redemption?.cash_spent ?? 0
  const offer = redemption?.offer
  const qrCodeUrl = redemption?.qr_code_url

  if (!redemption) {
    return (
      <FrontendLayout>
        <PageHead title="Redemption" />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground mb-4">Redemption not found.</p>
          <Link href="/merchant-hub">
            <Button>Back to Merchant Hub</Button>
          </Link>
        </div>
      </FrontendLayout>
    )
  }

  return (
    <FrontendLayout>
      <PageHead title="Redemption confirmed" description="Your merchant hub redemption is confirmed." />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <Link href="/merchant-hub">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Merchant Hub
              </Button>
            </Link>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-lg mx-auto">
          <Card className="shadow-lg">
            <CardContent className="p-6 sm:p-8">
              <div className="text-center mb-6">
                <CheckCircle2 className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-foreground">Redemption confirmed</h1>
                <p className="text-muted-foreground mt-2">Show your receipt at the merchant to complete your purchase.</p>
              </div>

              {offer?.title && (
                <div className="rounded-lg bg-muted/50 p-4 mb-4">
                  <p className="text-sm text-muted-foreground">Offer</p>
                  <p className="font-semibold text-foreground">{offer.title}</p>
                </div>
              )}

              <div className="rounded-lg bg-muted/50 p-4 mb-4">
                <p className="text-sm text-muted-foreground">Receipt code</p>
                <p className="font-mono font-bold text-lg text-foreground">{code}</p>
              </div>

              <div className="flex gap-4 mb-6">
                {pointsUsed > 0 && (
                  <div className="flex-1 rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Points used</p>
                    <p className="font-semibold text-foreground">{pointsUsed.toLocaleString()}</p>
                  </div>
                )}
                {cashPaid > 0 && (
                  <div className="flex-1 rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Cash paid</p>
                    <p className="font-semibold text-foreground">${Number(cashPaid).toFixed(2)}</p>
                  </div>
                )}
              </div>

              {qrCodeUrl && (
                <>
                  <Button
                    variant="outline"
                    className="w-full mb-4"
                    onClick={() => setShowQR(!showQR)}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    {showQR ? 'Hide QR code' : 'Show QR code'}
                  </Button>
                  {showQR && (
                    <div className="flex flex-col items-center pt-4 border-t">
                      <img
                        src={qrCodeUrl}
                        alt="Redemption QR code"
                        className="w-48 h-48 object-contain bg-white rounded-lg p-2"
                      />
                      <p className="text-sm text-muted-foreground mt-2">Scan at the merchant</p>
                    </div>
                  )}
                </>
              )}

              {shareLink && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20 p-4 mt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="font-semibold text-foreground">Share & earn 500 points</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Share this link. When someone buys through your link, you get 500 reward points.
                  </p>
                  <div className="flex gap-2 mb-3">
                    <Input
                      readOnly
                      value={shareLink}
                      className="text-sm bg-background flex-1"
                    />
                    <Button variant="secondary" size="icon" onClick={handleCopyLink} title="Copy link">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  {copied && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2">Link copied!</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {socialLinks && (
                      <>
                        <a
                          href={socialLinks.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1877F2] text-white text-sm font-medium hover:opacity-90"
                        >
                          <Share2 className="w-4 h-4" />
                          Facebook
                        </a>
                        <a
                          href={socialLinks.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black dark:bg-gray-800 text-white text-sm font-medium hover:opacity-90"
                        >
                          <Share2 className="w-4 h-4" />
                          X (Twitter)
                        </a>
                        <a
                          href={socialLinks.whatsapp}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#25D366] text-white text-sm font-medium hover:opacity-90"
                        >
                          <Share2 className="w-4 h-4" />
                          WhatsApp
                        </a>
                        <a
                          href={socialLinks.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0A66C2] text-white text-sm font-medium hover:opacity-90"
                        >
                          <Share2 className="w-4 h-4" />
                          LinkedIn
                        </a>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-8 pt-6 border-t">
                <Link href="/merchant-hub">
                  <Button className="w-full">Back to Merchant Hub</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </FrontendLayout>
  )
}
