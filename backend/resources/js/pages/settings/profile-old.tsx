"use client"

import type React from "react"

import type { SharedData } from "@/types"
import { Transition } from "@headlessui/react"
import { router, useForm, usePage } from "@inertiajs/react"
import { type FormEventHandler, useState, useRef, useCallback } from "react"
import SettingsLayout from "@/layouts/settings/layout"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Textarea } from "@/components/frontend/ui/textarea"
import { Switch } from "@/components/frontend/ui/switch"
import { Alert, AlertDescription } from "@/components/frontend/ui/alert"
import { Separator } from "@/components/frontend/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/frontend/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import {
  Mail,
  Phone,
  MapPin,
  User,
  Globe,
  Calendar,
  Save,
  AlertCircle,
  CheckCircle,
  Camera,
  Upload,
  Trash2,
  RotateCcw,
  Check,
} from "lucide-react"
import InputError from "@/components/input-error"
import Cropper from "react-easy-crop"
import type { Area, Point } from "react-easy-crop/types"

type ProfileForm = {
  name: string
  email: string
  phone?: string
}

export default function ProfileEdit({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
  const { auth } = usePage<SharedData>().props

  // Profile photo upload states
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [photoError, setPhotoError] = useState<string>("")
  const [photoSuccess, setPhotoSuccess] = useState<string>("")
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState( auth.user.image)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, setData, patch, errors, processing, recentlySuccessful } = useForm<ProfileForm>({
    name: auth.user.name || "",
    email: auth.user.email || "",
    phone: auth.user.phone || "",
  })

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    patch(route("profile.update"), {
      preserveScroll: true,
        onSuccess: () => {
            //
        },
    })
  }

  // Photo upload functions
  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select a valid image file.")
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Image size must be less than 5MB.")
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setPhotoError("")
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }

  const handlePhotoUpload = async () => {
    if (!selectedFile || !croppedAreaPixels) return

    setIsUploading(true)
    setPhotoError("")

    try {
      const formData = new FormData()
      formData.append("photo", selectedFile)
      formData.append("x", croppedAreaPixels.x.toString())
      formData.append("y", croppedAreaPixels.y.toString())
      formData.append("width", croppedAreaPixels.width.toString())
      formData.append("height", croppedAreaPixels.height.toString())

      const response = await fetch("/profile/photo", {
        method: "POST",
        headers: {
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setPhotoSuccess(data.message)
        setCurrentPhotoUrl(data.photo_url)
        setTimeout(() => {
          setIsPhotoDialogOpen(false)
          resetPhotoState()
        }, 1500)
          router.reload();
      } else {
        setPhotoError(data.message || "Failed to upload photo")
      }
    } catch (error) {
      setPhotoError("Network error. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handlePhotoDelete = async () => {
    setIsUploading(true)
    setPhotoError("")

    try {
      const response = await fetch("/profile/photo", {
        method: "DELETE",
        headers: {
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
          "X-Requested-With": "XMLHttpRequest",
        },
      })

      const data = await response.json()

      if (data.success) {
        setPhotoSuccess(data.message)
        setCurrentPhotoUrl(data.photo_url)
        setTimeout(() => {
          setIsPhotoDialogOpen(false)
          resetPhotoState()
        }, 1500)
      } else {
        setPhotoError(data.message || "Failed to delete photo")
      }
    } catch (error) {
      setPhotoError("Network error. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const resetPhotoState = () => {
    setSelectedFile(null)
    setPreviewUrl("")
    setPhotoError("")
    setPhotoSuccess("")
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <SettingsLayout activeTab="profile">
      <div className="space-y-6">
        {/* Success Message */}
        <Transition
          show={recentlySuccessful}
          enter="transition ease-in-out"
          enterFrom="opacity-0"
          leave="transition ease-in-out"
          leaveTo="opacity-0"
        >
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              Profile updated successfully!
            </AlertDescription>
          </Alert>
        </Transition>

        {/* Email Verification Alert */}
        {mustVerifyEmail && auth.user.email_verified_at === null && (
          <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700 dark:text-yellow-400">
              Your email address is unverified. Please check your inbox for a verification link.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={submit} className="space-y-6">
          {/* Profile Photo Section */}
          <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <Camera className="h-5 w-5 text-purple-500" />
                Profile Photo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Current Avatar */}
                <div className="relative">
                  <Avatar className="w-24 h-24 border-4 border-gray-200 dark:border-gray-600 shadow-lg">
                    <AvatarImage src={currentPhotoUrl || "/placeholder.svg"} alt="Profile" />
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-2xl font-semibold">
                      {auth.user.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Upload Controls */}
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Update your profile photo</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Upload a new photo or remove your current one. Recommended size: 400x400px.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                          <Upload className="h-4 w-4" />
                          Upload New Photo
                        </Button>
                      </DialogTrigger>

                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Update Profile Photo</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                          {/* Error/Success Messages */}
                          {photoError && (
                            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                              <AlertDescription className="text-red-700 dark:text-red-400">
                                {photoError}
                              </AlertDescription>
                            </Alert>
                          )}

                          {photoSuccess && (
                            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                              <Check className="h-4 w-4 text-green-600" />
                              <AlertDescription className="text-green-700 dark:text-green-400">
                                {photoSuccess}
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* File Input */}
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                          />

                          {/* Image Cropper */}
                          {selectedFile && previewUrl ? (
                            <div className="space-y-4">
                              <div className="relative w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                                <Cropper
                                  image={previewUrl}
                                  crop={crop}
                                  zoom={zoom}
                                  aspect={1}
                                  onCropChange={setCrop}
                                  onCropComplete={onCropComplete}
                                  onZoomChange={setZoom}
                                  cropShape="round"
                                  showGrid={false}
                                />
                              </div>

                              {/* Zoom Control */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Zoom</label>
                                <input
                                  type="range"
                                  value={zoom}
                                  min={1}
                                  max={3}
                                  step={0.1}
                                  onChange={(e) => setZoom(Number(e.target.value))}
                                  className="w-full"
                                />
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-2">
                                <Button onClick={handlePhotoUpload} disabled={isUploading} className="flex-1">
                                  {isUploading ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="h-4 w-4 mr-2" />
                                      Upload Photo
                                    </>
                                  )}
                                </Button>
                                <Button onClick={resetPhotoState} variant="outline" disabled={isUploading}>
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            /* Upload Options */
                            <div className="space-y-4">
                              <Button
                                onClick={triggerFileInput}
                                variant="outline"
                                className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-transparent"
                                disabled={isUploading}
                              >
                                <div className="text-center">
                                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Click to upload a new photo
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">JPG, PNG up to 5MB</p>
                                </div>
                              </Button>

                              {/* Delete Option */}
                              {auth.user.profile_photo_path && (
                                <Button
                                  onClick={handlePhotoDelete}
                                  variant="destructive"
                                  className="w-full"
                                  disabled={isUploading}
                                >
                                  {isUploading ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                      Deleting...
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Remove Current Photo
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

                    {auth.user.profile_photo_path && (
                      <Button onClick={handlePhotoDelete} variant="destructive" size="sm" disabled={isUploading}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="name" className="text-gray-900 dark:text-white font-medium">
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={data.name}
                    onChange={(e) => setData("name", e.target.value)}
                    className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your full name"
                    required
                  />
                  <InputError message={errors.name} className="mt-1" />
                </div>
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-gray-900 dark:text-white font-medium">
                  Email Address *
                </Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={data.email}
                    onChange={(e) => setData("email", e.target.value)}
                    className="pl-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
                <InputError message={errors.email} className="mt-1" />
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone" className="text-gray-900 dark:text-white font-medium">
                  Phone Number
                </Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    value={data.phone}
                    onChange={(e) => setData("phone", e.target.value)}
                    className="pl-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <InputError message={errors.phone} className="mt-1" />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings
          <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-gray-900 dark:text-white">Privacy Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-gray-900 dark:text-white font-medium">Public Profile</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Allow others to see your profile information
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-gray-900 dark:text-white font-medium">Email Notifications</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Receive email updates about your account</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card> */}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2">
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </SettingsLayout>
  )
}
