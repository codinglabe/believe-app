/** Shared motion presets for Challenge Hub pages (Framer Motion variant keys: initial / animate) */
export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
}

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
  },
}

export const cardItem = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
}

export const springTransition = { type: "spring" as const, stiffness: 380, damping: 28 }
