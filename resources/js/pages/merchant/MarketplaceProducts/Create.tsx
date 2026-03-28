"use client"

import React, { useEffect, useRef, useState } from "react"
import { Head, Link, router, useForm, usePage } from "@inertiajs/react"
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from "@/components/merchant-ui"
import { MerchantButton } from "@/components/merchant-ui"
import { MerchantInput } from "@/components/merchant-ui"
import { MerchantLabel } from "@/components/merchant-ui"
import { MerchantTextarea } from "@/components/merchant-ui"
import { MerchantDashboardLayout } from "@/components/merchant"
import { ArrowLeft, ImagePlus, Upload, X } from "lucide-react"
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
  pct_biu: string | number | null
  min_resale_price: string | number | null
  suggested_retail_price: string | number | null
  nonprofit_approval_type: string
  status: string
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
    pct_merchant: product?.pct_merchant != null ? String(product.pct_merchant) : "60",
    pct_biu: product?.pct_biu != null ? String(product.pct_biu) : "10",
    min_resale_price: product?.min_resale_price != null ? String(product.min_resale_price) : "",
    suggested_retail_price: product?.suggested_retail_price != null ? String(product.suggested_retail_price) : "",
    nonprofit_approval_type: product?.nonprofit_approval_type ?? "auto",
    status: product?.status ?? "draft",
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
      category: data.category,
      base_price: data.base_price,
      cost: data.cost,
      product_type: data.product_type,
      fulfillment_shipping_by: data.fulfillment_shipping_by,
      digital_delivery_notes: data.digital_delivery_notes,
      nonprofit_marketplace_enabled: data.nonprofit_marketplace_enabled,
      pct_nonprofit: data.pct_nonprofit,
      pct_merchant: data.pct_merchant,
      pct_biu: data.pct_biu,
      min_resale_price: data.min_resale_price,
      suggested_retail_price: data.suggested_retail_price,
      nonprofit_approval_type: data.nonprofit_approval_type,
      status: data.status,
      unlimited_inventory: data.unlimited_inventory,
    }
    if (!data.unlimited_inventory && data.inventory_quantity !== "") {
      entries.inventory_quantity = data.inventory_quantity
    }
    Object.entries(entries).forEach(([k, v]) => {
      if (v === "" && k !== "name" && k !== "base_price" && k !== "product_type" && k !== "status" && k !== "nonprofit_marketplace_enabled" && k !== "unlimited_inventory") return
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

  return (
    <MerchantDashboardLayout>
      <Head title={isEdit ? "Edit product" : "Add product"} />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/marketplace-products">
            <MerchantButton variant="ghost" size="sm" type="button">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </MerchantButton>
          </Link>
          <h1 className="text-2xl font-bold text-white">{isEdit ? "Edit product" : "Add product"}</h1>
        </div>

        <form onSubmit={isEdit ? submitUpdate : submitCreate} className="space-y-6">
          <MerchantCard>
            <MerchantCardHeader>
              <MerchantCardTitle className="text-white">Basics</MerchantCardTitle>
            </MerchantCardHeader>
            <MerchantCardContent className="space-y-4">
              <div>
                <MerchantLabel>Name</MerchantLabel>
                <MerchantInput value={data.name} onChange={(e) => setData("name", e.target.value)} />
                {err("name") && <p className="text-red-400 text-sm mt-1">{err("name")}</p>}
              </div>
              <div>
                <MerchantLabel>Description</MerchantLabel>
                <MerchantTextarea value={data.description} onChange={(e) => setData("description", e.target.value)} rows={4} />
              </div>
              <div>
                <MerchantLabel>Category</MerchantLabel>
                <select
                  value={data.category_id}
                  onChange={(e) => setData("category_id", e.target.value)}
                  className="w-full rounded-lg border border-[#FF1493]/30 bg-black/40 text-white px-3 py-2"
                >
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
                {err("category_id") && <p className="text-red-400 text-sm mt-1">{err("category_id")}</p>}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <MerchantLabel>Base price (USD)</MerchantLabel>
                  <MerchantInput type="number" step="0.01" min="0" value={data.base_price} onChange={(e) => setData("base_price", e.target.value)} />
                  {err("base_price") && <p className="text-red-400 text-sm mt-1">{err("base_price")}</p>}
                </div>
                <div>
                  <MerchantLabel>Cost (optional)</MerchantLabel>
                  <MerchantInput type="number" step="0.01" min="0" value={data.cost} onChange={(e) => setData("cost", e.target.value)} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <MerchantLabel>Product type</MerchantLabel>
                  <select
                    value={data.product_type}
                    onChange={(e) => setData("product_type", e.target.value)}
                    className="w-full rounded-lg border border-[#FF1493]/30 bg-black/40 text-white px-3 py-2"
                  >
                    <option value="physical">Physical</option>
                    <option value="digital">Digital</option>
                    <option value="service">Service</option>
                    <option value="media">Media</option>
                  </select>
                </div>
                <div>
                  <MerchantLabel>Status</MerchantLabel>
                  <select
                    value={data.status}
                    onChange={(e) => setData("status", e.target.value)}
                    className="w-full rounded-lg border border-[#FF1493]/30 bg-black/40 text-white px-3 py-2"
                  >
                    <option value="draft">Draft</option>
                    <option value="pending_review">Pending review</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="unl"
                  type="checkbox"
                  checked={data.unlimited_inventory}
                  onChange={(e) => setData("unlimited_inventory", e.target.checked)}
                  className="rounded border-gray-600"
                />
                <label htmlFor="unl" className="text-sm text-gray-300">
                  Unlimited inventory
                </label>
              </div>
              {!data.unlimited_inventory && (
                <div>
                  <MerchantLabel>Inventory quantity</MerchantLabel>
                  <MerchantInput type="number" min="0" value={data.inventory_quantity} onChange={(e) => setData("inventory_quantity", e.target.value)} />
                  {err("inventory_quantity") && <p className="text-red-400 text-sm mt-1">{err("inventory_quantity")}</p>}
                </div>
              )}
              <div className="space-y-3">
                <MerchantLabel>Product images</MerchantLabel>
                <p className="text-xs text-gray-500 -mt-1">
                  JPEG, PNG, GIF, WebP · up to 5 MB each. {isEdit ? "New uploads are added to your current images." : "You can select several at once."}
                </p>

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
                  className={`
                    flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-all
                    ${isDragging
                      ? "border-[#FF1493] bg-[#FF1493]/15 scale-[1.01]"
                      : "border-[#FF1493]/35 bg-black/25 hover:border-[#FF1493]/60 hover:bg-[#FF1493]/5"
                    }
                  `}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#FF1493]/30 via-[#DC143C]/20 to-[#E97451]/30 border border-[#FF1493]/30">
                    <Upload className="h-7 w-7 text-[#FF69B4]" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white">Drop images here or </span>
                    <span className="text-sm font-semibold text-[#FF69B4] underline-offset-2 hover:underline">browse</span>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-md border-2 border-[#FF1493] bg-transparent px-4 py-2 text-sm font-medium text-[#FF1493] shadow-sm shadow-[#FF1493]/20">
                    <ImagePlus className="h-4 w-4" />
                    Choose files
                  </span>
                </label>

                {isEdit && product?.images && product.images.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-2">Current images (saved)</p>
                    <div className="flex flex-wrap gap-2">
                      {product.images.map((src, i) => (
                        <div
                          key={`saved-${i}`}
                          className="relative h-20 w-20 overflow-hidden rounded-lg border border-[#FF1493]/25 bg-black/40"
                        >
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {imageFiles.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-2">New uploads (submit to save)</p>
                    <div className="flex flex-wrap gap-2">
                      {imageFiles.map((file, i) => (
                        <div
                          key={`${file.name}-${i}-${file.size}`}
                          className="group relative h-20 w-20 overflow-hidden rounded-lg border border-emerald-500/40 bg-black/40"
                        >
                          {newImagePreviewUrls[i] ? (
                            <img src={newImagePreviewUrls[i]} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-white/5 text-[10px] text-gray-500">…</div>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              removeNewFileAt(i)
                            }}
                            className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/80 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
                            aria-label="Remove image"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {err("images") && <p className="text-red-400 text-sm">{err("images")}</p>}
                {(err("images.0") || err("images.1")) && (
                  <p className="text-red-400 text-sm">{err("images.0") || err("images.1")}</p>
                )}
              </div>
            </MerchantCardContent>
          </MerchantCard>

          <MerchantCard>
            <MerchantCardHeader>
              <MerchantCardTitle className="text-white">Fulfillment</MerchantCardTitle>
            </MerchantCardHeader>
            <MerchantCardContent className="space-y-4">
              <div>
                <MerchantLabel>Shipping handled by</MerchantLabel>
                <select
                  value={data.fulfillment_shipping_by}
                  onChange={(e) => setData("fulfillment_shipping_by", e.target.value)}
                  className="w-full rounded-lg border border-[#FF1493]/30 bg-black/40 text-white px-3 py-2"
                >
                  <option value="merchant">Merchant</option>
                  <option value="biu">BIU (future)</option>
                </select>
              </div>
              <div>
                <MerchantLabel>Digital delivery notes</MerchantLabel>
                <MerchantTextarea
                  value={data.digital_delivery_notes}
                  onChange={(e) => setData("digital_delivery_notes", e.target.value)}
                  rows={2}
                  placeholder="If digital, how buyers receive the product"
                />
              </div>
            </MerchantCardContent>
          </MerchantCard>

          <MerchantCard>
            <MerchantCardHeader>
              <MerchantCardTitle className="text-white">Nonprofit marketplace settings</MerchantCardTitle>
            </MerchantCardHeader>
            <MerchantCardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  id="pool"
                  type="checkbox"
                  checked={data.nonprofit_marketplace_enabled}
                  onChange={(e) => setData("nonprofit_marketplace_enabled", e.target.checked)}
                  className="rounded border-gray-600"
                />
                <label htmlFor="pool" className="text-sm text-gray-300">
                  Allow nonprofits to sell this product (enters BIU product pool when active)
                </label>
              </div>
              {data.nonprofit_marketplace_enabled && (
                <>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <MerchantLabel>% to nonprofit</MerchantLabel>
                      <MerchantInput type="number" step="0.01" value={data.pct_nonprofit} onChange={(e) => setData("pct_nonprofit", e.target.value)} />
                      {err("pct_nonprofit") && <p className="text-red-400 text-sm mt-1">{err("pct_nonprofit")}</p>}
                    </div>
                    <div>
                      <MerchantLabel>% to merchant</MerchantLabel>
                      <MerchantInput type="number" step="0.01" value={data.pct_merchant} onChange={(e) => setData("pct_merchant", e.target.value)} />
                      {err("pct_merchant") && <p className="text-red-400 text-sm mt-1">{err("pct_merchant")}</p>}
                    </div>
                    <div>
                      <MerchantLabel>% to BIU</MerchantLabel>
                      <MerchantInput type="number" step="0.01" value={data.pct_biu} onChange={(e) => setData("pct_biu", e.target.value)} />
                      {err("pct_biu") && <p className="text-red-400 text-sm mt-1">{err("pct_biu")}</p>}
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <MerchantLabel>Minimum resale price (optional)</MerchantLabel>
                      <MerchantInput type="number" step="0.01" min="0" value={data.min_resale_price} onChange={(e) => setData("min_resale_price", e.target.value)} />
                    </div>
                    <div>
                      <MerchantLabel>Suggested retail price (optional)</MerchantLabel>
                      <MerchantInput type="number" step="0.01" min="0" value={data.suggested_retail_price} onChange={(e) => setData("suggested_retail_price", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <MerchantLabel>Nonprofit approval</MerchantLabel>
                    <select
                      value={data.nonprofit_approval_type}
                      onChange={(e) => setData("nonprofit_approval_type", e.target.value)}
                      className="w-full rounded-lg border border-[#FF1493]/30 bg-black/40 text-white px-3 py-2"
                    >
                      <option value="auto">Auto-approve nonprofits</option>
                      <option value="manual">Manual approval</option>
                    </select>
                  </div>
                </>
              )}
            </MerchantCardContent>
          </MerchantCard>

          <MerchantButton type="submit" disabled={processing} className="w-full sm:w-auto">
            {processing ? "Saving…" : isEdit ? "Save changes" : "Create product"}
          </MerchantButton>
        </form>
      </motion.div>
    </MerchantDashboardLayout>
  )
}
