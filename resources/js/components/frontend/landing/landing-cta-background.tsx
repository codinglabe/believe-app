import { cn } from "@/lib/utils"

/** Subtle world-map style arcs — purple/blue brand, readable in light + dark. */
export function LandingCtaBackground({ className }: { className?: string }) {
  return (
    <svg
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full text-purple-400/30 dark:text-purple-400/20",
        className,
      )}
      viewBox="0 0 1440 560"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <g fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.5">
        <ellipse cx="720" cy="280" rx="520" ry="200" />
        <ellipse cx="720" cy="280" rx="380" ry="145" />
        <ellipse cx="720" cy="280" rx="240" ry="90" />
        <path d="M120 200 Q360 120 720 160 T1320 200" />
        <path d="M80 320 Q400 400 720 360 T1360 300" />
        <path d="M200 140 Q500 80 900 100 T1240 180" />
      </g>
      <g fill="currentColor" opacity="0.35">
        {[
          [320, 180],
          [480, 220],
          [620, 160],
          [780, 200],
          [920, 240],
          [1050, 170],
          [400, 300],
          [560, 340],
          [700, 310],
          [860, 350],
          [1000, 290],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2" />
        ))}
      </g>
    </svg>
  )
}
