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
import WhatsAppButton from "@/components/frontend/WhatsAppButton"

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
  const { categories, errors: backendErrors } = usePage<PageProps & { errors?: Record<string, string | string[]> }>().props

  // Helper function to get error message for a field
  const getError = (fieldName: string): string | null => {
    if (!backendErrors) return null
    const error = backendErrors[fieldName]
    if (!error) return null
    return Array.isArray(error) ? error[0] : error
  }

  const [formData, setFormData] = useState({
    title: "",
    category_id: "",
    description: "",
    fullDescription: "",
    tags: [] as string[],
    images: [] as File[],
    faqs: [] as Array<{ question: string; answer: string }>,
    accepts_believe_points: false,
  })
  const [packages, setPackages] = useState<Package[]>([
    {
      id: 1,
      name: "Basic",
      price: null,
      deliveryTime: "3 days",
      description: "",
      features: [""],
    },
  ])
  const [newTag, setNewTag] = useState("")
  const [newFeature, setNewFeature] = useState<{ packageId: number; feature: string } | null>(null)

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
  const files = Array.from(e.target.files || []);

  const validFiles = files.filter((file) => {
    if (file.size > 3 * 1024 * 1024) {
      showErrorToast(`File "${file.name}" is too large (max 3MB)`);
      return false;
    }
    return true;
  });

  if (formData.images.length + validFiles.length > 3) {
    showErrorToast(`You can upload maximum 3 images in total`);
    return;
  }

  setFormData((prev) => ({
    ...prev,
    images: [...prev.images, ...validFiles],
  }));
};

  const handleRemoveImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    })
  }

const [imageErrors, setImageErrors] = useState<string[]>([]); // per-image errors

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()

            // Reset previous image-specific errors
      setImageErrors([]);

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

  if (formData.images.length > 3) {
    showErrorToast("You can upload maximum 3 images");
    return;
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
    formData.images.forEach((image, index) => {
        formDataToSubmit.append(`images[${index}]`, image); // ← better key format
    });

    // Append Believe Points acceptance
    formDataToSubmit.append('accepts_believe_points', formData.accepts_believe_points ? '1' : '0')

    // // Submit to backend
    // router.post('/service-hub', formDataToSubmit, {
    //   forceFormData: true,
    //   onSuccess: () => {
    //     showSuccessToast("Service created successfully!")
    //   },
    //   onError: (errors) => {
    //     // Field-level errors are displayed below each input field
    //     // Only show a general error if there's no specific field errors
    //     if (errors.message && !Object.keys(errors).some(key => key !== 'message')) {
    //       showErrorToast(errors.message)
    //     }
    //   },
    // })

      router.post('/service-hub', formDataToSubmit, {
            forceFormData: true,
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
            showSuccessToast("Service created successfully!");
            },
            onError: (errors: Record<string, string | string[]>) => {
            // Handle per-image errors from Laravel
            const newImageErrors: string[] = [];

            Object.keys(errors).forEach((key) => {
                if (key.startsWith('images.')) {
                const indexMatch = key.match(/images\.(\d+)/);
                if (indexMatch) {
                    const idx = parseInt(indexMatch[1], 10);
                    const errorMsg = Array.isArray(errors[key]) ? errors[key][0] : errors[key];
                    newImageErrors[idx] = errorMsg as string;
                }
                }
            });

            setImageErrors(newImageErrors);

            // Still show general toast if needed
            if (errors.images || errors.message) {
                showErrorToast(
                (Array.isArray(errors.images) ? errors.images[0] : errors.images) ||
                errors.message ||
                "Please check the form for errors"
                );
            }
            },
        });
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
                      className={`mt-2 w-full px-3 py-2 rounded-md border bg-background ${getError('category_id') ? 'border-red-500' : ''}`}
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
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
                    <Label htmlFor="description">
                      Short Description <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="A brief description of your service (appears in search results)"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={`mt-2 ${getError('description') ? 'border-red-500' : ''}`}
                      rows={3}
                    />
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
                      placeholder="Detailed description of what you offer, process, and what clients will receive"
                      value={formData.fullDescription}
                      onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
                      className={`mt-2 ${getError('full_description') ? 'border-red-500' : ''}`}
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
                    {getError('tags') && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {getError('tags')}
                      </p>
                    )}
                  </div>

                  {/* Believe Points Acceptance */}
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="accepts_believe_points"
                        checked={formData.accepts_believe_points}
                        onChange={(e) => setFormData({ ...formData, accepts_believe_points: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <Label htmlFor="accepts_believe_points" className="font-semibold cursor-pointer">
                          Accept Believe Points Payments
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Allow buyers to pay with Believe Points. You'll pay only 1% transaction fee instead of 3% for Stripe payments.
                        </p>
                        {formData.accepts_believe_points && (
                          <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm">
                            <p className="text-green-800 dark:text-green-200 font-medium">
                              ✓ Transaction fee discount: 1% (vs 3% for Stripe)
                            </p>
                          </div>
                        )}
                      </div>
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
                 <CardDescription>Upload up to 3 images showcasing your work</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* {formData.images.map((image, index) => (
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
                    ))} */}
                                      {formData.images.map((image, index) => (
                                        <div key={index} className="relative aspect-video group">
                                            <img
                                            src={URL.createObjectURL(image)}
                                            alt={`Service preview ${index + 1}`}
                                            className="w-full h-full object-cover rounded-lg border"
                                            />
                                            <button
                                            type="button"
                                            onClick={() => handleRemoveImage(index)}
                                            className="absolute top-2 right-2 p-1.5 bg-background/90 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                            >
                                            <X className="h-4 w-4" />
                                            </button>

                                            {/* ← Per image error */}
                                            {imageErrors[index] && (
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-1 text-center">
                                                {imageErrors[index]}
                                            </p>
                                            )}
                                        </div>
                                        ))}
                    {formData.images.length < 3 && (
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
                  {/* General images error (when not per-image specific) */}
                    {getError('images') && !imageErrors.some(Boolean) && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-3 text-center">
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
                            className={`mt-2 ${getError(`packages.${index}.name`) ? 'border-red-500' : ''}`}
                          />
                          {getError(`packages.${index}.name`) && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                              {getError(`packages.${index}.name`)}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label>
                            Price ($) <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            placeholder="Enter package price"
                            value={pkg.price}
                            onChange={(e) => handleUpdatePackage(pkg.id, "price", Number(e.target.value))}
                            className={`mt-2 ${getError(`packages.${index}.price`) ? 'border-red-500' : ''}`}
                          />
                          {getError(`packages.${index}.price`) && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                              {getError(`packages.${index}.price`)}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label>
                            Delivery Time <span className="text-red-500">*</span>
                          </Label>
                          <select
                            value={pkg.deliveryTime}
                            onChange={(e) => handleUpdatePackage(pkg.id, "deliveryTime", e.target.value)}
                            className={`mt-2 w-full px-3 py-2 rounded-md border bg-background ${getError(`packages.${index}.delivery_time`) ? 'border-red-500' : ''}`}
                          >
                            <option value="1 day">1 day</option>
                            <option value="2 days">2 days</option>
                            <option value="3 days">3 days</option>
                            <option value="5 days">5 days</option>
                            <option value="7 days">7 days</option>
                            <option value="14 days">14 days</option>
                          </select>
                          {getError(`packages.${index}.delivery_time`) && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                              {getError(`packages.${index}.delivery_time`)}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Input
                            placeholder="Brief description of this package"
                            value={pkg.description}
                            onChange={(e) => handleUpdatePackage(pkg.id, "description", e.target.value)}
                            className={`mt-2 ${getError(`packages.${index}.description`) ? 'border-red-500' : ''}`}
                          />
                          {getError(`packages.${index}.description`) && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                              {getError(`packages.${index}.description`)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label>Features</Label>
                        <div className="space-y-2 mt-2">
                          {pkg.features.map((feature, featureIndex) => (
                            <div key={featureIndex} className="flex gap-2">
                              <div className="flex-1">
                                <Input
                                  placeholder="Feature description"
                                  value={feature}
                                  onChange={(e) =>
                                    handleUpdateFeature(pkg.id, featureIndex, e.target.value)
                                  }
                                  className={getError(`packages.${index}.features.${featureIndex}`) ? 'border-red-500' : ''}
                                />
                                {getError(`packages.${index}.features.${featureIndex}`) && (
                                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                    {getError(`packages.${index}.features.${featureIndex}`)}
                                  </p>
                                )}
                              </div>
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

