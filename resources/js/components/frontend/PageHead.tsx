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
 * Use on every page and pass SEO props from the Laravel controller.
 * With SSR enabled, these tags are in the initial HTML for crawlers.
 * Site name comes from admin SEO settings (seoSiteName) when set, else VITE_APP_NAME.
 */
type SharedSeoProps = { seoSiteName?: string; seoCanonical?: string; seoDefaultImage?: string }

export function PageHead({ title, description, image, canonical }: PageHeadProps) {
  const props = usePage().props as SharedSeoProps
  const appName = props.seoSiteName ?? DEFAULT_APP_NAME
  const fullTitle = title.includes(appName) ? title : `${title} | ${appName}`
  const url = canonical ?? props.seoCanonical ?? (typeof window !== "undefined" ? window.location.href : "")
  const shareImage = image ?? props.seoDefaultImage ?? ""

  return (
    <Head>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      {url && <meta property="og:url" content={url} />}
      {shareImage && <meta property="og:image" content={shareImage} />}
      <meta property="og:site_name" content={appName} />
      {/* Twitter */}
      <meta name="twitter:card" content={shareImage ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      {shareImage && <meta name="twitter:image" content={shareImage} />}
      {(canonical ?? props.seoCanonical) && <link rel="canonical" href={canonical ?? props.seoCanonical} />}
    </Head>
  )
}
