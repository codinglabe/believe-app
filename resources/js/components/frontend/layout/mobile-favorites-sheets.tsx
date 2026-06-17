"use client"

import type { MobileNavMenuItem, MobileNavPayload } from "@/types/mobile-nav"
import { isMobileNavItemActive } from "@/types/mobile-nav"
import { resolveSiteMenuIcon } from "@/lib/site-menu-icons"
import { cn } from "@/lib/utils"
import { Link, router } from "@inertiajs/react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronRight, Heart, Settings2, Star, X } from "lucide-react"
import { useState } from "react"

const smoothEase = [0.25, 0.1, 0.25, 1] as const
const overlayTransition = { duration: 0.28, ease: smoothEase }
const sheetTransition = { duration: 0.32, ease: smoothEase }
const sheetItemTransition = { duration: 0.22, ease: smoothEase }

type SheetProps = {
  mobileNav: MobileNavPayload
  path: string
  favoritesOpen: boolean
  onCloseFavorites: () => void
  onOpenBrowse: () => void
}

export function MobileFavoritesOnboarding({
  mobileNav,
  onDone,
}: {
  mobileNav: MobileNavPayload
  onDone: () => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const toggle = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const submit = () => {
    if (selected.length === 0) return
    setSubmitting(true)
    router.post(
      route("favorite-menus.onboarding"),
      { interests: selected },
      { preserveScroll: true, onFinish: () => setSubmitting(false), onSuccess: onDone },
    )
  }

  const skip = () => {
    setSubmitting(true)
    router.post(route("favorite-menus.onboarding.skip"), {}, {
      preserveScroll: true,
      onFinish: () => setSubmitting(false),
      onSuccess: onDone,
    })
  }

  return (
    <div className="pointer-events-auto fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center 2xl:hidden">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-border/70 bg-background p-5 shadow-2xl">
        <h2 className="text-lg font-bold text-foreground">Choose your favorites</h2>
        <p className="mt-1 text-sm text-muted-foreground">What are you interested in? We&apos;ll build your bottom navigation.</p>
        <div className="mt-4 space-y-2">
          {mobileNav.interestOptions.map((option) => {
            const checked = selected.includes(option.key)
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => toggle(option.key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                  checked ? "border-purple-500/60 bg-purple-500/10" : "border-border/70",
                )}
              >
                <span className={cn("flex h-5 w-5 items-center justify-center rounded border", checked && "border-purple-500 bg-purple-500 text-white")}>
                  {checked ? "✓" : ""}
                </span>
                {option.label}
              </button>
            )
          })}
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={skip} disabled={submitting} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium">
            Skip
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || selected.length === 0}
            className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

function FavoriteGridTile({ item, onNavigate }: { item: MobileNavMenuItem; onNavigate: () => void }) {
  const Icon = resolveSiteMenuIcon(item.icon)
  return (
    <Link
      href={item.href ?? "#"}
      onClick={onNavigate}
      className="flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-muted/20 p-2 transition-colors active:bg-muted/40"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm">
        <Icon className="h-5 w-5 stroke-[2px]" />
      </span>
      <span className="text-center text-[11px] font-semibold leading-tight text-foreground">{item.title}</span>
    </Link>
  )
}

export function MobileFavoritesHubSheet({
  mobileNav,
  favoritesOpen,
  onCloseFavorites,
  onOpenBrowse,
  onOpenCustomize,
}: SheetProps & { onOpenCustomize: () => void }) {
  return (
    <AnimatePresence>
      {favoritesOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close favorites"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={overlayTransition}
            className="pointer-events-auto fixed inset-0 z-[44] bg-black/45 backdrop-blur-sm 2xl:hidden"
            onClick={onCloseFavorites}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="favorites-sheet-title"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={sheetTransition}
            style={{ transformOrigin: "bottom center" }}
            className="pointer-events-auto fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px)+0.5rem)] z-[45] mx-auto max-w-md rounded-3xl border border-border/70 bg-background shadow-2xl 2xl:hidden"
          >
            <div className="flex justify-center pt-3">
              <span className="h-1 w-10 rounded-full bg-muted-foreground/25" aria-hidden />
            </div>
            <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md">
                  <Star className="h-5 w-5 fill-white/20 stroke-[2px]" />
                </span>
                <div>
                  <h2 id="favorites-sheet-title" className="text-base font-bold text-foreground">
                    My Favorites
                  </h2>
                  <p className="text-xs text-muted-foreground">Your most-used tools</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={onOpenCustomize} aria-label="Customize favorites" className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
                  <Settings2 className="h-4 w-4" />
                </button>
                <button type="button" onClick={onCloseFavorites} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 px-4 pb-3 pt-1">
              {mobileNav.quickFavorites.map((item, index) => (
                <motion.div key={item.menuKey} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...sheetItemTransition, delay: index * 0.03 }}>
                  <FavoriteGridTile item={item} onNavigate={onCloseFavorites} />
                </motion.div>
              ))}
            </div>
            <div className="border-t border-border/60 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  onCloseFavorites()
                  onOpenBrowse()
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-purple-400/50 py-2.5 text-sm font-semibold text-purple-600 dark:text-purple-400"
              >
                + Browse All Features
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function MobileBrowseAllSheet({
  mobileNav,
  open,
  onClose,
}: {
  mobileNav: MobileNavPayload
  open: boolean
  onClose: () => void
}) {
  const toggleStar = (menuKey: string) => {
    router.post(route("favorite-menus.toggle", menuKey), {}, { preserveScroll: true, only: ["mobileNav"] })
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button type="button" aria-label="Close browse menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={overlayTransition} className="pointer-events-auto fixed inset-0 z-[60] bg-black/45 backdrop-blur-sm 2xl:hidden" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={sheetTransition}
            className="pointer-events-auto fixed inset-x-2 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px)+0.25rem)] top-[12vh] z-[61] mx-auto flex max-w-lg flex-col overflow-hidden rounded-3xl border border-border/70 bg-background shadow-2xl 2xl:hidden"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <h2 className="text-base font-bold">Browse All Features</h2>
              <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {mobileNav.menuCatalog.map((group) => (
                <div key={group.key} className="mb-4">
                  <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = resolveSiteMenuIcon(item.icon)
                      const isFavorite = mobileNav.favoriteMenuKeys.includes(item.menuKey)
                      return (
                        <div key={item.menuKey} className="flex items-center gap-1">
                          <Link href={item.href ?? "#"} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-muted/50">
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate text-sm font-medium">{item.title}</span>
                            <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/60" />
                          </Link>
                          <button type="button" onClick={() => toggleStar(item.menuKey)} aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-amber-500">
                            <Star className={cn("h-4 w-4", isFavorite && "fill-amber-400")} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function MobileCustomizeSheet({
  mobileNav,
  open,
  onClose,
}: {
  mobileNav: MobileNavPayload
  open: boolean
  onClose: () => void
}) {
  const slot2 = mobileNav.bottomNavSlots.find((s) => s.slot === 2)?.menuKey ?? "organizations"
  const slot4 = mobileNav.bottomNavSlots.find((s) => s.slot === 4)?.menuKey ?? "chat"

  const bottomEligible = mobileNav.menuCatalog
    .flatMap((g) => g.items)
    .filter((i) => i.bottomNavEligible)

  const toggleFavorite = (menuKey: string) => {
    router.post(route("favorite-menus.toggle", menuKey), {}, { preserveScroll: true, only: ["mobileNav"] })
  }

  const updateBottomNavSlot = (slot: 2 | 4, menuKey: string) => {
    router.put(
      route("favorite-menus.bottom-nav"),
      { slots: { 2: slot === 2 ? menuKey : slot2, 4: slot === 4 ? menuKey : slot4 } },
      { preserveScroll: true, only: ["mobileNav"] },
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button type="button" aria-label="Close customize" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-auto fixed inset-0 z-[62] bg-black/45 backdrop-blur-sm 2xl:hidden" onClick={onClose} />
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={sheetTransition} className="pointer-events-auto fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px)+0.5rem)] z-[63] mx-auto max-h-[75vh] max-w-md overflow-y-auto rounded-3xl border border-border/70 bg-background p-4 shadow-2xl 2xl:hidden">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">Customize My Favorites</h2>
              <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Bottom navigation (slots 2 & 4)</p>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <select
                value={slot2}
                onChange={(e) => updateBottomNavSlot(2, e.target.value)}
                className="rounded-xl border border-border bg-background px-2 py-2 text-sm"
              >
                {bottomEligible.map((item) => (
                  <option key={item.menuKey} value={item.menuKey}>{item.title}</option>
                ))}
              </select>
              <select
                value={slot4}
                onChange={(e) => updateBottomNavSlot(4, e.target.value)}
                className="rounded-xl border border-border bg-background px-2 py-2 text-sm"
              >
                {bottomEligible.map((item) => (
                  <option key={item.menuKey} value={item.menuKey}>{item.title}</option>
                ))}
              </select>
            </div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Favorite grid (up to {mobileNav.limits.quickMax})</p>
            <div className="space-y-1 pb-2">
              {mobileNav.menuCatalog.flatMap((g) => g.items).map((item) => {
                const isFavorite = mobileNav.favoriteMenuKeys.includes(item.menuKey)
                return (
                  <button
                    key={item.menuKey}
                    type="button"
                    onClick={() => toggleFavorite(item.menuKey)}
                    className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm", isFavorite && "bg-purple-500/10")}
                  >
                    <Star className={cn("h-4 w-4 text-amber-500", isFavorite && "fill-amber-400")} />
                    {item.title}
                  </button>
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

const guestQuickLinks: { title: string; href: string; icon: string }[] = [
  { title: "Donate", href: "/donate", icon: "Heart" },
  { title: "Organizations", href: "/organizations", icon: "Building2" },
  { title: "Events", href: "/events", icon: "Calendar" },
  { title: "Marketplace", href: "/marketplace", icon: "ShoppingBag" },
  { title: "Unity Meet", href: "/livestreams/supporter", icon: "Video" },
  { title: "Sign in", href: "/login", icon: "User" },
]

export function MobileGuestHubSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={overlayTransition}
            className="pointer-events-auto fixed inset-0 z-[44] bg-black/45 backdrop-blur-sm 2xl:hidden"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={sheetTransition}
            className="pointer-events-auto fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px)+0.5rem)] z-[45] mx-auto max-w-md rounded-3xl border border-border/70 bg-background shadow-2xl 2xl:hidden"
          >
            <div className="flex justify-center pt-3">
              <span className="h-1 w-10 rounded-full bg-muted-foreground/25" aria-hidden />
            </div>
            <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md">
                  <Heart className="h-5 w-5 fill-white/20 stroke-[2px]" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-foreground">Explore</h2>
                  <p className="text-xs text-muted-foreground">Sign in to personalize your favorites</p>
                </div>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 px-4 pb-4 pt-1">
              {guestQuickLinks.map((item, index) => {
                const Icon = resolveSiteMenuIcon(item.icon)
                return (
                  <motion.div key={item.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...sheetItemTransition, delay: index * 0.03 }}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-muted/20 p-2 transition-colors active:bg-muted/40"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm">
                        <Icon className="h-5 w-5 stroke-[2px]" />
                      </span>
                      <span className="text-center text-[11px] font-semibold leading-tight text-foreground">{item.title}</span>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
