"use client"

import { useCallback, useState } from "react"
import { Link, router, usePage } from "@inertiajs/react"
import toast from "react-hot-toast"
import { BadgeCheck, Heart, Share2, UserCheck, UserPlus } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import OrgFollowButton from "@/components/ui/OrgFollowButtonProps"
import DonationModal from "@/components/frontend/donation-modal"
import type { UnityLiveHostProfile } from "@/lib/unity-live-display"
import { cn } from "@/lib/utils"

type Props = {
  hostProfile: UnityLiveHostProfile
  onShare?: () => void
  size?: "sm" | "md"
  className?: string
  donateOpen?: boolean
  onDonateOpenChange?: (open: boolean) => void
}

export function UnityLiveHostActions({
  hostProfile,
  onShare,
  size = "md",
  className,
  donateOpen,
  onDonateOpenChange,
}: Props) {
  const { auth } = usePage().props as { auth?: { user?: Record<string, unknown> } }
  const [internalDonateOpen, setInternalDonateOpen] = useState(false)
  const showDonationModal = donateOpen ?? internalDonateOpen
  const setShowDonationModal = onDonateOpenChange ?? setInternalDonateOpen
  const [isFollowingUser, setIsFollowingUser] = useState(hostProfile.isFollowing)
  const [isFollowLoading, setIsFollowLoading] = useState(false)

  const btnClass = size === "sm" ? "h-9 gap-1.5 px-3 text-xs" : "h-10 gap-2 px-4 text-sm"

  const handleUserFollow = useCallback(() => {
    if (!auth?.user) {
      window.location.href = route("login")
      return
    }
    if (!hostProfile.hostUserId || hostProfile.isOwnProfile) {
      return
    }

    setIsFollowLoading(true)
    router.post(route("users.toggle-follow", hostProfile.hostUserId), {}, {
      preserveScroll: true,
      preserveState: true,
      onSuccess: () => {
        setIsFollowingUser((prev) => !prev)
        toast.success(isFollowingUser ? "Unfollowed" : "Following")
      },
      onError: () => toast.error("Could not update follow."),
      onFinish: () => setIsFollowLoading(false),
    })
  }, [auth?.user, hostProfile.hostUserId, hostProfile.isOwnProfile, isFollowingUser])

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {hostProfile.canFollow && !hostProfile.isOwnProfile ? (
          hostProfile.hostType === "organization" && hostProfile.followOrganization ? (
            <div className="[&_button]:h-9 [&_button]:min-w-0 [&_button]:px-3 [&_button]:text-xs sm:[&_button]:h-10 sm:[&_button]:px-4 sm:[&_button]:text-sm">
              <OrgFollowButton
                organization={hostProfile.followOrganization}
                auth={auth}
                initialIsFollowing={hostProfile.isFollowing}
                isOwnOrganization={hostProfile.isOwnProfile}
              />
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className={cn(
                btnClass,
                "border-purple-500/40 text-purple-700 hover:bg-purple-500/10 dark:border-purple-400/40 dark:text-purple-200 dark:hover:bg-purple-500/15",
              )}
              onClick={handleUserFollow}
              disabled={isFollowLoading}
            >
              {isFollowingUser ? (
                <>
                  <UserCheck className="h-4 w-4" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Follow
                </>
              )}
            </Button>
          )
        ) : null}

        {hostProfile.canDonate && hostProfile.donationOrganization ? (
          <Button
            type="button"
            data-unity-live-donate=""
            className={cn(btnClass, "bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600")}
            onClick={() => setShowDonationModal(true)}
          >
            <Heart className="h-4 w-4" />
            Donate
          </Button>
        ) : null}

        {onShare ? (
          <Button
            type="button"
            variant="outline"
            className={cn(
              btnClass,
              "border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-white/15 dark:text-neutral-200 dark:hover:bg-white/10",
            )}
            onClick={onShare}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        ) : null}
      </div>

      {hostProfile.donationOrganization && onDonateOpenChange === undefined ? (
        <DonationModal
          isOpen={showDonationModal}
          onClose={() => setShowDonationModal(false)}
          organization={hostProfile.donationOrganization}
        />
      ) : null}
    </>
  )
}

type ProfileCardProps = {
  hostProfile: UnityLiveHostProfile
  streamTitle: string
  subtitle?: string | null
  onShare?: () => void
  donateOpen?: boolean
  onDonateOpenChange?: (open: boolean) => void
}

export function UnityLiveHostProfileCard({
  hostProfile,
  streamTitle,
  subtitle,
  onShare,
  donateOpen,
  onDonateOpenChange,
}: ProfileCardProps) {
  const initials = hostProfile.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const profileInner = (
    <div className="flex min-w-0 items-start gap-4">
      {hostProfile.profileUrl ? (
        <Link href={hostProfile.profileUrl} className="relative shrink-0 transition-opacity hover:opacity-90">
          {hostProfile.avatarUrl ? (
            <img
              src={hostProfile.avatarUrl}
              alt=""
              className="h-16 w-16 rounded-full border-2 border-purple-500/30 object-cover shadow-lg sm:h-[72px] sm:w-[72px]"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-purple-500/30 bg-gradient-to-br from-purple-600 to-blue-600 text-lg font-bold text-white sm:h-[72px] sm:w-[72px]">
              {initials}
            </div>
          )}
        </Link>
      ) : (
        <div className="relative shrink-0">
          {hostProfile.avatarUrl ? (
            <img
              src={hostProfile.avatarUrl}
              alt=""
              className="h-16 w-16 rounded-full border-2 border-purple-500/30 object-cover shadow-lg sm:h-[72px] sm:w-[72px]"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-purple-500/30 bg-gradient-to-br from-purple-600 to-blue-600 text-lg font-bold text-white sm:h-[72px] sm:w-[72px]">
              {initials}
            </div>
          )}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {hostProfile.profileUrl ? (
            <Link
              href={hostProfile.profileUrl}
              className="truncate text-lg font-bold text-neutral-900 transition-colors hover:text-purple-700 dark:text-white dark:hover:text-purple-300 sm:text-xl"
            >
              {hostProfile.name}
            </Link>
          ) : (
            <h2 className="truncate text-lg font-bold text-neutral-900 dark:text-white sm:text-xl">
              {hostProfile.name}
            </h2>
          )}
          {hostProfile.isVerified ? (
            <BadgeCheck className="h-5 w-5 shrink-0 text-purple-500 dark:text-purple-400" aria-label="Verified" />
          ) : null}
        </div>
        {hostProfile.tagline ? (
          <p className="mt-0.5 line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400">{hostProfile.tagline}</p>
        ) : null}
        <p className="mt-1 line-clamp-1 text-xs text-neutral-400 dark:text-neutral-500">
          {streamTitle}
          {subtitle ? ` · ${subtitle}` : ""}
        </p>
        <div className="mt-3">
          <UnityLiveHostActions
            hostProfile={hostProfile}
            onShare={onShare}
            size="sm"
            donateOpen={donateOpen}
            onDonateOpenChange={onDonateOpenChange}
          />
        </div>
      </div>
    </div>
  )

  return <div>{profileInner}</div>
}
