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
import { useState, useEffect } from "react"
import { Head } from "@inertiajs/react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface Category {
  id: number
  name: string
  slug: string
}

interface ExistingImage {
  id: number
  url: string
  path: string
}

interface PageProps extends Record<string, unknown> {
  gig: {
    id: number
    slug: string
    title: string
    category_id: number
    description: string
    fullDescription: string
    tags: string[]
    faqs: Array<{ question: string; answer: string }>
    images: ExistingImage[]
    packages: Array<{
      id?: number
      name: string
      price: number
      deliveryTime: string
      description: string
      features: string[]
    }>
  }
  categories: Category[]
}

interface Package {
  id?: number
  name: string
  price: number
  deliveryTime: string
  description: string
  features: string[]
}

export default function EditService() {
  const { gig, categories, errors: backendErrors } = usePage<PageProps & { errors?: Record<string, string | string[]> }>().props

  // Helper function to get error message for a field
  const getError = (fieldName: string): string | null => {
    if (!backendErrors) return null
    const error = backendErrors[fieldName]
    if (!error) return null
    return Array.isArray(error) ? error[0] : error
  }

  const [formData, setFormData] = useState({
    title: gig.title || "",
    category_id: gig.category_id?.toString() || "",
    description: gig.description || "",
    fullDescription: gig.fullDescription || "",
    tags: gig.tags || [],
    images: [] as File[],
    faqs: gig.faqs || [] as Array<{ question: string; answer: string }>,
  })
  const [existingImages, setExistingImages] = useState<ExistingImage[]>(gig.images || [])
  const [deletedImages, setDeletedImages] = useState<number[]>([])
  const [packages, setPackages] = useState<Package[]>(
    gig.packages && gig.packages.length > 0
      ? gig.packages.map((pkg) => ({
          id: pkg.id,
          name: pkg.name,
          price: pkg.price,
          deliveryTime: pkg.deliveryTime,
          description: pkg.description || "",
          features: pkg.features && pkg.features.length > 0 ? pkg.features : [""],
        }))
      : [
          {
            id: 1,
            name: "Basic",
            price: 0,
            deliveryTime: "3 days",
            description: "",
            features: [""],
          },
        ]
  )
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
    const newId = packages.length > 0 ? Math.max(...packages.map((p) => p.id || 0)) + 1 : 1
    setPackages([
      ...packages,
      {
        id: newId,
        name: "",
        price: 0,
        deliveryTime: "3 days",
        description: "",
        features: [""],
      },
    ])
  }

  const handleRemovePackage = (id: number | undefined) => {
    if (packages.length > 1) {
      setPackages(packages.filter((p) => p.id !== id))
    }
  }

  const handleUpdatePackage = (id: number | undefined, field: keyof Package, value: any) => {
    setPackages(
      packages.map((pkg) => (pkg.id === id ? { ...pkg, [field]: value } : pkg))
    )
  }

  const handleAddFeature = (packageId: number | undefined) => {
    setPackages(
      packages.map((pkg) =>
        pkg.id === packageId ? { ...pkg, features: [...pkg.features, ""] } : pkg
      )
    )
  }

  const handleRemoveFeature = (packageId: number | undefined, featureIndex: number) => {
    setPackages(
      packages.map((pkg) =>
        pkg.id === packageId
          ? { ...pkg, features: pkg.features.filter((_, i) => i !== featureIndex) }
          : pkg
      )
    )
  }

  const handleUpdateFeature = (
    packageId: number | undefined,
    featureIndex: number,
    value: string
  ) => {
    setPackages(
      packages.map((pkg) =>
        pkg.id === packageId
          ? {
              ...pkg,
              features: pkg.features.map((f, i) => (i === featureIndex ? value : f)),
            }
          : pkg
      )
    )
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const totalImages = existingImages.length + formData.images.length + files.length
    if (totalImages > 5) {
      showErrorToast("You can only upload up to 5 images")
      return
    }
    setFormData({
      ...formData,
      images: [...formData.images, ...files],
    })
  }

  const handleRemoveImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    })
  }

  const handleRemoveExistingImage = (imageId: number) => {
    setExistingImages(existingImages.filter((img) => img.id !== imageId))
    setDeletedImages([...deletedImages, imageId])
  }

  const handleAddFAQ = () => {
    setFormData({
      ...formData,
      faqs: [...formData.faqs, { question: "", answer: "" }],
    })
  }

  const handleRemoveFAQ = (index: number) => {
    setFormData({
      ...formData,
      faqs: formData.faqs.filter((_, i) => i !== index),
    })
  }

  const handleUpdateFAQ = (index: number, field: 'question' | 'answer', value: string) => {
    setFormData({
      ...formData,
      faqs: formData.faqs.map((faq, i) =>
        i === index ? { ...faq, [field]: value } : faq
      ),
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

    if (existingImages.length + formData.images.length === 0) {
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

    // Append FAQs
    formData.faqs.forEach((faq, index) => {
      if (faq.question.trim() && faq.answer.trim()) {
        formDataToSubmit.append(`faqs[${index}][question]`, faq.question)
        formDataToSubmit.append(`faqs[${index}][answer]`, faq.answer)
      }
    })

    // Append packages
    packages.forEach((pkg, index) => {
      if (pkg.id) {
        formDataToSubmit.append(`packages[${index}][id]`, pkg.id.toString())
      }
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

    // Append existing images
    existingImages.forEach((img) => {
      formDataToSubmit.append('existing_images[]', img.path)
    })

    // Append deleted images
    deletedImages.forEach((imgId) => {
      formDataToSubmit.append('deleted_images[]', imgId.toString())
    })

    // Append new images
    formData.images.forEach((image) => {
      formDataToSubmit.append('images[]', image)
    })

    // Submit to backend
    formDataToSubmit.append('_method', 'PUT')
    router.post(`/service-hub/${gig.slug}`, formDataToSubmit, {
      forceFormData: true,
      onSuccess: () => {
        showSuccessToast("Service updated successfully!")
      },
      onError: (errors) => {
        // Field-level errors are displayed below each input field
        // Only show a general error if there's no specific field errors
        if (errors.message && !Object.keys(errors).some(key => key !== 'message')) {
          showErrorToast(errors.message)
        }
      },
    })
  }

  return (
    <FrontendLayout>
      <Head title="Edit Service - Service Hub" />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href={`/service-hub/${gig.slug}`}>
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold">Edit Your Service</h1>
                  <p className="text-sm text-muted-foreground">Update your service details</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/service-hub/${gig.slug}`}>
                  <Button variant="outline">
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                </Link>
                <Button onClick={handleSubmit}>
                  <Save className="mr-2 h-4 w-4" />
                  Update Service
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Tell us about your service</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Service Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Professional Logo Design"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                    {getError('title') && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {getError('title')}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <select
                      id="category"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {getError('category_id') && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {getError('category_id')}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Short Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of your service (max 500 characters)"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      maxLength={500}
                      rows={3}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.description.length}/500 characters
                    </p>
                    {getError('description') && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {getError('description')}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="fullDescription">Full Description</Label>
                    <Textarea
                      id="fullDescription"
                      placeholder="Detailed description of your service..."
                      value={formData.fullDescription}
                      onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
                      rows={8}
                    />
                    {getError('full_description') && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {getError('full_description')}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Tags</Label>
                    <div className="flex gap-2 flex-wrap mb-2">
                      {formData.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="gap-2">
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a tag"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddTag()
                          }
                        }}
                      />
                      <Button type="button" onClick={handleAddTag}>
                        Add
                      </Button>
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
                  <CardDescription>Upload images showcasing your work (up to 5 images total)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Existing Images */}
                    {existingImages.map((image) => (
                      <div key={image.id} className="relative aspect-video group">
                        <img
                          src={image.url}
                          alt={`Service image ${image.id}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingImage(image.id)}
                          className="absolute top-2 right-2 p-1 bg-background/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {/* New Images */}
                    {formData.images.map((image, index) => (
                      <div key={`new-${index}`} className="relative aspect-video group">
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
                    {existingImages.length + formData.images.length < 5 && (
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
                  {getError('images') && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                      {getError('images')}
                    </p>
                  )}
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
                      key={pkg.id || index}
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
                          <Label>Package Name *</Label>
                          <Input
                            placeholder="e.g., Basic, Standard, Premium"
                            value={pkg.name}
                            onChange={(e) => handleUpdatePackage(pkg.id, 'name', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Price ($) *
                          </Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            value={pkg.price}
                            onChange={(e) => handleUpdatePackage(pkg.id, 'price', parseFloat(e.target.value) || 0)}
                            required
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Delivery Time *
                          </Label>
                          <Input
                            placeholder="e.g., 3 days, 1 week"
                            value={pkg.deliveryTime}
                            onChange={(e) => handleUpdatePackage(pkg.id, 'deliveryTime', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Package Description</Label>
                        <Textarea
                          placeholder="Describe what's included in this package..."
                          value={pkg.description}
                          onChange={(e) => handleUpdatePackage(pkg.id, 'description', e.target.value)}
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label>Features</Label>
                        <div className="space-y-2">
                          {pkg.features.map((feature, featureIndex) => (
                            <div key={featureIndex} className="flex gap-2">
                              <Input
                                placeholder={`Feature ${featureIndex + 1}`}
                                value={feature}
                                onChange={(e) => handleUpdateFeature(pkg.id, featureIndex, e.target.value)}
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
                          {getError(`packages.${index}.features`) && (
                            <p className="text-sm text-red-600 dark:text-red-400">
                              {getError(`packages.${index}.features`)}
                            </p>
                          )}
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

            {/* FAQs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        Frequently Asked Questions (FAQ)
                      </CardTitle>
                      <CardDescription>Add common questions and answers about your service</CardDescription>
                    </div>
                    <Button type="button" variant="outline" onClick={handleAddFAQ}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add FAQ
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.faqs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No FAQs added yet. Click "Add FAQ" to get started.
                    </p>
                  ) : (
                    formData.faqs.map((faq, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 border rounded-lg space-y-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold">FAQ {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFAQ(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <Label htmlFor={`faq-question-${index}`}>Question</Label>
                            <Input
                              id={`faq-question-${index}`}
                              placeholder="e.g., What is included in this service?"
                              value={faq.question}
                              onChange={(e) => handleUpdateFAQ(index, 'question', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`faq-answer-${index}`}>Answer</Label>
                            <Textarea
                              id={`faq-answer-${index}`}
                              placeholder="Provide a detailed answer..."
                              value={faq.answer}
                              onChange={(e) => handleUpdateFAQ(index, 'answer', e.target.value)}
                              rows={3}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
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
              <Link href={`/service-hub/${gig.slug}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Save className="mr-2 h-5 w-5" />
                Update Service
              </Button>
            </motion.div>
          </form>
        </div>
      </div>
    </FrontendLayout>
  )
}

