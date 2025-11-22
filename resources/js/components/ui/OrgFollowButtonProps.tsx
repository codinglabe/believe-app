// components/frontend/organization/org-follow-button.tsx
"use client"

import { useState, useEffect } from "react"
import { router, useForm, usePage } from "@inertiajs/react"
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
import PositionSelectionPopup from "./position-selection-popup"

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
  const [showPositionPopup, setShowPositionPopup] = useState(false)
  const [allPositions, setAllPositions] = useState<Record<string, any[]>>({})
  const [userPositions, setUserPositions] = useState<any[]>([])

  const { props } = usePage()
  const { post } = useForm()

  // Sync with props
  useEffect(() => {
    setIsFollowing(initialIsFollowing)
    setNotifications(initialNotifications)
  }, [initialIsFollowing, initialNotifications])

  // Load positions when popup opens
  useEffect(() => {
    if (showPositionPopup) {
        loadPositions()
    }

  }, [showPositionPopup])

  const loadPositions = async () => {
    try {
      const response = await fetch(route('user.positions.get-for-selection'))
      const data = await response.json()
        setAllPositions( data.all_positions)
      setUserPositions(data.user_positions)


    } catch (error) {
      console.error('Error loading positions:', error)
    }
  }
const handleToggleFollow = async () => {
  if (!auth?.user) {
    window.location.href = route('login')
    return
  }

  setIsLoading(true)

  try {
    const response = await fetch(route("user.organizations.toggle-favorite", organization.id), {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
      },
    })

    const contentType = response.headers.get('content-type')

    if (contentType && contentType.includes('application/json')) {
      const data = await response.json()

      if (data.requires_positions) {
        setShowPositionPopup(true)
      } else if (data.success) {
        setIsFollowing(data.is_following)
        console.log(data.message)
      }
    } else {
      // If it's not JSON, it's probably an HTML redirect, so reload
      window.location.reload()
    }
  } catch (error) {
    console.error("Error toggling follow:", error)
    window.location.reload()
  } finally {
    setIsLoading(false)
  }
}

  const handlePositionSaveSuccess = () => {
    // Reload the page to reflect the new follow status
    window.location.reload()
  }

  const handleToggleNotifications = () => {
    if (!auth?.user || !isFollowing) return

    setIsLoading(true)

    post(route("user.organizations.toggle-notifications", organization.id), {
      preserveScroll: true,
      onSuccess: () => {
        setIsLoading(false)
        setNotifications(!notifications)
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
        setIsFollowing(false)
        setIsLoading(false)
      },
      onError: (errors) => {
        console.error("Error unfollowing:", errors)
        setIsLoading(false)
      },
    })
  }

  if (!isFollowing) {
    return (
      <>
        <Button
          onClick={handleToggleFollow}
          variant="outline"
          size="lg"
          className="bg-white/10 border-white/20 text-white hover:bg-white/20 w-full sm:w-auto"
          disabled={isLoading}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          {isLoading ? "Loading..." : "Follow"}
        </Button>

        <PositionSelectionPopup
          isOpen={showPositionPopup}
          onClose={() => setShowPositionPopup(false)}
          organizationId={organization.id}
          onSuccess={handlePositionSaveSuccess}
          allPositions={allPositions}
          userPositions={userPositions}
        />
      </>
    )
  }

  return (
    <>
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
    </>
  )
}
