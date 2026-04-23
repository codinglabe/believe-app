"use client"

import type React from "react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Save, X, Upload, CheckCircle, AlertCircle, Shield, Building2, Monitor, Sun, Moon, Plus } from "lucide-react"
import { Link, useForm, usePage } from "@inertiajs/react"
import { toast } from "sonner"
import { Transition } from "@headlessui/react"
import { Alert, AlertDescription } from "@/components/frontend/ui/alert"
import { MultiSelect } from "@/components/ui/multi-select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/frontend/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/frontend/ui/radio-group"
import { useAppearance, type Appearance } from "@/hooks/use-appearance"
import { cn } from "@/lib/utils"
import { ProfileOrganizationPicker } from "@/components/frontend/profile-organization-picker"
import { type SharedData } from "@/types"

interface ProfileEditPageProps {
  user: {
    id: number
    name: string
    email: string
    phone?: string
    dob?: string
    image?: string
    positions: number[]
    supporter_interests?: number[]
    city?: string
    state?: string
    zipcode?: string
    religion?: string | null
    account_visibility?: string
    messaging_policy?: string
    primary_organization_id?: number | null
    secondary_organization_ids?: number[]
    preferred_theme?: string | null
  }
  availablePositions: { id: number; name: string }[]
  availableSupporterInterests: { id: number; name: string }[]
  religionOptions: string[]
  organizations: { id: number; name: string; image: string | null }[]
  organizationPicker?: {
    target: "primary" | "secondary"
    items: { id: number; name: string; image: string | null }[]
    has_more: boolean
    page: number
    search: string
  } | null
}

type OrgRow = ProfileEditPageProps["organizations"][number]

export default function ProfileEdit() {
  const { user, availablePositions, availableSupporterInterests, religionOptions, organizations = [] } =
    usePage<SharedData & ProfileEditPageProps>().props

  const { updateAppearance } = useAppearance()

  const inertiaForm = useForm({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    dob: user?.dob || "",
    image: null as File | null,
    positions: user?.positions || [],
    supporter_interests: user?.supporter_interests || [],
    /** Must be in form payload: backend only syncs pivot when this is true */
    _supporter_interests_touched: true,
    city: user?.city || "",
    state: user?.state || "",
    zipcode: user?.zipcode || "",
    religion: user?.religion || "",
    account_visibility: user?.account_visibility || "public",
    messaging_policy: user?.messaging_policy || "everyone",
    primary_organization_id: user?.primary_organization_id ?? "",
    secondary_organization_ids: user?.secondary_organization_ids ?? [],
    preferred_theme: ((user?.preferred_theme as Appearance) ?? "system") as Appearance,
  })

  inertiaForm.transform((payload) => ({
    ...payload,
    primary_organization_id:
      payload.primary_organization_id === "" || payload.primary_organization_id === undefined
        ? null
        : typeof payload.primary_organization_id === "number"
          ? payload.primary_organization_id
          : Number(payload.primary_organization_id),
  }))

  const { data, setData, post, processing, errors, reset, recentlySuccessful } = inertiaForm

  const [previewUrl, setPreviewUrl] = useState(user?.image || null)
  const [orgCache, setOrgCache] = useState<Record<number, OrgRow>>({})

  // Update form data when user prop changes (e.g., after page reload with updated data)
  useEffect(() => {
    if (user) {
      setData("name", user.name || "")
      setData("email", user.email || "")
      setData("phone", user.phone || "")
      setData("dob", user.dob || "")
      setData("city", user.city || "")
      setData("state", user.state || "")
      setData("zipcode", user.zipcode || "")
      setData("religion", user.religion || "")
      setData("account_visibility", user.account_visibility || "public")
      setData("messaging_policy", user.messaging_policy || "everyone")
      setData("primary_organization_id", user.primary_organization_id ?? "")
      setData("secondary_organization_ids", user.secondary_organization_ids ?? [])
      const pt = (user.preferred_theme as Appearance) || "system"
      setData("preferred_theme", pt)
      updateAppearance(pt)
      setData("positions", user.positions || [])
      setData("supporter_interests", user.supporter_interests || [])
      if (user.image) {
        setPreviewUrl(user.image)
      }
    }
  }, [user?.id])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // useForm sends its `data` as the body (JSON or FormData if a file is set).
    // Do not pass FormData inside options — Inertia ignores it and the touch flag never reached Laravel.
    post(route("user.profile.update"), {
      preserveScroll: true,
      onSuccess: () => {
        toast.success("Profile updated successfully!")
      },
      onError: (errs) => {
        console.error("Update errors:", errs)
        toast.error("Failed to update profile. Please check the form.")
      },
    })
  }

  const handleCancel = () => {
    reset()
    setPreviewUrl(user?.image ?? null)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setData("image", file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  // Format positions for MultiSelect
  const positionOptions = availablePositions.map(position => ({
    label: position.name,
    value: position.id.toString()
  }))

  const selectedSupporterInterestCategories = useMemo(
    () =>
      availableSupporterInterests.filter((c) => data.supporter_interests.includes(c.id)),
    [availableSupporterInterests, data.supporter_interests],
  )

  const remainingSupporterInterestCategories = useMemo(
    () =>
      availableSupporterInterests.filter((c) => !data.supporter_interests.includes(c.id)),
    [availableSupporterInterests, data.supporter_interests],
  )

  const addSupporterInterestTag = useCallback(
    (id: number) => {
      if (data.supporter_interests.includes(id)) return
      setData("supporter_interests", [...data.supporter_interests, id])
    },
    [data.supporter_interests, setData],
  )

  const removeSupporterInterestTag = useCallback(
    (id: number) => {
      setData(
        "supporter_interests",
        data.supporter_interests.filter((x) => x !== id),
      )
    },
    [data.supporter_interests, setData],
  )

  const primaryOrgIdNum =
    data.primary_organization_id === "" || data.primary_organization_id === undefined
      ? null
      : Number(data.primary_organization_id)

  const resolvedOrganizations = useMemo(() => {
    const map = new Map<number, OrgRow>()
    for (const o of organizations) map.set(o.id, o)
    for (const o of Object.values(orgCache)) map.set(o.id, o)
    return Array.from(map.values())
  }, [organizations, orgCache])

  const mergeOrg = useCallback((org: OrgRow) => {
    setOrgCache((prev) => ({ ...prev, [org.id]: org }))
  }, [])

  const primaryOrganizationDisplay = useMemo(() => {
    if (primaryOrgIdNum === null) return null
    return resolvedOrganizations.find((o) => o.id === primaryOrgIdNum) ?? null
  }, [resolvedOrganizations, primaryOrgIdNum])

  const secondaryExcludeIds = useMemo(() => {
    const ids = [...data.secondary_organization_ids]
    if (primaryOrgIdNum) ids.push(primaryOrgIdNum)
    return [...new Set(ids)]
  }, [data.secondary_organization_ids, primaryOrgIdNum])

  const selectedSecondaryOrganizations = useMemo(
    () =>
      resolvedOrganizations.filter((o) => data.secondary_organization_ids.includes(o.id)),
    [resolvedOrganizations, data.secondary_organization_ids],
  )

  const addSecondaryOrganization = useCallback(
    (id: number) => {
      if (primaryOrgIdNum && id === primaryOrgIdNum) return
      if (data.secondary_organization_ids.includes(id)) return
      setData("secondary_organization_ids", [...data.secondary_organization_ids, id])
    },
    [data.secondary_organization_ids, primaryOrgIdNum, setData],
  )

  const removeSecondaryOrganization = useCallback(
    (id: number) =>
      setData(
        "secondary_organization_ids",
        data.secondary_organization_ids.filter((x) => x !== id),
      ),
    [data.secondary_organization_ids, setData],
  )

  const handlePrimaryOrganizationChange = useCallback(
    (value: string) => {
      const nextPrimary = value === "__none__" ? "" : value
      const pid = nextPrimary ? Number(nextPrimary) : null
      setData({
        ...data,
        primary_organization_id: nextPrimary === "" ? "" : nextPrimary,
        secondary_organization_ids: pid
          ? data.secondary_organization_ids.filter((sid) => sid !== pid)
          : data.secondary_organization_ids,
      })
    },
    [data, setData],
  )

  const setPreferredTheme = useCallback(
    (mode: Appearance) => {
      setData("preferred_theme", mode)
      updateAppearance(mode)
    },
    [setData, updateAppearance],
  )

  return (
    <ProfileLayout title="Edit Profile" description="Update your personal information and preferences">
      {/* Success Message */}
      <Transition
        show={recentlySuccessful}
        enter="transition ease-in-out"
        enterFrom="opacity-0"
        leave="transition ease-in-out"
        leaveTo="opacity-0"
      >
        <Alert className="border-green-200 mb-2 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-400">
            Profile updated successfully!
          </AlertDescription>
        </Alert>
      </Transition>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-4">
            <CardTitle className="text-gray-900 dark:text-white text-lg">Profile Picture</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                <img
                  src={previewUrl || "/placeholder.svg?height=80&width=80"}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                />
              </div>
              <div>
                <Label htmlFor="image" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Upload className="h-4 w-4" />
                    Upload New Picture
                  </div>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                  JPG, PNG or GIF. Max size 2MB.
                </p>
              </div>
            </div>
            {errors.image && <p className="text-red-600 text-sm mt-2">{errors.image}</p>}
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-4">
            <CardTitle className="text-gray-900 dark:text-white text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-gray-900 dark:text-white">
                Full Name *
              </Label>
              <Input
                id="name"
                value={data.name}
                onChange={(e) => setData("name", e.target.value)}
                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                required
              />
              {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="email" className="text-gray-900 dark:text-white">
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => setData("email", e.target.value)}
                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                required
              />
              {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="phone" className="text-gray-900 dark:text-white">
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={data.phone}
                onChange={(e) => setData("phone", e.target.value)}
                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                placeholder="+1 (555) 123-4567"
              />
              {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div>
              <Label htmlFor="dob" className="text-gray-900 dark:text-white">
                Date of Birth (MM/DD) *
              </Label>
              <Input
                id="dob"
                type="text"
                value={data.dob}
                onChange={(e) => setData("dob", e.target.value)}
                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                placeholder="MM/DD"
                pattern="^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$"
                required
              />
              {errors.dob && <p className="text-red-600 text-sm mt-1">{errors.dob}</p>}
            </div>

            <div>
              <Label htmlFor="religion" className="text-gray-900 dark:text-white">
                Major World Religions
              </Label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-2">
                Optional — choose the tradition that best describes you.
              </p>
              <Select
                value={data.religion ? data.religion : "__none__"}
                onValueChange={(v) => setData("religion", v === "__none__" ? "" : v)}
              >
                <SelectTrigger
                  id="religion"
                  className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                >
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Prefer not to say</SelectItem>
                  {religionOptions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.religion && <p className="text-red-600 text-sm mt-1">{errors.religion}</p>}
            </div>

            {/* Location Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city" className="text-gray-900 dark:text-white">
                  City *
                </Label>
                <Input
                  id="city"
                  value={data.city}
                  onChange={(e) => setData("city", e.target.value)}
                  className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  placeholder="City"
                  required
                />
                {errors.city && <p className="text-red-600 text-sm mt-1">{errors.city}</p>}
              </div>

              <div>
                <Label htmlFor="state" className="text-gray-900 dark:text-white">
                  State *
                </Label>
                <Input
                  id="state"
                  value={data.state}
                  onChange={(e) => setData("state", e.target.value.toUpperCase())}
                  className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  placeholder="State (e.g., CA)"
                  maxLength={2}
                  required
                />
                {errors.state && <p className="text-red-600 text-sm mt-1">{errors.state}</p>}
              </div>

              <div>
                <Label htmlFor="zipcode" className="text-gray-900 dark:text-white">
                  Zip Code
                </Label>
                <Input
                  id="zipcode"
                  value={data.zipcode}
                  onChange={(e) => setData("zipcode", e.target.value)}
                  className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  placeholder="Zip Code"
                  maxLength={10}
                />
                {errors.zipcode && <p className="text-red-600 text-sm mt-1">{errors.zipcode}</p>}
              </div>
            </div>

            {/* Supporter Positions */}
            <div>
              <Label className="text-gray-900 dark:text-white mb-2 block">
                Supporter Positions
              </Label>
              <MultiSelect
                options={positionOptions}
                selected={data.positions.map(String)}
                onChange={(selected) => setData('positions', selected.map(Number))}
                placeholder="Select your supporter role(s)"
              />
              {errors.positions && (
                <p className="text-red-600 text-sm mt-2">{errors.positions}</p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                You can select multiple roles (e.g., Doctor + Volunteer)
              </p>
            </div>

            {/* Supporters Interest — same chip + dropdown UX as organization Causes & Interest on /settings/profile */}
            <div className="space-y-2 min-w-0">
              <Label className="text-gray-900 dark:text-white text-sm font-medium">
                Supporters Interest
              </Label>
              {availableSupporterInterests.length === 0 ? (
                <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                    No categories are available yet. An administrator must add them under Admin → Org Primary
                    Action Categories, or run the database seeder.
                  </AlertDescription>
                </Alert>
              ) : (
                <div
                  role="group"
                  aria-label="Supporters interest"
                  className="flex min-h-10 w-full flex-wrap items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 ring-offset-background transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  {selectedSupporterInterestCategories.map((c) => (
                    <span
                      key={c.id}
                      className="tagify-tag inline-flex max-w-full items-center gap-0.5 rounded-md border border-white/25 bg-gradient-to-r from-purple-600 to-blue-600 px-1.5 py-0.5 text-[13px] leading-tight text-white shadow-sm"
                    >
                      <span className="truncate">{c.name}</span>
                      <button
                        type="button"
                        onClick={() => removeSupporterInterestTag(c.id)}
                        className="tagify-tag__removeBtn ml-0.5 inline-flex size-[14px] shrink-0 cursor-pointer items-center justify-center rounded-sm text-white/85 transition-colors hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                        aria-label={`Remove ${c.name}`}
                      >
                        <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                      </button>
                    </span>
                  ))}
                  {remainingSupporterInterestCategories.length > 0 ? (
                    <>
                      <label className="sr-only" htmlFor="supporter-interest-add">
                        Add cause or interest
                      </label>
                      <Select
                        key={data.supporter_interests.join(",")}
                        onValueChange={(v) => {
                          if (v) addSupporterInterestTag(Number(v))
                        }}
                      >
                        <SelectTrigger
                          id="supporter-interest-add"
                          className="tagify__input h-7 min-w-[7rem] flex-1 justify-start border-0 bg-transparent px-1 py-0.5 text-sm text-gray-600 shadow-none ring-0 ring-offset-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 data-[placeholder]:text-gray-500 dark:text-gray-300 dark:data-[placeholder]:text-gray-400 [&_svg]:hidden"
                        >
                          <SelectValue placeholder="Add category…" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 rounded-md border border-gray-300 bg-white text-gray-900 shadow-md dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                          {remainingSupporterInterestCategories.map((c) => (
                            <SelectItem
                              key={c.id}
                              value={String(c.id)}
                              className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                            >
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  ) : selectedSupporterInterestCategories.length > 0 ? (
                    <span className="px-1 text-xs text-gray-500 dark:text-gray-400">
                      All categories selected
                    </span>
                  ) : null}
                </div>
              )}
              {errors.supporter_interests && (
                <p className="text-red-600 text-sm mt-1">{errors.supporter_interests}</p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose all that apply — same causes as organization profiles (Housing, Food, Mental Health,
                Education, and more as admins add them).
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 3. Account Settings */}
          <Card className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/80">
            <CardHeader className="space-y-0 pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                <Shield className="h-4 w-4 shrink-0 text-blue-500" aria-hidden />
                3. Account Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pb-4 pt-0">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Account Visibility
                </p>
                <RadioGroup
                  value={data.account_visibility}
                  onValueChange={(v) => setData("account_visibility", v)}
                  className="!grid !gap-1.5"
                >
                  <label htmlFor="av-public" className="flex cursor-pointer gap-2.5 py-0.5">
                    <RadioGroupItem value="public" id="av-public" className="mt-0.5 shrink-0" />
                    <div className="min-w-0 leading-snug">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Public Account</span>
                      <span className="text-muted-foreground block text-xs">
                        Anyone can follow you and see your public content.
                      </span>
                    </div>
                  </label>
                  <label htmlFor="av-private" className="flex cursor-pointer gap-2.5 py-0.5">
                    <RadioGroupItem value="private" id="av-private" className="mt-0.5 shrink-0" />
                    <div className="min-w-0 leading-snug">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Private Account</span>
                      <span className="text-muted-foreground block text-xs">
                        You approve follow requests. Only approved followers can see your content.
                      </span>
                    </div>
                  </label>
                </RadioGroup>
                {errors.account_visibility && (
                  <p className="text-sm text-red-600">{errors.account_visibility}</p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Who can message me?
                </p>
                <RadioGroup
                  value={data.messaging_policy}
                  onValueChange={(v) => setData("messaging_policy", v)}
                  className="!grid !gap-1.5"
                >
                  <label htmlFor="msg-everyone" className="flex cursor-pointer gap-2.5 py-0.5">
                    <RadioGroupItem value="everyone" id="msg-everyone" className="mt-0.5 shrink-0" />
                    <div className="min-w-0 leading-snug">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Everyone</span>
                      <span className="text-muted-foreground block text-xs">Anyone on BIU can message you.</span>
                    </div>
                  </label>
                  <label htmlFor="msg-followers" className="flex cursor-pointer gap-2.5 py-0.5">
                    <RadioGroupItem value="followers_only" id="msg-followers" className="mt-0.5 shrink-0" />
                    <div className="min-w-0 leading-snug">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Followers Only</span>
                      <span className="text-muted-foreground block text-xs">
                        Only people who follow you can message you.
                      </span>
                    </div>
                  </label>
                  <label htmlFor="msg-orgs" className="flex cursor-pointer gap-2.5 py-0.5">
                    <RadioGroupItem value="organizations_i_follow" id="msg-orgs" className="mt-0.5 shrink-0" />
                    <div className="min-w-0 leading-snug">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Organizations I Follow
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        Only organizations you follow can message you.
                      </span>
                    </div>
                  </label>
                  <label htmlFor="msg-none" className="flex cursor-pointer gap-2.5 py-0.5">
                    <RadioGroupItem value="no_one" id="msg-none" className="mt-0.5 shrink-0" />
                    <div className="min-w-0 leading-snug">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">No One</span>
                      <span className="text-muted-foreground block text-xs">No one can message you.</span>
                    </div>
                  </label>
                </RadioGroup>
                {errors.messaging_policy && (
                  <p className="text-sm text-red-600">{errors.messaging_policy}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 4. Organization Affiliation */}
          <Card className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/80">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
                <Building2 className="h-5 w-5 shrink-0 text-blue-500" aria-hidden />
                4. Organization Affiliation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="primary_organization" className="text-gray-900 dark:text-gray-100">
                  Primary Organization *
                </Label>
                <ProfileOrganizationPicker
                  variant="primary"
                  triggerId="primary_organization"
                  primaryValue={
                    data.primary_organization_id === "" || data.primary_organization_id === undefined
                      ? "__none__"
                      : String(data.primary_organization_id)
                  }
                  selectedOrganization={primaryOrganizationDisplay ?? undefined}
                  onPrimaryChange={(value, org) => {
                    if (org) mergeOrg(org)
                    handlePrimaryOrganizationChange(value)
                  }}
                  placeholder="Select organization"
                  className="bg-white dark:bg-gray-700 dark:border-gray-600"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select the organization you primarily represent.
                </p>
                {errors.primary_organization_id && (
                  <p className="text-sm text-red-600">{errors.primary_organization_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-gray-900 dark:text-gray-100">Secondary Organizations</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select additional organizations you are affiliated with.
                </p>
                <div
                  role="group"
                  aria-label="Secondary organizations"
                  className="flex min-h-10 w-full flex-wrap items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
                >
                  {selectedSecondaryOrganizations.map((org) => (
                    <span
                      key={org.id}
                      className="inline-flex max-w-full items-center gap-1 rounded-md border border-white/20 bg-gradient-to-r from-purple-600 to-blue-600 px-2 py-0.5 text-[13px] text-white shadow-md shadow-purple-500/25"
                    >
                      <span className="truncate">{org.name}</span>
                      <button
                        type="button"
                        onClick={() => removeSecondaryOrganization(org.id)}
                        className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-white/90 hover:bg-white/20"
                        aria-label={`Remove ${org.name}`}
                      >
                        <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                      </button>
                    </span>
                  ))}
                  <label className="sr-only" htmlFor="secondary-org-add">
                    Add secondary organization
                  </label>
                  <ProfileOrganizationPicker
                    key={secondaryExcludeIds.join(",")}
                    variant="secondary-add"
                    triggerId="secondary-org-add"
                    excludeIds={secondaryExcludeIds}
                    compactTrigger
                    placeholder="Add organization…"
                    onSecondaryAdd={(org) => {
                      mergeOrg(org)
                      addSecondaryOrganization(org.id)
                    }}
                  />
                </div>
                {errors.secondary_organization_ids && (
                  <p className="text-sm text-red-600">{errors.secondary_organization_ids}</p>
                )}
              </div>

              <div className="rounded-lg border border-dashed border-blue-400/60 bg-blue-500/5 p-4 dark:border-blue-500/40 dark:bg-blue-950/20">
                <Link
                  href={route("organizations")}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Request to Join Organization
                </Link>
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  Can&apos;t find your organization? Browse organizations and connect from the directory.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preferences (Global Settings) — gradient on icon, title, and active theme only */}
        <Card className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 text-lg text-gray-900 dark:text-white">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md shadow-purple-500/20"
                aria-hidden
              >
                <Monitor className="h-4 w-4" />
              </span>
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-blue-400">
                Preferences (Global Settings)
              </span>
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              These settings apply across the entire BIU platform.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-900 dark:text-gray-100">Scene View (Theme)</Label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPreferredTheme("system")}
                  className={cn(
                    "inline-flex flex-1 min-w-[8rem] items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all sm:flex-none",
                    data.preferred_theme === "system"
                      ? "border-transparent bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md shadow-purple-500/25 hover:from-purple-700 hover:to-blue-700"
                      : "border-purple-200/80 bg-white/90 text-gray-800 hover:border-purple-300 hover:bg-purple-50/50 dark:border-purple-800/60 dark:bg-gray-900/60 dark:text-gray-100 dark:hover:border-purple-600 dark:hover:bg-purple-950/30",
                  )}
                >
                  <Monitor className="h-4 w-4" aria-hidden />
                  Auto (System)
                </button>
                <button
                  type="button"
                  onClick={() => setPreferredTheme("light")}
                  className={cn(
                    "inline-flex flex-1 min-w-[8rem] items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all sm:flex-none",
                    data.preferred_theme === "light"
                      ? "border-transparent bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md shadow-purple-500/25 hover:from-purple-700 hover:to-blue-700"
                      : "border-purple-200/80 bg-white/90 text-gray-800 hover:border-purple-300 hover:bg-purple-50/50 dark:border-purple-800/60 dark:bg-gray-900/60 dark:text-gray-100 dark:hover:border-purple-600 dark:hover:bg-purple-950/30",
                  )}
                >
                  <Sun className="h-4 w-4" aria-hidden />
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setPreferredTheme("dark")}
                  className={cn(
                    "inline-flex flex-1 min-w-[8rem] items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all sm:flex-none",
                    data.preferred_theme === "dark"
                      ? "border-transparent bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md shadow-purple-500/25 hover:from-purple-700 hover:to-blue-700"
                      : "border-purple-200/80 bg-white/90 text-gray-800 hover:border-purple-300 hover:bg-purple-50/50 dark:border-purple-800/60 dark:bg-gray-900/60 dark:text-gray-100 dark:hover:border-purple-600 dark:hover:bg-purple-950/30",
                  )}
                >
                  <Moon className="h-4 w-4" aria-hidden />
                  Dark
                </button>
              </div>
              {errors.preferred_theme && (
                <p className="mt-2 text-sm text-red-600">{errors.preferred_theme}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={processing}
            className="border-gray-300 dark:border-gray-600"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={processing}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {processing ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </ProfileLayout>
  )
}
