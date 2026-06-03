/** Glossy heart + cupped hands — matches client footer CTA mockup (CSS/SVG, no image asset). */
export function LandingCtaVisual({ className }: { className?: string }) {
  return (
    <svg
      viewBox="40 60 340 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="cta-heart-fill" x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="45%" stopColor="#9333ea" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="cta-heart-shine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="cta-hand-fill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4c1d95" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id="cta-glow" cx="50%" cy="70%" r="50%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
        <filter id="cta-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>

      <ellipse cx="210" cy="300" rx="180" ry="70" fill="url(#cta-glow)" filter="url(#cta-blur)" />

      {/* Cupped hands */}
      <path
        d="M48 310 C55 220 95 175 145 195 C125 250 105 295 75 330 C62 338 52 325 48 310Z"
        fill="url(#cta-hand-fill)"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1.5"
      />
      <path
        d="M372 310 C365 220 325 175 275 195 C295 250 315 295 345 330 C358 338 368 325 372 310Z"
        fill="url(#cta-hand-fill)"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1.5"
      />

      {/* Heart shadow */}
      <path
        d="M210 295 C150 240 95 195 95 145 C95 108 122 82 158 82 C182 82 200 96 210 112 C220 96 238 82 262 82 C298 82 325 108 325 145 C325 195 270 240 210 295Z"
        fill="#4c1d95"
        opacity="0.45"
        transform="translate(0, 14)"
      />

      {/* Main heart */}
      <path
        d="M210 288 C152 234 98 190 98 142 C98 106 124 80 160 80 C184 80 202 94 210 110 C218 94 236 80 260 80 C296 80 322 106 322 142 C322 190 268 234 210 288Z"
        fill="url(#cta-heart-fill)"
      />
      <path
        d="M210 288 C152 234 98 190 98 142 C98 106 124 80 160 80 C184 80 202 94 210 110 C218 94 236 80 260 80 C296 80 322 106 322 142 C322 190 268 234 210 288Z"
        fill="url(#cta-heart-shine)"
        opacity="0.35"
      />

      {/* Highlight specular */}
      <ellipse cx="175" cy="118" rx="28" ry="18" fill="white" opacity="0.22" transform="rotate(-25 175 118)" />
    </svg>
  )
}
