"use client"

import { Head, usePage } from "@inertiajs/react"

export interface PageHeadProps {
  title: string
  description?: string
  /** Absolute URL for og:image (and twitter:image) */
  image?: string
  /** Absolute URL for canonical link and og:url */
  canonical?: string
}

const DEFAULT_APP_NAME = import.meta.env.VITE_APP_NAME || "501c3ers"

/**
 * Renders Inertia Head with title, meta description, and Open Graph / Twitter tags.
 * Server-rendered tags live in resources/views/partials/social-meta.blade.php for crawlers.
 */
type SharedSeoProps = {
  seoSiteName?: string
  seoCanonical?: string
  seoDefaultImage?: string
  seo?: { share_image?: string; description?: string }
}

function guessImageMimeType(url: string): string {
  const path = url.split("?")[0]?.toLowerCase() ?? ""
  if (path.endsWith(".png")) return "image/png"
  if (path.endsWith(".webp")) return "image/webp"
  if (path.endsWith(".gif")) return "image/gif"
  if (path.endsWith(".svg")) return "image/svg+xml"
  return "image/jpeg"
}

export function PageHead({ title, description, image, canonical }: PageHeadProps) {
  const props = usePage().props as SharedSeoProps
  const appName = props.seoSiteName ?? DEFAULT_APP_NAME
  const fullTitle = title.includes(appName) ? title : `${title} | ${appName}`
  const url = canonical ?? props.seoCanonical ?? (typeof window !== "undefined" ? window.location.href : "")
  const metaDescription = description ?? props.seo?.description
  const shareImage = image ?? props.seo?.share_image ?? props.seoDefaultImage ?? ""
  const imageType = shareImage ? guessImageMimeType(shareImage) : ""

  return (
    <Head>
      <title>{title}</title>
      {metaDescription && <meta name="description" content={metaDescription} />}
      {url && <link rel="canonical" href={url} />}
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      {metaDescription && <meta property="og:description" content={metaDescription} />}
      {url && <meta property="og:url" content={url} />}
      <meta property="og:site_name" content={appName} />
      <meta property="og:locale" content="en_US" />
      {shareImage && (
        <>
          <meta property="og:image" content={shareImage} />
          <meta property="og:image:secure_url" content={shareImage} />
          <meta property="og:image:type" content={imageType} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:alt" content={fullTitle} />
        </>
      )}
      {/* Twitter / X */}
      <meta name="twitter:card" content={shareImage ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={fullTitle} />
      {metaDescription && <meta name="twitter:description" content={metaDescription} />}
      {shareImage && (
        <>
          <meta name="twitter:image" content={shareImage} />
          <meta name="twitter:image:alt" content={fullTitle} />
        </>
      )}
    </Head>
  )
}
