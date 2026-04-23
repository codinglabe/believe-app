"use client"

import type React from "react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import {
  Save,
  X,
  Upload,
  CheckCircle,
  AlertCircle,
  User,
  Briefcase,
  Shield,
  Building2,
  Monitor,
  Sun,
  Moon,
  Copy,
  Calendar,
  Info,
  Plus,
} from "lucide-react"
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
import {
  ProfileOrganizationPicker,
  type ProfileOrgOption,
} from "@/components/frontend/profile-organization-picker"
import { useAppearance, type Appearance } from "@/hooks/use-appearance"
import { cn } from "@/lib/utils"
import type { SharedData } from "@/types"

interface AffiliatedOrg {
  id: number
  name: string
  logo_url?: string | null
}

type OrgRow = ProfileOrgOption

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
    primary_organization_id?: number | null
    secondary_organization_ids?: number[]
    unity_meeting_id?: string
    account_visibility?: "public" | "private"
    messaging_policy?: "everyone" | "followers_only" | "organizations_i_follow" | "no_one"
    preferred_theme?: Appearance | null
  }
  availablePositions: { id: number; name: string }[]
  availableSupporterInterests: { id: number; name: string }[]
  affiliatedOrganizations: AffiliatedOrg[]
  religionOptions: string[]
  organizations: OrgRow[]
  organizationPicker?: {
    target: "primary" | "secondary"
    items: OrgRow[]
    has_more: boolean
    page: number
    search: string
  } | null
}

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
    _supporter_interests_touched: true,
    city: user?.city || "",
    state: user?.state || "",
    zipcode: user?.zipcode || "",
    religion: user?.religion || "",
    account_visibility: (user?.account_visibility === "private" ? "private" : "public") as "public" | "private",
    messaging_policy: (user?.messaging_policy ?? "everyone") as ProfileEditPageProps["user"]["messaging_policy"],
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
  const [copiedUnity, setCopiedUnity] = useState(false)
  const [orgCache, setOrgCache] = useState<Record<number, OrgRow>>({})

  useEffect(() => {
    if (!user) return
    setData("name", user.name || "")
    setData("email", user.email || "")
    setData("phone", user.phone || "")
    setData("dob", user.dob || "")
    setData("city", user.city || "")
    setData("state", user.state || "")
    setData("zipcode", user.zipcode || "")
    setData("religion", user.religion || "")
    setData("account_visibility", user.account_visibility === "private" ? "private" : "public")
    setData("messaging_policy", (user.messaging_policy ?? "everyone") as ProfileEditPageProps["user"]["messaging_policy"])
    setData("primary_organization_id", user.primary_organization_id ?? "")
    setData("secondary_organization_ids", user.secondary_organization_ids ?? [])
    setData("preferred_theme", (user.preferred_theme as Appearance) || "system")
    setData("positions", user.positions || [])
    setData("supporter_interests", user.supporter_interests || [])
    if (user.image) {
      setPreviewUrl(user.image)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync form when loaded user identity changes, not on every prop churn
  }, [user?.id])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route("user.profile.update"), {
      preserveScroll: true,
      onSuccess: () => {
        updateAppearance(data.preferred_theme)
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
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const copyUnityId = async () => {
    const id = user?.unity_meeting_id ?? ""
    if (!id) return
    try {
      await navigator.clipboard.writeText(id)
      setCopiedUnity(true)
      toast.success("Unity Meeting ID copied")
      setTimeout(() => setCopiedUnity(false), 2000)
    } catch {
      toast.error("Could not copy to clipboard")
    }
  }

  const positionOptions = availablePositions.map((position) => ({
    label: position.name,
    value: position.id.toString(),
  }))

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
    () => resolvedOrganizations.filter((o) => data.secondary_organization_ids.includes(o.id)),
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

  const selectedSupporterInterestCategories = useMemo(
    () => availableSupporterInterests.filter((c) => data.supporter_interests.includes(c.id)),
    [availableSupporterInterests, data.supporter_interests],
  )

  const remainingSupporterInterestCategories = useMemo(
    () => availableSupporterInterests.filter((c) => !data.supporter_interests.includes(c.id)),
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

  const sectionTitle = (icon: React.ReactNode, n: number, title: string) => (
    <CardTitle className="flex items-center gap-2 text-lg text-slate-100">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
        {icon}
      </span>
      <span>
        <span className="text-indigo-300">{n}.</span> {title}
      </span>
    </CardTitle>
  )

  const cardClass = "border-indigo-500/30 bg-slate-900/70 text-slate-100"

  return (
    <ProfileLayout
      title="Profile Settings"
      description="Manage your personal information, account settings, and organization affiliations."
    >
      <Transition
        show={recentlySuccessful}
        enter="transition ease-in-out"
        enterFrom="opacity-0"
        leave="transition ease-in-out"
        leaveTo="opacity-0"
      >
        <Alert className="mb-2 border-green-800 bg-green-950/80 dark:border-green-800">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-200">Profile updated successfully!</AlertDescription>
        </Alert>
      </Transition>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-indigo-500/20 bg-slate-950/60 p-4 md:p-6"
      >
        {/* 1. Personal Information */}
        <Card className={cardClass}>
          <CardHeader className="pb-4">{sectionTitle(<User className="h-5 w-5" />, 1, "Personal Information")}</CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative shrink-0">
                <img
                  src={previewUrl || "/placeholder.svg?height=80&width=80"}
                  alt="Profile"
                  className="h-20 w-20 rounded-full border-2 border-indigo-400/40 object-cover"
                />
              </div>
              <div>
                <Label htmlFor="image" className="cursor-pointer text-slate-200">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                    <Upload className="h-4 w-4" />
                    Upload photo
                  </div>
                  <Input id="image" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </Label>
                <p className="mt-2 text-sm text-slate-400">JPG, PNG or GIF. Max 2MB.</p>
                {errors.image && <p className="mt-1 text-sm text-red-400">{errors.image}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="name" className="text-slate-200">
                  Full Name *
                </Label>
                <Input
                  id="name"
                  value={data.name}
                  onChange={(e) => setData("name", e.target.value)}
                  className="mt-1 border-slate-600 bg-slate-800 text-slate-100"
                  required
                />
                {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="email" className="text-slate-200">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={data.email}
                  onChange={(e) => setData("email", e.target.value)}
                  className="mt-1 border-slate-600 bg-slate-800 text-slate-100"
                  required
                />
                {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
              </div>
              <div>
                <Label htmlFor="phone" className="text-slate-200">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={data.phone}
                  onChange={(e) => setData("phone", e.target.value)}
                  className="mt-1 border-slate-600 bg-slate-800 text-slate-100"
                  placeholder="+1 (555) 123-4567"
                />
                {errors.phone && <p className="mt-1 text-sm text-red-400">{errors.phone}</p>}
              </div>
              <div>
                <Label htmlFor="dob" className="text-slate-200">
                  Date of Birth (MM/DD) *
                </Label>
                <div className="relative mt-1">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="dob"
                    type="text"
                    value={data.dob}
                    onChange={(e) => setData("dob", e.target.value)}
                    className="border-slate-600 bg-slate-800 pl-10 text-slate-100"
                    placeholder="MM/DD"
                    pattern="^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$"
                    required
                  />
                </div>
                {errors.dob && <p className="mt-1 text-sm text-red-400">{errors.dob}</p>}
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="religion" className="text-slate-200">
                  Major World Religions (Optional)
                </Label>
                <p className="mb-2 mt-1 text-sm text-slate-400">Optional — choose the tradition that best describes you.</p>
                <Select
                  value={data.religion ? data.religion : "__none__"}
                  onValueChange={(v) => setData("religion", v === "__none__" ? "" : v)}
                >
                  <SelectTrigger id="religion" className="border-slate-600 bg-slate-800 text-slate-100">
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
                {errors.religion && <p className="mt-1 text-sm text-red-400">{errors.religion}</p>}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="city" className="text-slate-200">
                  City *
                </Label>
                <Input
                  id="city"
                  value={data.city}
                  onChange={(e) => setData("city", e.target.value)}
                  className="mt-1 border-slate-600 bg-slate-800 text-slate-100"
                  required
                />
                {errors.city && <p className="mt-1 text-sm text-red-400">{errors.city}</p>}
              </div>
              <div>
                <Label htmlFor="state" className="text-slate-200">
                  State *
                </Label>
                <Input
                  id="state"
                  value={data.state}
                  onChange={(e) => setData("state", e.target.value.toUpperCase())}
                  className="mt-1 border-slate-600 bg-slate-800 text-slate-100"
                  maxLength={2}
                  required
                />
                {errors.state && <p className="mt-1 text-sm text-red-400">{errors.state}</p>}
              </div>
              <div>
                <Label htmlFor="zipcode" className="text-slate-200">
                  Zip Code *
                </Label>
                <Input
                  id="zipcode"
                  value={data.zipcode}
                  onChange={(e) => setData("zipcode", e.target.value)}
                  className="mt-1 border-slate-600 bg-slate-800 text-slate-100"
                  maxLength={10}
                  required
                />
                {errors.zipcode && <p className="mt-1 text-sm text-red-400">{errors.zipcode}</p>}
              </div>
            </div>

            <div className="rounded-lg border border-indigo-500/25 bg-slate-800/50 p-4">
              <div className="mb-2 flex items-center gap-2 text-slate-200">
                <Info className="h-4 w-4 text-indigo-300" />
                <span className="font-medium">Unity Meeting ID</span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  readOnly
                  value={user?.unity_meeting_id ?? ""}
                  className="font-mono text-sm border-slate-600 bg-slate-900 text-slate-200 sm:flex-1"
                />
                <Button type="button" variant="secondary" className="shrink-0" onClick={copyUnityId}>
                  {copiedUnity ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Your unique identity for Unity Meet (video meetings and events).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Roles & Interests */}
        <Card className={cardClass}>
          <CardHeader className="pb-4">{sectionTitle(<Briefcase className="h-5 w-5" />, 2, "Roles & Interests")}</CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-2 block text-slate-200">Supporter Positions</Label>
              <MultiSelect
                options={positionOptions}
                selected={data.positions.map(String)}
                onChange={(selected) => setData("positions", selected.map(Number))}
                placeholder="Select your supporter role(s)"
              />
              {errors.positions && <p className="mt-2 text-sm text-red-400">{errors.positions}</p>}
              <p className="mt-2 text-sm text-slate-400">You can select multiple roles (e.g., Doctor + Volunteer)</p>
            </div>

            <div className="min-w-0 space-y-2">
              <Label className="text-sm font-medium text-slate-200">Supporters Interest</Label>
              {availableSupporterInterests.length === 0 ? (
                <Alert className="border-amber-800 bg-amber-950/50">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-sm text-amber-100">
                    No categories are available yet. An administrator must add them under Admin → Org Primary Action
                    Categories, or run the database seeder.
                  </AlertDescription>
                </Alert>
              ) : (
                <div
                  role="group"
                  aria-label="Supporters interest"
                  className="flex min-h-10 w-full flex-wrap items-center gap-1 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
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
                        className="tagify-tag__removeBtn ml-0.5 inline-flex size-[14px] shrink-0 cursor-pointer items-center justify-center rounded-sm text-white/85 hover:bg-white/20"
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
                          className="tagify__input h-7 min-w-[7rem] flex-1 justify-start border-0 bg-transparent px-1 py-0.5 text-sm text-slate-400 shadow-none [&_svg]:hidden"
                        >
                          <SelectValue placeholder="Add category…" />
                        </SelectTrigger>
                        <SelectContent>
                          {remainingSupporterInterestCategories.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  ) : selectedSupporterInterestCategories.length > 0 ? (
                    <span className="px-1 text-xs text-slate-400">All categories selected</span>
                  ) : null}
                </div>
              )}
              {errors.supporter_interests && (
                <p className="text-sm text-red-400">{errors.supporter_interests}</p>
              )}
              <p className="text-sm text-slate-400">
                Choose all that apply — same causes as organization profiles (Housing, Food, Mental Health, Education,
                and more as admins add them).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 3 & 4 */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className={cardClass}>
            <CardHeader className="pb-4">{sectionTitle(<Shield className="h-5 w-5" />, 3, "Account Settings")}</CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-slate-200">Account Visibility</Label>
                <RadioGroup
                  value={data.account_visibility}
                  onValueChange={(v) => setData("account_visibility", v as "public" | "private")}
                  className="space-y-3"
                >
                  <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-600/80 bg-slate-800/40 p-3 hover:border-indigo-500/40">
                    <RadioGroupItem value="public" id="vis-public" className="mt-1" />
                    <div>
                      <div className="font-medium text-slate-100">Public Account</div>
                      <p className="text-sm text-slate-400">Anyone can follow you and see your public content.</p>
                    </div>
                  </label>
                  <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-600/80 bg-slate-800/40 p-3 hover:border-indigo-500/40">
                    <RadioGroupItem value="private" id="vis-private" className="mt-1" />
                    <div>
                      <div className="font-medium text-slate-100">Private Account</div>
                      <p className="text-sm text-slate-400">
                        You approve follow requests. Only approved followers can see your content.
                      </p>
                    </div>
                  </label>
                </RadioGroup>
                {errors.account_visibility && (
                  <p className="text-sm text-red-400">{errors.account_visibility}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-slate-200">Who can message me?</Label>
                <RadioGroup
                  value={data.messaging_policy ?? "everyone"}
                  onValueChange={(v) =>
                    setData(
                      "messaging_policy",
                      v as "everyone" | "followers_only" | "organizations_i_follow" | "no_one",
                    )
                  }
                  className="space-y-3"
                >
                  {(
                    [
                      ["everyone", "Everyone", "Anyone on BIU can message you."],
                      ["followers_only", "Followers Only", "Only people who follow you can message you."],
                      [
                        "organizations_i_follow",
                        "Organizations I Follow",
                        "Only organizations you follow can message you.",
                      ],
                      ["no_one", "No One", "No one can message you."],
                    ] as const
                  ).map(([value, title, help]) => (
                    <label
                      key={value}
                      className="flex cursor-pointer gap-3 rounded-lg border border-slate-600/80 bg-slate-800/40 p-3 hover:border-indigo-500/40"
                    >
                      <RadioGroupItem value={value} id={`msg-${value}`} className="mt-1" />
                      <div>
                        <div className="font-medium text-slate-100">{title}</div>
                        <p className="text-sm text-slate-400">{help}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
                {errors.messaging_policy && <p className="text-sm text-red-400">{errors.messaging_policy}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardHeader className="pb-4">{sectionTitle(<Building2 className="h-5 w-5" />, 4, "Organization Affiliation")}</CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="primary_organization" className="text-slate-200">
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
                  className="border-slate-600 bg-slate-800 text-slate-100"
                />
                <p className="text-sm text-slate-400">Select the organization you primarily represent.</p>
                {errors.primary_organization_id && (
                  <p className="text-sm text-red-400">{errors.primary_organization_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Secondary Organizations</Label>
                <p className="text-sm text-slate-400">Select additional organizations you are affiliated with.</p>
                <div
                  role="group"
                  aria-label="Secondary organizations"
                  className="flex min-h-10 w-full flex-wrap items-center gap-1 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
                >
                  {selectedSecondaryOrganizations.map((org) => (
                    <span
                      key={org.id}
                      className="inline-flex max-w-full items-center gap-1 rounded-md border border-white/20 bg-gradient-to-r from-purple-600 to-blue-600 px-2 py-0.5 text-[13px] text-white shadow-md"
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
                  <p className="text-sm text-red-400">{errors.secondary_organization_ids}</p>
                )}
              </div>

              <div className="rounded-lg border border-dashed border-indigo-400/40 bg-slate-800/30 p-4 text-center">
                <Link
                  href={route("organizations")}
                  className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Request to Join Organization
                </Link>
                <p className="mt-2 text-xs text-slate-500">
                  Can&apos;t find your organization? Browse organizations and connect from the directory.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 5. Preferences */}
        <Card className={cardClass}>
          <CardHeader className="pb-4">
            {sectionTitle(<Monitor className="h-5 w-5" />, 5, "Preferences (Global Settings)")}
          </CardHeader>
          <CardContent className="space-y-3">
            <Label className="text-slate-200">Scene View (Theme)</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {(
                [
                  ["system", <Monitor key="ic-sys" className="h-4 w-4" aria-hidden />, "Auto (System)"],
                  ["light", <Sun key="ic-light" className="h-4 w-4" aria-hidden />, "Light"],
                  ["dark", <Moon key="ic-dark" className="h-4 w-4" aria-hidden />, "Dark"],
                ] as const
              ).map(([mode, icon, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPreferredTheme(mode)}
                  className={cn(
                    "inline-flex min-w-[8rem] flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all sm:flex-none",
                    data.preferred_theme === mode
                      ? "border-transparent bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md"
                      : "border-slate-600 bg-slate-800/80 text-slate-200 hover:border-indigo-500/40 hover:bg-slate-800",
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-400">These settings apply across the entire BIU platform.</p>
            {errors.preferred_theme && <p className="text-sm text-red-400">{errors.preferred_theme}</p>}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={processing}
            className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" disabled={processing} className="bg-blue-600 text-white hover:bg-blue-700">
            <Save className="mr-2 h-4 w-4" />
            {processing ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </ProfileLayout>
  )
}
