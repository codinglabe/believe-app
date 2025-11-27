"use client"

import { useState, useEffect } from "react"
import { useForm, usePage } from "@inertiajs/react"
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
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [notifications, setNotifications] = useState(initialNotifications)
    const [isLoading, setIsLoading] = useState(false)

    console.log("following:", isFollowing, "notifications:", notifications)

  const { props } = usePage()
  const { post } = useForm()

  // Sync with props
  useEffect(() => {
    setIsFollowing(initialIsFollowing)
    setNotifications(initialNotifications)
  }, [initialIsFollowing, initialNotifications])

  // Listen for flash messages to update state
  useEffect(() => {
    if (props.flash?.success) {
      // The page will reload due to redirect, so we don't need to update state manually
      setIsLoading(false)
    }
  }, [props.flash])

  const handleToggleFollow = () => {
    if (!auth?.user) {
      window.location.href = route('login')
      return
    }

    setIsLoading(true)

    post(route("user.organizations.toggle-favorite", organization.id), {
      preserveScroll: true,
      onSuccess: () => {
        // State will be updated after page reload from redirect
        setIsLoading(false)
      },
      onError: (errors) => {
        console.error("Error toggling follow:", errors)
        setIsLoading(false)
      },
    })
  }

  const handleToggleNotifications = () => {
    if (!auth?.user || !isFollowing) return

    setIsLoading(true)

    post(route("user.organizations.toggle-notifications", organization.id), {
      preserveScroll: true,
      onSuccess: () => {
        // State will be updated after page reload from redirect
        setIsLoading(false)
      },
      onError: (errors) => {
        console.error("Error toggling notifications:", errors)
        setIsLoading(false)
      },
    })
  }

  const handleUnfollow = () => {
    if (!auth?.user || !isFollowing) return

    setIsLoading(true)

    post(route("user.organizations.toggle-favorite", organization.id), {
      preserveScroll: true,
      onSuccess: () => {
        // State will be updated after page reload from redirect
        setIsLoading(false)
      },
      onError: (errors) => {
        console.error("Error unfollowing:", errors)
        setIsLoading(false)
      },
    })
  }

  if (!isFollowing) {
    // Subscribe Button (Not Following)
    return (
      <Button
        onClick={handleToggleFollow}
        variant="outline"
  size="lg"
  className="bg-white/10 border-white/20 text-white hover:bg-white/20 w-full sm:w-auto"
      >
        <UserPlus className="mr-2 h-4 w-4" />
        {isLoading ? "Loading..." : "Follow"}
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
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 font-medium text-sm border-gray-300"
        >
          <UserCheck className="mr-2 h-4 w-4" />
          {isLoading ? "Loading..." : "Following"}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={handleToggleNotifications}
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
          onClick={handleUnfollow}
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
