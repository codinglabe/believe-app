"use client"

import { useState, useRef, useCallback } from "react"
import { useForm } from "@inertiajs/react"
import { route } from "ziggy-js"
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
}

export default function OrgFollowButton({
  organization,
  auth,
  initialIsFollowing = false,
  initialNotifications = false
}: OrgFollowButtonProps) {
  // Use props directly as source of truth, only maintain local state for optimistic updates
  const [localIsFollowing, setLocalIsFollowing] = useState<boolean | null>(null)
  const [localNotifications, setLocalNotifications] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { post } = useForm()

  // Derive current state: use local if set, otherwise use props
  const isFollowing = localIsFollowing !== null ? localIsFollowing : initialIsFollowing
  const notifications = localNotifications !== null ? localNotifications : initialNotifications

  // Track if we're in the middle of an update to prevent loops
  const updateInProgressRef = useRef(false)

  const handleToggleFollow = useCallback(() => {
    if (!auth?.user || isLoading || updateInProgressRef.current) {
      if (!auth?.user) {
        window.location.href = route('login')
      }
      return
    }

    updateInProgressRef.current = true
    setIsLoading(true)
    
    // Optimistically update state
    const newFollowingState = !isFollowing
    setLocalIsFollowing(newFollowingState)

    post(route("user.organizations.toggle-favorite", organization.id), {
      preserveScroll: true,
      onSuccess: () => {
        setIsLoading(false)
        updateInProgressRef.current = false
        // Keep local state - page will reload or props will update
      },
      onError: (errors) => {
        console.error("Error toggling follow:", errors)
        // Revert on error
        setLocalIsFollowing(null) // Reset to use props
        setIsLoading(false)
        updateInProgressRef.current = false
      },
    })
  }, [auth?.user, isLoading, isFollowing, organization.id, post])

  const handleToggleNotifications = useCallback(() => {
    if (!auth?.user || !isFollowing || isLoading || updateInProgressRef.current) return

    updateInProgressRef.current = true
    setIsLoading(true)
    
    // Don't update optimistically - wait for API response to prevent ref conflicts
    const newNotificationsState = !notifications

    post(route("user.organizations.toggle-notifications", organization.id), {
      preserveScroll: true,
      onSuccess: () => {
        // Update state after successful API call
        setLocalNotifications(newNotificationsState)
        setIsLoading(false)
        updateInProgressRef.current = false
      },
      onError: (errors) => {
        console.error("Error toggling notifications:", errors)
        setIsLoading(false)
        updateInProgressRef.current = false
      },
    })
  }, [auth?.user, isFollowing, isLoading, notifications, organization.id, post])

  const handleUnfollow = useCallback(() => {
    if (!auth?.user || !isFollowing || isLoading || updateInProgressRef.current) return

    updateInProgressRef.current = true
    setIsLoading(true)
    
    // Don't update optimistically - wait for API response to prevent ref conflicts

    post(route("user.organizations.toggle-favorite", organization.id), {
      preserveScroll: true,
      onSuccess: () => {
        // Update state after successful API call
        setLocalIsFollowing(false)
        setIsLoading(false)
        updateInProgressRef.current = false
      },
      onError: (errors) => {
        console.error("Error unfollowing:", errors)
        setIsLoading(false)
        updateInProgressRef.current = false
      },
    })
  }, [auth?.user, isFollowing, isLoading, organization.id, post])

  if (!isFollowing) {
    // Subscribe Button (Not Following)
    return (
      <Button
        onClick={handleToggleFollow}
        variant="outline"
        size="lg"
        className="bg-white/10 border-white/20 text-white hover:bg-white/20 min-w-[40px] sm:min-w-0 h-9 sm:h-10 md:h-11 flex-shrink-0 justify-center sm:justify-start px-2 sm:px-3 md:px-4"
        title="Follow"
      >
        <UserPlus className="h-4 w-4 sm:h-4 sm:w-4 md:h-4 md:w-4 flex-shrink-0 sm:mr-1.5 md:mr-2" />
        <span className="hidden sm:inline whitespace-nowrap truncate">{isLoading ? "Loading..." : "Follow"}</span>
      </Button>
    )
  }

  // Following State with Dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={isLoading}
          variant="outline"
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 sm:px-3 md:px-4 py-2 font-medium text-xs sm:text-sm md:text-base border-gray-300 h-9 sm:h-10 md:h-11 min-w-[40px] sm:min-w-0 flex-shrink-0 justify-center sm:justify-start"
          title="Following"
        >
          <UserCheck className="h-4 w-4 sm:h-4 sm:w-4 md:h-4 md:w-4 flex-shrink-0 sm:mr-1.5 md:mr-2" />
          <span className="hidden sm:inline whitespace-nowrap truncate">{isLoading ? "Loading..." : "Following"}</span>
          <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0 sm:ml-1.5 md:ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
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
