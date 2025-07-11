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
  Image as ImageIcon,
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
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(auth.user.image)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cover photo upload states
  const [isCoverDialogOpen, setIsCoverDialogOpen] = useState(false)
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string>("")
  const [coverCrop, setCoverCrop] = useState<Point>({ x: 0, y: 0 })
  const [coverZoom, setCoverZoom] = useState(1)
  const [croppedCoverAreaPixels, setCroppedCoverAreaPixels] = useState<Area | null>(null)
  const [isCoverUploading, setIsCoverUploading] = useState(false)
  const [coverError, setCoverError] = useState<string>("")
  const [coverSuccess, setCoverSuccess] = useState<string>("")
  const [currentCoverUrl, setCurrentCoverUrl] = useState(auth.user.cover_img)
  const coverFileInputRef = useRef<HTMLInputElement>(null)

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

  const onCoverCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedCoverAreaPixels(croppedAreaPixels)
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

  const handleCoverFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setCoverError("Please select a valid image file.")
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setCoverError("Image size must be less than 5MB.")
      return
    }

    setSelectedCoverFile(file)
    setCoverPreviewUrl(URL.createObjectURL(file))
    setCoverError("")
    setCoverCrop({ x: 0, y: 0 })
    setCoverZoom(1)
  }

    // This helper turns crop data into a cropped image preview URL
const getCroppedImage = async (
    file: File,
    crop: { x: number; y: number; width: number; height: number }
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.src = URL.createObjectURL(file)

      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = crop.width
        canvas.height = crop.height
        const ctx = canvas.getContext("2d")
        if (!ctx) return reject("No canvas context")

        ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)
        canvas.toBlob((blob) => {
          if (!blob) return reject("Canvas blob is null")
          resolve(URL.createObjectURL(blob))
        }, "image/jpeg")
      }

      img.onerror = () => reject("Failed to load image")
    })
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

      router.post(route('profile.photo.store'), formData, {
          onSuccess: async () => {
              setPhotoSuccess("Profile photo updated successfully!")
              const previewUrl = await getCroppedImage(selectedFile, croppedAreaPixels)
                setCurrentPhotoUrl(previewUrl)
          setTimeout(() => {
            setIsPhotoDialogOpen(false)
            resetPhotoState()
            router.reload()
          }, 1500)
        },
        onError: (errors) => {
          setPhotoError(errors.photo || "Failed to upload photo")
        },
        preserveScroll: true,
      })
    } catch (error) {
      setPhotoError("Network error. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleCoverUpload = async () => {
    if (!selectedCoverFile || !croppedCoverAreaPixels) return

    setIsCoverUploading(true)
    setCoverError("")

    try {
      const formData = new FormData()
      formData.append("cover", selectedCoverFile)
      formData.append("x", croppedCoverAreaPixels.x.toString())
      formData.append("y", croppedCoverAreaPixels.y.toString())
      formData.append("width", croppedCoverAreaPixels.width.toString())
      formData.append("height", croppedCoverAreaPixels.height.toString())

      router.post(route('profile.cover'), formData, {
        onSuccess: async () => {
              setCoverSuccess("Cover photo updated successfully!")
              const previewUrl = await getCroppedImage(selectedCoverFile, croppedCoverAreaPixels)
              setCurrentCoverUrl(previewUrl)
          setTimeout(() => {
            setIsCoverDialogOpen(false)
            resetCoverState()
            router.reload()
          }, 1500)
        },
        onError: (errors) => {
          setCoverError(errors.cover || "Failed to upload cover photo")
        },
        preserveScroll: true,
      })
    } catch (error) {
      setCoverError("Network error. Please try again.")
    } finally {
      setIsCoverUploading(false)
    }
  }

  const handlePhotoDelete = async () => {
    setIsUploading(true)
    setPhotoError("")

    try {
      router.delete(route('profile.photo.destroy'), {
          onSuccess: (resp) => {
              console.log(resp);
              setPhotoSuccess("Profile photo removed successfully!")
              setCurrentPhotoUrl("");
          setTimeout(() => {
            setIsPhotoDialogOpen(false)
              resetPhotoState()
            router.reload()
          }, 1500)
        },
        onError: () => {
          setPhotoError("Failed to delete photo")
        },
        preserveScroll: true,
      })
    } catch (error) {
      setPhotoError("Network error. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleCoverDelete = async () => {
    setIsCoverUploading(true)
    setCoverError("")

    try {
      router.delete(route('profile.cover'), {
        onSuccess: () => {
          setCoverSuccess("Cover photo removed successfully!")
          setTimeout(() => {
            setIsCoverDialogOpen(false)
            resetCoverState()
            router.reload()
          }, 1500)
        },
        onError: () => {
          setCoverError("Failed to delete cover photo")
        },
        preserveScroll: true,
      })
    } catch (error) {
      setCoverError("Network error. Please try again.")
    } finally {
      setIsCoverUploading(false)
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

  const resetCoverState = () => {
    setSelectedCoverFile(null)
    setCoverPreviewUrl("")
    setCoverError("")
    setCoverSuccess("")
    setCoverCrop({ x: 0, y: 0 })
    setCoverZoom(1)
    setCroppedCoverAreaPixels(null)
    if (coverFileInputRef.current) {
      coverFileInputRef.current.value = ""
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const triggerCoverFileInput = () => {
    coverFileInputRef.current?.click()
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

        {auth.user.role === "organization" && (

          <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-blue-500" />
                Cover Photo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Current Cover Preview */}
                <div className="relative w-full h-40 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  {currentCoverUrl ? (
                    <img
                      src={currentCoverUrl}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No cover photo uploaded
                    </div>
                  )}
                </div>

                {/* Upload Controls */}
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Update your cover photo</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Upload a new cover photo. Recommended size: 1500x500px.
                  </p>

                  <div className="flex gap-3">
                    <Dialog open={isCoverDialogOpen} onOpenChange={setIsCoverDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                          <Upload className="h-4 w-4" />
                          Upload New Cover
                        </Button>
                      </DialogTrigger>

                      <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Update Cover Photo</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                          {/* Error/Success Messages */}
                          {coverError && (
                            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                              <AlertDescription className="text-red-700 dark:text-red-400">
                                {coverError}
                              </AlertDescription>
                            </Alert>
                          )}

                          {coverSuccess && (
                            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                              <Check className="h-4 w-4 text-green-600" />
                              <AlertDescription className="text-green-700 dark:text-green-400">
                                {coverSuccess}
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* File Input */}
                          <input
                            ref={coverFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleCoverFileSelect}
                            className="hidden"
                          />

                          {/* Image Cropper */}
                          {selectedCoverFile && coverPreviewUrl ? (
                            <div className="space-y-4">
                              <div className="relative w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                                <Cropper
                                  image={coverPreviewUrl}
                                  crop={coverCrop}
                                  zoom={coverZoom}
                                  aspect={3}
                                  onCropChange={setCoverCrop}
                                  onCropComplete={onCoverCropComplete}
                                  onZoomChange={setCoverZoom}
                                  cropShape="rect"
                                  showGrid={false}
                                />
                              </div>

                              {/* Zoom Control */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Zoom</label>
                                <input
                                  type="range"
                                  value={coverZoom}
                                  min={1}
                                  max={3}
                                  step={0.1}
                                  onChange={(e) => setCoverZoom(Number(e.target.value))}
                                  className="w-full"
                                />
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-2">
                                <Button onClick={handleCoverUpload} disabled={isCoverUploading} className="flex-1">
                                  {isCoverUploading ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="h-4 w-4 mr-2" />
                                      Upload Cover
                                    </>
                                  )}
                                </Button>
                                <Button onClick={resetCoverState} variant="outline" disabled={isCoverUploading}>
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            /* Upload Options */
                            <div className="space-y-4">
                              <Button
                                onClick={triggerCoverFileInput}
                                variant="outline"
                                className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-transparent"
                                disabled={isCoverUploading}
                              >
                                <div className="text-center">
                                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Click to upload a new cover photo
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">JPG, PNG up to 5MB</p>
                                </div>
                              </Button>

                              {/* Delete Option */}
                              {auth.user.cover_image && (
                                <Button
                                  onClick={handleCoverDelete}
                                  variant="destructive"
                                  className="w-full"
                                  disabled={isCoverUploading}
                                >
                                  {isCoverUploading ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                      Deleting...
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Remove Current Cover
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

                    {auth.user.cover_image && (
                      <Button onClick={handleCoverDelete} variant="destructive" size="sm" disabled={isCoverUploading}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
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
                              {auth.user.image && (
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

                    {/* {auth.user.image && (
                      <Button onClick={handlePhotoDelete} variant="destructive" size="sm" disabled={isUploading}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )} */}
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
