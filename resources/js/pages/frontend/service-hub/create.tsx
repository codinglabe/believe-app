"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Textarea } from "@/components/frontend/ui/textarea"
import { Label } from "@/components/frontend/ui/label"
import { Badge } from "@/components/frontend/ui/badge"
import {
  ArrowLeft,
  Upload,
  X,
  Plus,
  Sparkles,
  Save,
  Eye,
  DollarSign,
  Clock,
  Package,
  Check,
} from "lucide-react"
import { Link, router, usePage } from "@inertiajs/react"
import { useState } from "react"
import { Head } from "@inertiajs/react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface Category {
  id: number
  name: string
  slug: string
}

interface PageProps extends Record<string, unknown> {
  categories: Category[]
}

interface Package {
  id: number
  name: string
  price: number
  deliveryTime: string
  description: string
  features: string[]
}

export default function CreateService() {
  const { categories } = usePage<PageProps>().props

  const [formData, setFormData] = useState({
    title: "",
    category_id: "",
    description: "",
    fullDescription: "",
    tags: [] as string[],
    images: [] as File[],
  })
  const [packages, setPackages] = useState<Package[]>([
    {
      id: 1,
      name: "Basic",
      price: 0,
      deliveryTime: "3 days",
      description: "",
      features: [""],
    },
  ])
  const [newTag, setNewTag] = useState("")
  const [newFeature, setNewFeature] = useState<{ packageId: number; feature: string } | null>(null)

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      })
      setNewTag("")
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    })
  }

  const handleAddPackage = () => {
    setPackages([
      ...packages,
      {
        id: packages.length + 1,
        name: "",
        price: 0,
        deliveryTime: "3 days",
        description: "",
        features: [""],
      },
    ])
  }

  const handleRemovePackage = (id: number) => {
    if (packages.length > 1) {
      setPackages(packages.filter((p) => p.id !== id))
    }
  }

  const handleUpdatePackage = (id: number, field: keyof Package, value: any) => {
    setPackages(
      packages.map((pkg) => (pkg.id === id ? { ...pkg, [field]: value } : pkg))
    )
  }

  const handleAddFeature = (packageId: number) => {
    setPackages(
      packages.map((pkg) =>
        pkg.id === packageId
          ? { ...pkg, features: [...pkg.features, ""] }
          : pkg
      )
    )
  }

  const handleUpdateFeature = (packageId: number, index: number, value: string) => {
    setPackages(
      packages.map((pkg) =>
        pkg.id === packageId
          ? {
              ...pkg,
              features: pkg.features.map((f, i) => (i === index ? value : f)),
            }
          : pkg
      )
    )
  }

  const handleRemoveFeature = (packageId: number, index: number) => {
    setPackages(
      packages.map((pkg) =>
        pkg.id === packageId
          ? { ...pkg, features: pkg.features.filter((_, i) => i !== index) }
          : pkg
      )
    )
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newImages = Array.from(files)
      setFormData({
        ...formData,
        images: [...formData.images, ...newImages],
      })
    }
  }

  const handleRemoveImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Validate form
    if (!formData.title || !formData.category_id || !formData.description) {
      showErrorToast("Please fill in all required fields")
      return
    }

    if (packages.some((pkg) => !pkg.name || pkg.price <= 0)) {
      showErrorToast("Please complete all package information")
      return
    }

    if (formData.images.length === 0) {
      showErrorToast("Please upload at least one image")
      return
    }

    // Prepare FormData for submission
    const formDataToSubmit = new FormData()

    // Append basic fields
    formDataToSubmit.append('title', formData.title)
    formDataToSubmit.append('category_id', formData.category_id)
    formDataToSubmit.append('description', formData.description)
    if (formData.fullDescription) {
      formDataToSubmit.append('full_description', formData.fullDescription)
    }

    // Append tags
    formData.tags.forEach((tag) => {
      formDataToSubmit.append('tags[]', tag)
    })

    // Append packages
    packages.forEach((pkg, index) => {
      formDataToSubmit.append(`packages[${index}][name]`, pkg.name)
      formDataToSubmit.append(`packages[${index}][price]`, pkg.price.toString())
      formDataToSubmit.append(`packages[${index}][delivery_time]`, pkg.deliveryTime)
      if (pkg.description) {
        formDataToSubmit.append(`packages[${index}][description]`, pkg.description)
      }

      // Append features (filter out empty strings)
      const validFeatures = pkg.features.filter(f => f.trim() !== '')
      validFeatures.forEach((feature, featureIndex) => {
        formDataToSubmit.append(`packages[${index}][features][${featureIndex}]`, feature)
      })
    })

    // Append images
    formData.images.forEach((image) => {
      formDataToSubmit.append('images[]', image)
    })

    // Submit to backend
    router.post('/service-hub', formDataToSubmit, {
      forceFormData: true,
      onSuccess: () => {
        showSuccessToast("Service created successfully!")
      },
      onError: (errors) => {
        if (errors.message) {
          showErrorToast(errors.message)
        } else {
          showErrorToast("Failed to create service. Please check all fields.")
        }
      },
    })
  }

  return (
    <FrontendLayout>
      <Head title="Create Service - Service Hub" />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/service-hub">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold">Create Your Service</h1>
                  <p className="text-sm text-muted-foreground">Share your skills and start earning</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => router.visit("/service-hub")}>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
                <Button onClick={handleSubmit}>
                  <Save className="mr-2 h-4 w-4" />
                  Publish Service
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
            {/* Basic Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                  <CardDescription>Tell us about your service</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="title">
                      Service Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g., Professional Logo Design"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="category_id">
                      Category <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="category_id"
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="mt-2 w-full px-3 py-2 rounded-md border bg-background"
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="description">
                      Short Description <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="A brief description of your service (appears in search results)"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="mt-2"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="fullDescription">Full Description</Label>
                    <Textarea
                      id="fullDescription"
                      placeholder="Detailed description of what you offer, process, and what clients will receive"
                      value={formData.fullDescription}
                      onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
                      className="mt-2"
                      rows={8}
                    />
                  </div>

                  <div>
                    <Label>Tags</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Add a tag"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                      />
                      <Button type="button" onClick={handleAddTag}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-2">
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Images */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Service Images</CardTitle>
                  <CardDescription>Upload images showcasing your work (up to 5 images)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative aspect-video group">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Service image ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-2 right-2 p-1 bg-background/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {formData.images.length < 5 && (
                      <label className="aspect-video border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                        <div className="text-center">
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Upload Image</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          multiple
                        />
                      </label>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Packages */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Service Packages
                      </CardTitle>
                      <CardDescription>Create different pricing tiers for your service</CardDescription>
                    </div>
                    <Button type="button" variant="outline" onClick={handleAddPackage}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Package
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {packages.map((pkg, index) => (
                    <motion.div
                      key={pkg.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-6 border-2 rounded-lg space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Package {index + 1}</h3>
                        {packages.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemovePackage(pkg.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>
                            Package Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            placeholder="e.g., Basic, Standard, Premium"
                            value={pkg.name}
                            onChange={(e) => handleUpdatePackage(pkg.id, "name", e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label>
                            Price ($) <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={pkg.price}
                            onChange={(e) => handleUpdatePackage(pkg.id, "price", Number(e.target.value))}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label>
                            Delivery Time <span className="text-red-500">*</span>
                          </Label>
                          <select
                            value={pkg.deliveryTime}
                            onChange={(e) => handleUpdatePackage(pkg.id, "deliveryTime", e.target.value)}
                            className="mt-2 w-full px-3 py-2 rounded-md border bg-background"
                          >
                            <option value="1 day">1 day</option>
                            <option value="2 days">2 days</option>
                            <option value="3 days">3 days</option>
                            <option value="5 days">5 days</option>
                            <option value="7 days">7 days</option>
                            <option value="14 days">14 days</option>
                          </select>
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Input
                            placeholder="Brief description of this package"
                            value={pkg.description}
                            onChange={(e) => handleUpdatePackage(pkg.id, "description", e.target.value)}
                            className="mt-2"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Features</Label>
                        <div className="space-y-2 mt-2">
                          {pkg.features.map((feature, featureIndex) => (
                            <div key={featureIndex} className="flex gap-2">
                              <Input
                                placeholder="Feature description"
                                value={feature}
                                onChange={(e) =>
                                  handleUpdateFeature(pkg.id, featureIndex, e.target.value)
                                }
                              />
                              {pkg.features.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveFeature(pkg.id, featureIndex)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddFeature(pkg.id)}
                            className="w-full"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Feature
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Submit */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex justify-end gap-4"
            >
              <Link href="/service-hub">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Save className="mr-2 h-5 w-5" />
                Publish Service
              </Button>
            </motion.div>
          </form>
        </div>
      </div>
    </FrontendLayout>
  )
}

