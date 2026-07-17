export type MobileNavMenuItem = {
  menuKey: string
  title: string
  href: string | null
  icon: string
  category?: string
  activePathPrefix?: string | null
  requiresAuth?: boolean
  bottomNavEligible?: boolean
  isHub?: boolean
  isCenterGift?: boolean
  opensWallet?: boolean
  slot?: number
}

export type MobileNavCatalogGroup = {
  key: string
  label: string
  items: MobileNavMenuItem[]
}

export type MobileNavPayload = {
  favoriteMenuKeys: string[]
  quickFavorites: MobileNavMenuItem[]
  bottomNavSlots: MobileNavMenuItem[]
  menuCatalog: MobileNavCatalogGroup[]
  needsOnboarding: boolean
  canCustomize: boolean
  canCustomizeQuick: boolean
  interestOptions: { key: string; label: string }[]
  limits: { quickMax: number; quickGrid: number }
}

export function isMobileNavItemActive(path: string, item: MobileNavMenuItem): boolean {
  if (item.isHub) return false
  if (!item.activePathPrefix) {
    return item.href ? path === item.href.split("?")[0] : false
  }
  if (item.activePathPrefix === "/") {
    return path === "/"
  }
  return path === item.activePathPrefix || path.startsWith(`${item.activePathPrefix}/`)
}
