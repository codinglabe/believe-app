"use client"

import { motion } from "framer-motion"
import { Globe } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { LANDING_HUB_FEATURES } from "./landing-data"
import { landingTheme } from "./landing-theme"

const HUB_MAX = 420
const ORBIT_RATIO = 178 / HUB_MAX
const FEATURE_RATIO = 52 / HUB_MAX

function useHubDiameter(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState(280)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const update = () => {
      const available = el.clientWidth
      const viewportCap = window.innerWidth - (window.innerWidth < 640 ? 32 : 48)
      const cap = Math.min(available, viewportCap, HUB_MAX)
      setSize(Math.max(220, cap))
    }

    const observer = new ResizeObserver(update)
    observer.observe(el)
    window.addEventListener("resize", update)
    update()

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", update)
    }
  }, [containerRef])

  return size
}

export function LandingHeroHub() {
  const containerRef = useRef<HTMLDivElement>(null)
  const diameter = useHubDiameter(containerRef)
  const orbitRadius = diameter * ORBIT_RATIO
  const featureSize = Math.max(40, diameter * FEATURE_RATIO)

  const ringInsets = useMemo(
    () => [0, diameter * (56 / HUB_MAX), diameter * (112 / HUB_MAX)],
    [diameter],
  )

  return (
    <div ref={containerRef} className="mx-auto w-full max-w-[420px] overflow-visible px-1 sm:px-2">
      <div
        className="relative mx-auto aspect-square rounded-full"
        style={{ width: diameter, height: diameter }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-full border border-purple-200/80 bg-purple-50/60 shadow-[0_0_80px_rgba(147,51,234,0.2)] dark:border-purple-400/25 dark:bg-purple-950/35 dark:shadow-[0_0_100px_rgba(147,51,234,0.45)]"
          aria-hidden
        />

        {ringInsets.map((inset) => (
          <div
            key={inset}
            className="pointer-events-none absolute rounded-full border border-purple-300/40 dark:border-purple-400/20"
            style={{ inset: `${inset}px` }}
            aria-hidden
          />
        ))}

        <div
          className="pointer-events-none absolute rounded-full bg-gradient-to-br from-purple-400/20 to-blue-400/15 blur-2xl dark:from-purple-600/30 dark:to-blue-600/20"
          style={{ inset: `${diameter * (56 / HUB_MAX)}px` }}
          aria-hidden
        />

        <div className="absolute inset-[26%] z-20 flex aspect-square flex-col items-center justify-center rounded-full border border-purple-200/80 bg-white shadow-lg dark:border-white/15 dark:bg-gradient-to-br dark:from-purple-900/95 dark:to-[#12082a] dark:shadow-[inset_0_0_48px_rgba(147,51,234,0.25)]">
          <div className="absolute -top-2 flex aspect-square h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 ring-2 ring-white sm:h-8 sm:w-8 dark:ring-purple-400/30">
            <Globe className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />
          </div>
          <img
            src="/favicon-96x96.png"
            alt=""
            className="h-10 w-10 rounded-full object-contain sm:h-12 sm:w-12 md:h-14 md:w-14"
          />
          <span
            className={`mt-1 max-w-[120px] px-1 text-center text-[10px] font-bold leading-tight sm:max-w-[140px] sm:text-xs md:text-sm ${landingTheme.gradientText}`}
          >
            Believe In Unity
          </span>
        </div>

        {LANDING_HUB_FEATURES.map(({ label, icon: Icon }, index) => {
          const angleDeg = (index / LANDING_HUB_FEATURES.length) * 360 - 90
          const angleRad = (angleDeg * Math.PI) / 180
          const x = Math.cos(angleRad) * orbitRadius
          const y = Math.sin(angleRad) * orbitRadius
          const showLabel = diameter >= 260

          return (
            <div
              key={label}
              className="absolute left-1/2 top-1/2 z-10 flex flex-col items-center"
              style={{
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + index * 0.04, duration: 0.35 }}
                className="flex flex-col items-center gap-0.5"
              >
                <div
                  className="flex aspect-square items-center justify-center rounded-full border border-purple-200 bg-white shadow-md dark:border-white/20 dark:bg-[#1a1030]/95 dark:shadow-lg dark:shadow-purple-900/40"
                  style={{ width: featureSize, height: featureSize }}
                >
                  <Icon
                    className={`shrink-0 ${landingTheme.iconColor}`}
                    style={{
                      width: Math.max(16, featureSize * 0.38),
                      height: Math.max(16, featureSize * 0.38),
                    }}
                  />
                </div>
                {showLabel ? (
                  <span
                    className={`max-w-[72px] text-center text-[8px] font-medium leading-tight sm:max-w-[76px] sm:text-[9px] ${landingTheme.bodyText}`}
                  >
                    {label}
                  </span>
                ) : null}
              </motion.div>
            </div>
          )
        })}
      </div>

      <p className={`mt-4 text-center text-xs font-medium sm:mt-5 sm:text-sm md:text-base ${landingTheme.bodyText}`}>
        Everything your organization needs in one place
      </p>
    </div>
  )
}
