"use client"

import type React from "react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Save, X, Upload, CheckCircle, AlertCircle } from "lucide-react"
import { useForm, usePage } from "@inertiajs/react"
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

interface User {
  id: number
  name: string
  email: string
  phone?: string
  dob?: string
  image?: string
  city?: string
  state?: string
  zipcode?: string
}

interface PageProps {
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
  }
  availablePositions: { id: number; name: string }[]
  availableSupporterInterests: { id: number; name: string }[]
}

export default function ProfileEdit() {
  const { user, availablePositions, availableSupporterInterests } = usePage<PageProps>().props

  const { data, setData, post, processing, errors, reset, recentlySuccessful } = useForm({
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
  })

  const [previewUrl, setPreviewUrl] = useState(user?.image || null)

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
    setPreviewUrl(user.image)
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
