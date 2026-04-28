"use client"

import React, { useEffect, useRef, useState } from "react"
import { Head, Link, router, useForm, usePage } from "@inertiajs/react"
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from "@/components/merchant-ui"
import { MerchantButton } from "@/components/merchant-ui"
import { MerchantInput } from "@/components/merchant-ui"
import { MerchantLabel } from "@/components/merchant-ui"
import { MerchantTextarea } from "@/components/merchant-ui"
import { MerchantDashboardLayout } from "@/components/merchant"
import { ArrowLeft, Upload, X } from "lucide-react"
import { motion } from "framer-motion"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface ProductRow {
  id: number
  name: string
  description: string | null
  category_id?: number | null
  category?: string | null
  base_price: string | number
  cost: string | number | null
  inventory_quantity: number | null
  product_type: string
  images?: string[] | null
  fulfillment_shipping_by: string
  digital_delivery_notes: string | null
  nonprofit_marketplace_enabled: boolean
  pct_nonprofit: string | number | null
  pct_merchant: string | number | null
  min_resale_price: string | number | null
  suggested_retail_price: string | number | null
  nonprofit_approval_type: string
  status: string
  pickup_available?: boolean
}

interface CategoryOption {
  id: number
  name: string
}

interface Props {
  product: ProductRow | null
  categories?: CategoryOption[]
}

export default function MerchantMarketplaceProductForm({ product, categories = [] }: Props) {
  const isEdit = !!product
  const unlimited = product?.inventory_quantity == null && isEdit

  const { data, setData, errors, processing } = useForm({
    name: product?.name ?? "",
    description: product?.description ?? "",
    category_id: product?.category_id != null ? String(product.category_id) : "",
    base_price: product ? String(product.base_price) : "",
    cost: product?.cost != null ? String(product.cost) : "",
    inventory_quantity: product && product.inventory_quantity != null ? String(product.inventory_quantity) : "",
    unlimited_inventory: unlimited || !isEdit,
    product_type: product?.product_type ?? "physical",
    fulfillment_shipping_by: product?.fulfillment_shipping_by ?? "merchant",
    digital_delivery_notes: product?.digital_delivery_notes ?? "",
    nonprofit_marketplace_enabled: product?.nonprofit_marketplace_enabled ?? false,
    pct_nonprofit: product?.pct_nonprofit != null ? String(product.pct_nonprofit) : "30",
    pct_merchant: product?.pct_merchant != null ? String(product.pct_merchant) : "70",
    min_resale_price: product?.min_resale_price != null ? String(product.min_resale_price) : "",
    suggested_retail_price: product?.suggested_retail_price != null ? String(product.suggested_retail_price) : "",
    nonprofit_approval_type: product?.nonprofit_approval_type ?? "auto",
    status: product?.status ?? "active",
    pickup_available: !!(product?.pickup_available ?? false),
  })

  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [newImagePreviewUrls, setNewImagePreviewUrls] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const urls = imageFiles.map((f) => URL.createObjectURL(f))
    setNewImagePreviewUrls(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [imageFiles])

  const addFiles = (files: FileList | File[]) => {
    const next = Array.from(files).filter((f) => f.type.startsWith("image/"))
    if (next.length === 0) return
    setImageFiles((prev) => [...prev, ...next])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeNewFileAt = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
    if (fileInputRef.current) fileInputRef.current.value = ""
  }
  const { props } = usePage<{ success?: string; error?: string }>()

  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  const appendForm = () => {
    const formData = new FormData()
    const entries: Record<string, string | boolean> = {
      name: data.name,
      description: data.description,
      base_price: data.base_price,
      cost: data.cost,
      product_type: data.product_type,
      fulfillment_shipping_by: data.fulfillment_shipping_by,
      digital_delivery_notes: data.digital_delivery_notes,
      nonprofit_marketplace_enabled: data.nonprofit_marketplace_enabled,
      pct_nonprofit: data.pct_nonprofit,
      pct_merchant: data.pct_merchant,
      min_resale_price: data.min_resale_price,
      suggested_retail_price: data.suggested_retail_price,
      nonprofit_approval_type: data.nonprofit_approval_type,
      status: data.status,
      unlimited_inventory: data.unlimited_inventory,
      pickup_available: data.pickup_available,
    }
    if (!data.unlimited_inventory && data.inventory_quantity !== "") {
      entries.inventory_quantity = data.inventory_quantity
    }
    Object.entries(entries).forEach(([k, v]) => {
      if (v === "" && k !== "name" && k !== "base_price" && k !== "cost" && k !== "product_type" && k !== "status" && k !== "nonprofit_marketplace_enabled" && k !== "unlimited_inventory") return
      formData.append(k, typeof v === "boolean" ? (v ? "1" : "0") : String(v))
    })
    formData.append("category_id", data.category_id === "" ? "" : String(data.category_id))
    imageFiles.forEach((f) => formData.append("images[]", f))
    return formData
  }

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setServerErrors({})
    router.post("/marketplace-products", appendForm(), {
      forceFormData: true,
      preserveScroll: true,
      onError: (errs) => setServerErrors(errs as Record<string, string>),
    })
  }

  const submitUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    setServerErrors({})
    const formData = appendForm()
    formData.append("_method", "PUT")
    router.post(`/marketplace-products/${product.id}`, formData, {
      forceFormData: true,
      preserveScroll: true,
      onError: (errs) => setServerErrors(errs as Record<string, string>),
    })
  }

  const err = (key: string) => (errors as Record<string, string>)[key] || serverErrors[key]
  const selectClass =
    "w-full rounded-md border-2 border-[#2563EB]/30 bg-black/40 px-3 py-2 text-sm text-white outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"

  return (
    <MerchantDashboardLayout>
      <Head title={isEdit ? "Edit product" : "Add product"} />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Link href="/marketplace-products" className="inline-flex items-center gap-1 transition hover:text-white">
                <ArrowLeft className="h-3.5 w-3.5" />
                Products
              </Link>
              <span>/</span>
              <span className="text-white/80">{isEdit ? "Edit Product" : "Add New Product"}</span>
            </div>
            <h1 className="text-3xl font-bold text-white">{isEdit ? "Edit Product" : "Add New Product"}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/marketplace-products">
              <MerchantButton type="button" variant="outline">
                Cancel
              </MerchantButton>
            </Link>
            <MerchantButton type="submit" form="merchant-product-form" disabled={processing}>
              {processing ? "Saving..." : "Save Product"}
            </MerchantButton>
          </div>
        </div>

        <form id="merchant-product-form" onSubmit={isEdit ? submitUpdate : submitCreate} className="grid gap-6 xl:grid-cols-3">
          <MerchantCard className="space-y-2 xl:col-span-2">
            <MerchantCardHeader>
              <MerchantCardTitle className="text-white">Product Information</MerchantCardTitle>
            </MerchantCardHeader>
            <MerchantCardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-1">
                  <MerchantLabel>
                    Product Name <span className="text-red-400">*</span>
                  </MerchantLabel>
                  <MerchantInput value={data.name} onChange={(e) => setData("name", e.target.value)} />
                  {err("name") && <p className="mt-1 text-sm text-red-400">{err("name")}</p>}
                </div>
                <div className="md:col-span-1">
                  <MerchantLabel>
                    Category <span className="text-red-400">*</span>
                  </MerchantLabel>
                  <select value={data.category_id} onChange={(e) => setData("category_id", e.target.value)} className={selectClass}>
                    <option value="">Select a category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                    {product?.category_id != null &&
                      !categories.some((c) => c.id === product.category_id) && (
                        <option value={String(product.category_id)}>
                          {product.category ?? "Category"} (current)
                        </option>
                      )}
                  </select>
                  {err("category_id") && <p className="mt-1 text-sm text-red-400">{err("category_id")}</p>}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[120px_1fr]">
                <div>
                  <MerchantLabel>
                    Currency <span className="text-red-400">*</span>
                  </MerchantLabel>
                  <select value="USD" disabled className={`${selectClass} cursor-not-allowed opacity-80`}>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <MerchantLabel>
                    Price <span className="text-red-400">*</span>
                  </MerchantLabel>
                  <MerchantInput type="number" step="0.01" min="0" required value={data.base_price} onChange={(e) => setData("base_price", e.target.value)} />
                  {err("base_price") && <p className="mt-1 text-sm text-red-400">{err("base_price")}</p>}
                </div>
              </div>

              <div>
                <MerchantLabel>
                  Cost <span className="text-red-400">*</span>
                </MerchantLabel>
                <MerchantInput type="number" step="0.01" min="0" required value={data.cost} onChange={(e) => setData("cost", e.target.value)} />
                {err("cost") && <p className="mt-1 text-sm text-red-400">{err("cost")}</p>}
              </div>

              <div>
                <MerchantLabel>Short Description</MerchantLabel>
                <MerchantTextarea
                  value={data.description}
                  onChange={(e) => setData("description", e.target.value)}
                  rows={3}
                  className="bg-black/40 text-white placeholder:text-white/40 border-[#2563EB]/30"
                />
                <p className="mt-1 text-right text-xs text-white/50">{data.description.length}/190</p>
              </div>

              <div>
                <MerchantLabel>Full Description</MerchantLabel>
                <MerchantTextarea
                  value={data.digital_delivery_notes}
                  onChange={(e) => setData("digital_delivery_notes", e.target.value)}
                  rows={5}
                  className="bg-black/40 text-white placeholder:text-white/40 border-[#2563EB]/30"
                  placeholder="Describe features, ingredients, sizing, care, or delivery details"
                />
              </div>
            </MerchantCardContent>
          </MerchantCard>

          <MerchantCard className="space-y-2 xl:row-span-2">
            <MerchantCardHeader>
              <MerchantCardTitle className="text-white">Product Image</MerchantCardTitle>
            </MerchantCardHeader>
            <MerchantCardContent className="space-y-4">
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  className="sr-only"
                  id="marketplace-product-images"
                  onChange={(e) => {
                    if (e.target.files?.length) addFiles(e.target.files)
                  }}
                />

                <label
                  htmlFor="marketplace-product-images"
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsDragging(true)
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsDragging(false)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsDragging(false)
                    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
                  }}
                  className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-5 py-8 text-center transition ${
                    isDragging
                      ? "border-[#2563EB] bg-[#2563EB]/15"
                      : "border-[#2563EB]/45 bg-black/25 hover:border-[#2563EB]/70 hover:bg-[#2563EB]/5"
                  }`}
                >
                  {newImagePreviewUrls[0] || product?.images?.[0] ? (
                    <img src={newImagePreviewUrls[0] || product?.images?.[0]} alt="Product preview" className="h-40 w-full rounded-md object-cover" />
                  ) : (
                    <>
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#2563EB]/30 bg-[#2563EB]/10">
                        <Upload className="h-6 w-6 text-[#60A5FA]" />
                      </div>
                      <p className="text-sm text-white/80">Click to upload or drag and drop</p>
                    </>
                  )}
                  <p className="text-xs text-white/50">PNG, JPG, WEBP up to 5MB</p>
                </label>
              </div>

              {(Boolean(product?.images?.length) || imageFiles.length > 0) && (
                <div className="grid grid-cols-3 gap-2">
                  {product?.images?.map((src, i) => (
                    <div key={`saved-${i}`} className="relative h-16 overflow-hidden rounded-md border border-[#2563EB]/20 bg-black/40">
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                  {imageFiles.map((file, i) => (
                    <div key={`${file.name}-${i}-${file.size}`} className="group relative h-16 overflow-hidden rounded-md border border-emerald-500/40 bg-black/40">
                      {newImagePreviewUrls[i] ? (
                        <img src={newImagePreviewUrls[i]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-500">...</div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          removeNewFileAt(i)
                        }}
                        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/80 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {err("images") && <p className="text-sm text-red-400">{err("images")}</p>}
              {(err("images.0") || err("images.1")) && <p className="text-sm text-red-400">{err("images.0") || err("images.1")}</p>}
            </MerchantCardContent>
          </MerchantCard>

          <MerchantCard className="space-y-2 xl:col-span-2">
            <MerchantCardHeader>
              <MerchantCardTitle className="text-white">Inventory</MerchantCardTitle>
            </MerchantCardHeader>
            <MerchantCardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <MerchantLabel>Quantity</MerchantLabel>
                  <MerchantInput
                    type="number"
                    min="0"
                    value={data.inventory_quantity}
                    disabled={data.unlimited_inventory}
                    onChange={(e) => setData("inventory_quantity", e.target.value)}
                    placeholder={data.unlimited_inventory ? "Unlimited" : "Enter quantity"}
                  />
                  {err("inventory_quantity") && <p className="mt-1 text-sm text-red-400">{err("inventory_quantity")}</p>}
                </div>
                <div>
                  <MerchantLabel>
                    Product Type <span className="text-red-400">*</span>
                  </MerchantLabel>
                  <select value={data.product_type} onChange={(e) => setData("product_type", e.target.value)} className={selectClass}>
                    <option value="physical">Physical</option>
                    <option value="digital">Digital</option>
                    <option value="service">Service</option>
                    <option value="media">Media</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center justify-between rounded-md border border-[#2563EB]/20 bg-black/25 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">Unlimited inventory</p>
                  <p className="text-xs text-white/55">Keep quantity unmanaged and always available.</p>
                </div>
                <input id="unl" type="checkbox" checked={data.unlimited_inventory} onChange={(e) => setData("unlimited_inventory", e.target.checked)} className="h-4 w-4 rounded border-gray-600 accent-[#2563EB]" />
              </label>
            </MerchantCardContent>
          </MerchantCard>

          <div className="space-y-6">
            <MerchantCard>
              <MerchantCardHeader>
                <MerchantCardTitle className="text-white">Product Status</MerchantCardTitle>
              </MerchantCardHeader>
              <MerchantCardContent className="space-y-3">
                <div>
                  <MerchantLabel>Status</MerchantLabel>
                  <select value={data.status} onChange={(e) => setData("status", e.target.value)} className={selectClass}>
                    <option value="draft">Draft</option>
                    <option value="pending_review">Pending review</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <p className="text-xs text-white/55">
                  Active + available stock appears in Merchant Hub and public org listings.
                </p>
              </MerchantCardContent>
            </MerchantCard>

            <MerchantCard>
              <MerchantCardHeader>
                <MerchantCardTitle className="text-white">Visibility</MerchantCardTitle>
              </MerchantCardHeader>
              <MerchantCardContent className="space-y-3">
                <label className="flex items-start justify-between gap-3 rounded-md border border-[#2563EB]/20 bg-black/25 px-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">Show on marketplace</p>
                    <p className="text-xs text-white/55">Allow nonprofits to list this item in BIU pool.</p>
                  </div>
                  <input
                    id="pool"
                    type="checkbox"
                    checked={data.nonprofit_marketplace_enabled}
                    onChange={(e) => setData("nonprofit_marketplace_enabled", e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-600 accent-[#2563EB]"
                  />
                </label>

                {["physical", "service", "media"].includes(data.product_type) && (
                  <label className="flex items-start justify-between gap-3 rounded-md border border-[#2563EB]/20 bg-black/25 px-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">Allow local pickup</p>
                      <p className="text-xs text-white/55">Buyers can choose pickup and avoid shipping fees.</p>
                    </div>
                    <input
                      id="pickup_available"
                      type="checkbox"
                      checked={!!data.pickup_available}
                      onChange={(e) => setData("pickup_available", e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-600 accent-[#2563EB]"
                    />
                  </label>
                )}
              </MerchantCardContent>
            </MerchantCard>

            <MerchantCard>
              <MerchantCardHeader>
                <MerchantCardTitle className="text-white">Additional Information</MerchantCardTitle>
              </MerchantCardHeader>
              <MerchantCardContent className="space-y-4">
                <div>
                  <MerchantLabel>Shipping handled by</MerchantLabel>
                  <select value={data.fulfillment_shipping_by} onChange={(e) => setData("fulfillment_shipping_by", e.target.value)} className={selectClass}>
                    <option value="merchant">Merchant</option>
                    <option value="biu">BIU (future)</option>
                  </select>
                </div>

                {data.nonprofit_marketplace_enabled && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <MerchantLabel>% to nonprofit</MerchantLabel>
                        <MerchantInput type="number" step="0.01" value={data.pct_nonprofit} onChange={(e) => setData("pct_nonprofit", e.target.value)} />
                        {err("pct_nonprofit") && <p className="mt-1 text-sm text-red-400">{err("pct_nonprofit")}</p>}
                      </div>
                      <div>
                        <MerchantLabel>% to merchant</MerchantLabel>
                        <MerchantInput type="number" step="0.01" value={data.pct_merchant} onChange={(e) => setData("pct_merchant", e.target.value)} />
                        {err("pct_merchant") && <p className="mt-1 text-sm text-red-400">{err("pct_merchant")}</p>}
                      </div>
                    </div>

                    <div>
                      <MerchantLabel>Nonprofit approval</MerchantLabel>
                      <select value={data.nonprofit_approval_type} onChange={(e) => setData("nonprofit_approval_type", e.target.value)} className={selectClass}>
                        <option value="auto">Auto-approve nonprofits</option>
                        <option value="manual">Manual approval</option>
                      </select>
                    </div>
                  </>
                )}
              </MerchantCardContent>
            </MerchantCard>
          </div>
        </form>
      </motion.div>
    </MerchantDashboardLayout>
  )
}
