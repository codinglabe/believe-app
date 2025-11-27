"use client"

import type React from "react"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { useState } from "react"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Save, X, Upload, CheckCircle, Calendar } from "lucide-react"
import { useForm, usePage } from "@inertiajs/react"
import { toast } from "sonner"
import { Transition } from "@headlessui/react"
import { Alert, AlertDescription } from "@/components/frontend/ui/alert"
import { MultiSelect } from "@/components/ui/multi-select"

interface User {
  id: number
  name: string
  email: string
  phone?: string
  dob?: string
  image?: string
}

interface PageProps {
  auth: { user: User }
  availablePositions: { id: number; name: string }[]
  user: {
    id: number
    name: string
    email: string
    phone?: string
    dob?: string
    image?: string
    positions: number[]
  }
}

export default function ProfileEdit() {
 const { user, availablePositions } = usePage<PageProps>().props

  const { data, setData, post, processing, errors, reset, recentlySuccessful } = useForm({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    dob: user.dob || "",
      image: null as File | null,
    positions: user.positions || [],
  })

  const [previewUrl, setPreviewUrl] = useState( user.image)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const formData = new FormData()
    formData.append("name", data.name)
    formData.append("email", data.email)
    formData.append("phone", data.phone)
    formData.append("dob", data.dob)
    if (data.image) {
      formData.append("image", data.image)
    }
    formData.append("_method", "PUT")

    post(route("user.profile.update"), {
        data: formData,
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => {
            console.log("Profile updated successfully");
        toast.success("Profile updated successfully!")
      },
      onError: () => {
        toast.error("Failed to update profile. Please try again.")
      },
    })
  }

  const handleCancel = () => {
    reset()
    setPreviewUrl(null)
    window.history.back()
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setData("image", file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

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
        {/* image Upload */}
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
                  <Input id="image" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">JPG, PNG or GIF. Max size 2MB.</p>
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

                      {/* Date of Birth */}
                                      <div>
                                      <Label htmlFor="dob" className="text-gray-900 dark:text-white font-medium">
                                          Date of Birth
                                      </Label>
                                      <div className="relative mt-1">
                                          <Input
                                          id="dob"
                                          type="date"
                                          value={data.dob}
                                          onChange={(e) => setData("dob", e.target.value)}
                                          className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                          max={new Date().toISOString().split('T')[0]} // Prevent future dates
                                          />
                          </div>
                          {errors.dob && <p className="text-red-600 text-sm mt-1">{errors.dob}</p>}
                      </div>


                      <MultiSelect
            options={availablePositions.map(p => ({
              label: p.name,
              value: p.id.toString()
            }))}
            selected={data.positions.map(String)}
            onChange={(selected) => setData('positions', selected.map(Number))}
            placeholder="Select your supporter role(s)"
          />
          {errors.positions && (
            <p className="text-red-600 text-sm mt-2">{errors.positions}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            You can select multiple roles (e.g., Doctor + Volunteer)
          </p>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={processing}
            className="bg-transparent"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4 mr-2" />
            {processing ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </ProfileLayout>
  )
}
