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
}

export default function OrgFollowButton({
  organization,
  auth,
  initialIsFollowing = false,
  initialNotifications = false,
  isOwnOrganization = false
}: OrgFollowButtonProps) {
  if (isOwnOrganization) return null
  // Use props directly as source of truth, only maintain local state for optimistic updates
  const [localIsFollowing, setLocalIsFollowing] = useState<boolean | null>(null)
  const [localNotifications, setLocalNotifications] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Track if we're in the middle of an update to prevent loops
  const updateInProgressRef = useRef(false)

  // Memoize organization ID to prevent unnecessary re-renders (define first!)
  const organizationId = useMemo(() => organization?.id, [organization?.id])

  // Derive current state: use local if set, otherwise use props
  const isFollowing = localIsFollowing !== null ? localIsFollowing : initialIsFollowing
  const notifications = localNotifications !== null ? localNotifications : initialNotifications

  // Reset local state when props change (after page reload)
  // When the page reloads after follow/unfollow, the prop will have the correct value from backend
  useEffect(() => {
    // Reset local state to use the authoritative backend value
    // This happens after a page reload when new props arrive
    setLocalIsFollowing(null)
    setLocalNotifications(null)
  }, [initialIsFollowing, initialNotifications])

  const handleToggleFollow = useCallback(() => {
    if (!auth?.user || isLoading || updateInProgressRef.current || !organizationId) {
      if (!auth?.user) {
        window.location.href = route('login')
      }
      return
    }

    updateInProgressRef.current = true
    setIsLoading(true)

    // Optimistically update state - show following immediately when clicking follow
    const newFollowingState = true // When clicking follow, we're always following
    setLocalIsFollowing(newFollowingState)

    router.post(route("organizations.toggle-favorite", organizationId), {}, {
      preserveScroll: false,
      preserveState: false,
      onSuccess: () => {
        setIsLoading(false)
        updateInProgressRef.current = false
        // Keep the optimistic update until the page reloads with new data
        // The redirect will cause Inertia to reload the page with updated props
      },
      onError: () => {
        toast.error('Following is for supporter accounts only. Please log in with your personal (supporter) account to follow organizations.')
        setLocalIsFollowing(null)
        setIsLoading(false)
        updateInProgressRef.current = false
      },
    })
  }, [auth?.user, organizationId, isLoading, isFollowing])

  const handleToggleNotifications = useCallback(() => {
    if (!auth?.user || !isFollowing || isLoading || updateInProgressRef.current || !organizationId) return

    updateInProgressRef.current = true
    setIsLoading(true)

    // Don't update optimistically - wait for API response to prevent ref conflicts
    const newNotificationsState = !notifications

    router.post(route("user.organizations.toggle-notifications", organizationId), {}, {
      preserveScroll: true,
      onSuccess: () => {
        // Update state after successful API call
        setLocalNotifications(newNotificationsState)
        setIsLoading(false)
        updateInProgressRef.current = false
        // Reload to sync with backend
        router.reload({ only: ['organization'] })
      },
      onError: (errors) => {
        console.error("Error toggling notifications:", errors)
        setIsLoading(false)
        updateInProgressRef.current = false
      },
    })
  }, [auth?.user, organizationId, isFollowing, isLoading, notifications])

  const handleUnfollow = useCallback(() => {
    if (!auth?.user || !isFollowing || isLoading || updateInProgressRef.current || !organizationId) return

    updateInProgressRef.current = true
    setIsLoading(true)

    // Optimistically update state - show not following immediately
    setLocalIsFollowing(false)

    router.post(route("organizations.toggle-favorite", organizationId), {}, {
      preserveScroll: false,
      preserveState: false,
      onSuccess: () => {
        setIsLoading(false)
        updateInProgressRef.current = false
        // Keep the optimistic update until the page reloads with new data
        // The redirect will cause Inertia to reload the page with updated props
      },
      onError: () => {
        toast.error('Following is for supporter accounts only. Please log in with your personal (supporter) account to follow organizations.')
        setLocalIsFollowing(null)
        setIsLoading(false)
        updateInProgressRef.current = false
      },
    })
  }, [auth?.user, organizationId, isFollowing, isLoading])

  if (!isFollowing) {
    // Subscribe Button (Not Following) - visible in both light and dark mode
    return (
      <Button
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
