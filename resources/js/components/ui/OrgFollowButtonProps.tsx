"use client"

import { useState, useRef, useCallback, useMemo, useEffect } from "react"
import toast from "react-hot-toast"
import { router } from "@inertiajs/react"
import { UserPlus, UserCheck, Bell, BellOff, ChevronDown } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/frontend/ui/dropdown-menu"

interface OrgFollowButtonProps {
  organization: any
  auth: any
  initialIsFollowing?: boolean
  initialNotifications?: boolean
  /** When true, do not render (e.g. viewing own organization) */
  isOwnOrganization?: boolean
  /** Logged-in creator viewing their own Care Alliance public page — disabled hub label instead of Follow. */
  allianceHubOwner?: boolean
  /** Care Alliance primary key from page props — fallback when organization ids are missing client-side. */
  careAlliancePublicId?: number | null
}

export default function OrgFollowButton({
  organization,
  auth,
  initialIsFollowing = false,
  initialNotifications = false,
  isOwnOrganization = false,
  allianceHubOwner = false,
  careAlliancePublicId = null,
}: OrgFollowButtonProps) {
  if (isOwnOrganization) return null

  if (allianceHubOwner) {
    return (
      <Button
        type="button"
        disabled
        variant="outline"
        size="lg"
        className="min-w-[40px] sm:min-w-0 h-9 sm:h-10 md:h-11 flex-shrink-0 justify-center sm:justify-start px-2 sm:px-3 md:px-4 border-2 opacity-80 cursor-not-allowed border-indigo-500/40 text-indigo-900 dark:text-indigo-100 bg-indigo-500/10"
        title="You manage this Care Alliance. Supporters and other organizations can follow this page."
      >
        <UserCheck className="h-4 w-4 sm:mr-1.5 md:mr-2 shrink-0" />
        <span className="hidden sm:inline whitespace-nowrap truncate">Your alliance hub</span>
      </Button>
    )
  }
  // Use props directly as source of truth, only maintain local state for optimistic updates
  const [localIsFollowing, setLocalIsFollowing] = useState<boolean | null>(null)
  const [localNotifications, setLocalNotifications] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Track if we're in the middle of an update to prevent loops
  const updateInProgressRef = useRef(false)

  // Prefer explicit toggle id (Care Alliance); else same as nonprofit profiles (excel / org id on organization.id).
  const favoriteId = useMemo(() => {
    const raw =
      organization?.toggle_favorite_id ??
      organization?.registered_organization?.id ??
      organization?.id ??
      careAlliancePublicId
    if (raw === null || raw === undefined || raw === "") {
      return null
    }
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }, [
    organization?.toggle_favorite_id,
    organization?.registered_organization?.id,
    organization?.id,
    careAlliancePublicId,
  ])
  const canToggleFollow = favoriteId !== null

  // Derive current state: use local if set, otherwise use props
  const isFollowing = localIsFollowing !== null ? localIsFollowing : initialIsFollowing
  const notifications = localNotifications !== null ? localNotifications : initialNotifications

  // Reset local state when props change (after Inertia visit / reload)
  useEffect(() => {
    setLocalIsFollowing(null)
    setLocalNotifications(null)
  }, [initialIsFollowing, initialNotifications])

  const followErrorToast = useCallback(() => {
    toast.error(
      "Could not update follow. Sign in with a supporter or organization account, or you may be viewing your own hub."
    )
  }, [])

  const inertiaPostOptions = useMemo(
    () => ({
      preserveScroll: true,
      preserveState: false,
    }),
    []
  )

  /** Care Alliance sends this so the id is not mistaken for an unrelated excel_data row. */
  const toggleFavoriteBody = useMemo(() => {
    const ctx =
      organization?.toggle_favorite_context ?? organization?.toggleFavoriteContext
    if (ctx === "excel" || ctx === "organization" || ctx === "alliance") {
      return { toggle_favorite_context: ctx }
    }
    return {}
  }, [organization?.toggle_favorite_context, organization?.toggleFavoriteContext])

  const handleToggleFollow = useCallback(() => {
    if (isLoading || updateInProgressRef.current) return

    if (!auth?.user) {
      window.location.href = route("login")
      return
    }

    if (!canToggleFollow || favoriteId === null) {
      followErrorToast()
      return
    }

    updateInProgressRef.current = true
    setIsLoading(true)
    setLocalIsFollowing(true)

    router.post(route("organizations.toggle-favorite", { id: favoriteId }), toggleFavoriteBody, {
      ...inertiaPostOptions,
      onError: () => {
        followErrorToast()
        setLocalIsFollowing(null)
      },
      onFinish: () => {
        setIsLoading(false)
        updateInProgressRef.current = false
      },
    })
  }, [
    auth?.user,
    canToggleFollow,
    favoriteId,
    followErrorToast,
    inertiaPostOptions,
    isLoading,
    toggleFavoriteBody,
  ])

  const handleToggleNotifications = useCallback(() => {
    if (isLoading || updateInProgressRef.current) return
    if (!auth?.user || !isFollowing || !canToggleFollow || favoriteId === null) return

    updateInProgressRef.current = true
    setIsLoading(true)

    const nextNotifications = !notifications

    router.post(route("organizations.toggle-notifications", { id: favoriteId }), toggleFavoriteBody, {
      ...inertiaPostOptions,
      onSuccess: () => {
        setLocalNotifications(nextNotifications)
      },
      onError: () => {
        toast.error("Could not update notifications.")
      },
      onFinish: () => {
        setIsLoading(false)
        updateInProgressRef.current = false
      },
    })
  }, [
    auth?.user,
    canToggleFollow,
    favoriteId,
    inertiaPostOptions,
    isFollowing,
    isLoading,
    notifications,
    toggleFavoriteBody,
  ])

  const handleUnfollow = useCallback(() => {
    if (isLoading || updateInProgressRef.current) return
    if (!auth?.user || !isFollowing || !canToggleFollow || favoriteId === null) return

    updateInProgressRef.current = true
    setIsLoading(true)
    setLocalIsFollowing(false)

    router.post(route("organizations.toggle-favorite", { id: favoriteId }), toggleFavoriteBody, {
      ...inertiaPostOptions,
      onError: () => {
        followErrorToast()
        setLocalIsFollowing(null)
      },
      onFinish: () => {
        setIsLoading(false)
        updateInProgressRef.current = false
      },
    })
  }, [
    auth?.user,
    canToggleFollow,
    favoriteId,
    followErrorToast,
    inertiaPostOptions,
    isFollowing,
    isLoading,
    toggleFavoriteBody,
  ])

  if (!isFollowing) {
    // Subscribe Button (Not Following) - visible in both light and dark mode
    return (
      <Button
        type="button"
        onClick={handleToggleFollow}
        variant="outline"
        size="lg"
        className="min-w-[40px] sm:min-w-0 h-9 sm:h-10 md:h-11 flex-shrink-0 justify-center sm:justify-start px-2 sm:px-3 md:px-4 border-2 bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground dark:bg-primary dark:text-primary-foreground dark:border-primary dark:hover:bg-primary/90"
        title="Follow"
      >
        <UserPlus className="h-4 w-4 sm:h-4 sm:w-4 md:h-4 md:w-4 flex-shrink-0 sm:mr-1.5 md:mr-2" />
        <span className="hidden sm:inline whitespace-nowrap truncate">{isLoading ? "Loading..." : "Follow"}</span>
      </Button>
    )
  }

  // Following State with Dropdown
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          disabled={isLoading}
          variant="outline"
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-white/15 dark:hover:bg-white/25 dark:text-white dark:border-white/30 px-2 sm:px-3 md:px-4 py-2 font-medium text-xs sm:text-sm md:text-base border-gray-300 dark:border-white/30 h-9 sm:h-10 md:h-11 min-w-[40px] sm:min-w-0 flex-shrink-0 justify-center sm:justify-start"
          title="Following"
        >
          <UserCheck className="h-4 w-4 sm:h-4 sm:w-4 md:h-4 md:w-4 flex-shrink-0 sm:mr-1.5 md:mr-2" />
          <span className="hidden sm:inline whitespace-nowrap truncate">{isLoading ? "Loading..." : "Following"}</span>
          <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0 sm:ml-1.5 md:ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            // Use requestAnimationFrame to defer state update after dropdown closes
            requestAnimationFrame(() => {
              handleToggleNotifications()
            })
          }}
          className="cursor-pointer"
          disabled={isLoading}
        >
          {notifications ? (
            <>
              <BellOff className="mr-2 h-4 w-4" />
              Turn off notifications
            </>
          ) : (
            <>
              <Bell className="mr-2 h-4 w-4" />
              Turn on notifications
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            // Use requestAnimationFrame to defer state update after dropdown closes
            requestAnimationFrame(() => {
              handleUnfollow()
            })
          }}
          className="cursor-pointer text-red-600 focus:text-red-600"
          disabled={isLoading}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Unfollow
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
