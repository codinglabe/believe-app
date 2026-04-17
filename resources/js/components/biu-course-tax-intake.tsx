"use client"

import { useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/admin/ui/input"
import type { LucideIcon } from "lucide-react"
import {
  Receipt,
  AlertTriangle,
  Check,
  Laptop,
  Radio,
  Layers,
  Compass,
  FileText,
  PlayCircle,
  Download,
  Cloud,
  Package,
  Link2,
  SplitSquareHorizontal,
  Store,
  Truck,
  Sparkles,
  PackageOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type TaxClassification = "non_taxable" | "partial_taxable" | "fully_taxable"

export type CourseDeliveryType = "online" | "live" | "hybrid"
export type PricingStructureType = "bundled" | "separate"
export type CourseContentType = "written_material" | "video_streamed" | "video_streamed_downloadable" | "general"

export interface BiuTaxFormSlice {
  course_delivery_type: CourseDeliveryType | ""
  course_content_type: CourseContentType | ""
  has_physical_materials: boolean
  pricing_structure: PricingStructureType | ""
  requires_shipping: boolean
  digital_course_fee: string
  materials_fee: string
  shipping_fee_amount: string
  tax_ack_outside_ca: boolean
  tax_ack_auto_calculate: boolean
}

function computeClassification(
  pricingType: string,
  courseType: string,
  hasPhysical: boolean,
  pricingStructure: string,
): TaxClassification {
  if (pricingType !== "paid" || courseType !== "course") {
    return "non_taxable"
  }
  if (!hasPhysical) {
    return "non_taxable"
  }
  if (pricingStructure === "separate") {
    return "partial_taxable"
  }
  if (pricingStructure === "bundled") {
    return "fully_taxable"
  }
  return "non_taxable"
}

const classificationLabels: Record<TaxClassification, string> = {
  non_taxable: "Non-Taxable (Digital Only)",
  partial_taxable: "Partially Taxable (Split Pricing)",
  fully_taxable: "Fully Taxable (Bundled with Physical Goods)",
}

const classificationIcons: Record<TaxClassification, LucideIcon> = {
  non_taxable: Sparkles,
  partial_taxable: SplitSquareHorizontal,
  fully_taxable: PackageOpen,
}

interface BiuCourseTaxIntakeProps {
  show: boolean
  data: BiuTaxFormSlice
  setData: (key: string, value: unknown) => void
  errors: Partial<Record<keyof BiuTaxFormSlice | string, string>>
  organizationName?: string | null
  courseType: "course" | "event"
  pricingType: "free" | "paid"
}

/** Custom single-select tile (no native radio) — amber BIU styling + icon. */
function SelectTile({
  value,
  selected,
  onSelect,
  label,
  description,
  icon: Icon,
}: {
  value: string
  selected: boolean
  onSelect: (v: string) => void
  label: string
  description?: string
  icon: LucideIcon
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(value)}
      className={cn(
        "group relative w-full rounded-2xl border-2 p-3.5 text-left transition-all duration-200 sm:p-4",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-purple-500/45",
        selected
          ? "border-purple-400/80 bg-gradient-to-br from-purple-50/95 via-white to-blue-50/80 shadow-[0_8px_32px_-14px_rgba(147,51,234,0.35)] ring-1 ring-purple-200/70 dark:border-purple-500/55 dark:from-purple-950/45 dark:via-slate-900/95 dark:to-blue-950/45 dark:ring-purple-800/45"
          : "border-slate-200/90 bg-white/70 hover:border-purple-200/80 hover:bg-gradient-to-br hover:from-purple-50/40 hover:to-blue-50/50 hover:shadow-sm dark:border-slate-700/90 dark:bg-slate-900/50 dark:hover:border-purple-800/60 dark:hover:from-purple-950/25 dark:hover:to-blue-950/25",
      )}
    >
      <div className="flex gap-3.5">
        <span
          className={cn(
            "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-all duration-200",
            selected
              ? "border-transparent bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-md dark:from-purple-500 dark:to-blue-600"
              : "border-slate-200/90 bg-slate-50 text-slate-500 group-hover:border-purple-200/90 group-hover:bg-purple-50/80 group-hover:text-purple-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:border-purple-800/50 dark:group-hover:bg-purple-950/40 dark:group-hover:text-purple-300",
          )}
          aria-hidden
        >
          <Icon className="h-6 w-6" strokeWidth={2} />
          {selected ? (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-600/30 dark:border-slate-900">
              <Check className="h-2.5 w-2.5 stroke-[3]" />
            </span>
          ) : null}
        </span>
        <span className="min-w-0 flex-1 pt-0.5">
          <span
            className={cn(
              "block font-semibold leading-snug",
              selected ? "text-slate-900 dark:text-white" : "text-slate-800 dark:text-slate-100",
            )}
          >
            {label}
          </span>
          {description ? (
            <span className="mt-1 block text-sm leading-snug text-slate-600 dark:text-slate-400">{description}</span>
          ) : null}
        </span>
      </div>
    </button>
  )
}

export default function BiuCourseTaxIntake({
  show,
  data,
  setData,
  errors,
  organizationName,
  courseType,
  pricingType,
}: BiuCourseTaxIntakeProps) {
  const taxClassification = useMemo(
    () =>
      computeClassification(pricingType, courseType, data.has_physical_materials, data.pricing_structure),
    [pricingType, courseType, data.has_physical_materials, data.pricing_structure],
  )

  const showBundledWarning =
    pricingType === "paid" &&
    courseType === "course" &&
    data.has_physical_materials &&
    data.pricing_structure === "bundled"

  const isSeparate =
    pricingType === "paid" && courseType === "course" && data.has_physical_materials && data.pricing_structure === "separate"

  const isBundledWithShip =
    pricingType === "paid" &&
    courseType === "course" &&
    data.has_physical_materials &&
    data.pricing_structure === "bundled" &&
    data.requires_shipping

  useEffect(() => {
    if (data.has_physical_materials && !data.pricing_structure) {
      setData("pricing_structure", "separate")
    }
  }, [data.has_physical_materials, data.pricing_structure, setData])

  /** Sum split fees into parent course_fee for checkout total */
  useEffect(() => {
    if (!isSeparate) {
      return
    }
    const d = parseFloat(String(data.digital_course_fee).replace(",", ".")) || 0
    const m = parseFloat(String(data.materials_fee).replace(",", ".")) || 0
    const s = data.requires_shipping ? parseFloat(String(data.shipping_fee_amount).replace(",", ".")) || 0 : 0
    if (d === 0 && m === 0 && s === 0) {
      return
    }
    const total = (d + m + s).toFixed(2)
    setData("course_fee", total)
  }, [
    isSeparate,
    data.digital_course_fee,
    data.materials_fee,
    data.shipping_fee_amount,
    data.requires_shipping,
    setData,
  ])

  if (!show) {
    return null
  }

  return (
    <Card className="border-purple-200/70 bg-gradient-to-br from-purple-50/60 via-white to-blue-50/50 dark:border-purple-900/40 dark:from-purple-950/20 dark:via-slate-950 dark:to-blue-950/25">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-sm">
            <Receipt className="h-5 w-5" strokeWidth={2} />
          </span>
          BIU course tax classification
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Simple intake for sales tax handling. Required for paid community courses.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-1 rounded-md border bg-background/80 p-3 text-sm">
          <span className="text-muted-foreground">Organization name</span>
          <span className="font-medium">{organizationName?.trim() || "—"}</span>
        </div>

        <div className="space-y-2">
          <Label id="biu-label-delivery" className="text-sm font-medium">
            1. Course delivery type
          </Label>
          <div
            role="radiogroup"
            aria-labelledby="biu-label-delivery"
            className="grid gap-2 sm:grid-cols-3"
          >
            <SelectTile
              value="online"
              selected={data.course_delivery_type === "online"}
              onSelect={(v) => setData("course_delivery_type", v as CourseDeliveryType)}
              icon={Laptop}
              label="100% online"
              description="Videos, PDFs, downloads, portal access"
            />
            <SelectTile
              value="live"
              selected={data.course_delivery_type === "live"}
              onSelect={(v) => setData("course_delivery_type", v as CourseDeliveryType)}
              icon={Radio}
              label="Live online"
              description="Zoom or other real-time instruction"
            />
            <SelectTile
              value="hybrid"
              selected={data.course_delivery_type === "hybrid"}
              onSelect={(v) => setData("course_delivery_type", v as CourseDeliveryType)}
              icon={Layers}
              label="Hybrid"
              description="Online plus physical materials shipped"
            />
          </div>
          {errors.course_delivery_type && (
            <p className="text-sm text-destructive">{errors.course_delivery_type}</p>
          )}
        </div>

        {data.course_delivery_type === "online" ? (
          <div className="space-y-2">
            <Label id="biu-label-content" className="text-sm font-medium">
              2. Online content type
            </Label>
            <p className="text-xs text-muted-foreground">
              Pick the closest match for how learners access the course online.
            </p>
            <div
              role="radiogroup"
              aria-labelledby="biu-label-content"
              className="grid gap-2 sm:grid-cols-2"
            >
              <SelectTile
                value="general"
                selected={(data.course_content_type || "general") === "general"}
                onSelect={(v) => setData("course_content_type", v as CourseContentType)}
                icon={Compass}
                label="Self-study / general web-based"
                description="Default — mostly self-paced on the web"
              />
              <SelectTile
                value="written_material"
                selected={(data.course_content_type || "general") === "written_material"}
                onSelect={(v) => setData("course_content_type", v as CourseContentType)}
                icon={FileText}
                label="Written / text-based on-demand"
                description="Primarily text, PDFs, or written lessons"
              />
              <SelectTile
                value="video_streamed"
                selected={(data.course_content_type || "general") === "video_streamed"}
                onSelect={(v) => setData("course_content_type", v as CourseContentType)}
                icon={PlayCircle}
                label="Streamed prerecorded video"
                description="Video is streamed only (no required downloads)"
              />
              <SelectTile
                value="video_streamed_downloadable"
                selected={(data.course_content_type || "general") === "video_streamed_downloadable"}
                onSelect={(v) => setData("course_content_type", v as CourseContentType)}
                icon={Download}
                label="Streamed + downloadable"
                description="Includes downloadable files or offline access"
              />
            </div>
            {errors.course_content_type && (
              <p className="text-sm text-destructive">{errors.course_content_type}</p>
            )}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label id="biu-label-physical" className="text-sm font-medium">
            {data.course_delivery_type === "online" ? "3." : "2."} Physical materials
          </Label>
          <div
            role="radiogroup"
            aria-labelledby="biu-label-physical"
            className="grid gap-2 sm:grid-cols-2"
          >
            <SelectTile
              value="false"
              selected={!data.has_physical_materials}
              onSelect={(v) => setData("has_physical_materials", v === "true")}
              icon={Cloud}
              label="No physical materials"
            />
            <SelectTile
              value="true"
              selected={data.has_physical_materials}
              onSelect={(v) => setData("has_physical_materials", v === "true")}
              icon={Package}
              label="Physical materials included"
              description="Books, kits, merchandise, etc."
            />
          </div>
          {errors.has_physical_materials && (
            <p className="text-sm text-destructive">{errors.has_physical_materials}</p>
          )}
        </div>

        {data.has_physical_materials ? (
          <div className="space-y-2">
            <Label id="biu-label-pricing" className="text-sm font-medium">
              {data.course_delivery_type === "online" ? "4." : "3."} Pricing structure
            </Label>
            <div
              role="radiogroup"
              aria-labelledby="biu-label-pricing"
              className="grid gap-2 sm:grid-cols-2"
            >
              <SelectTile
                value="bundled"
                selected={data.pricing_structure === "bundled"}
                onSelect={(v) => setData("pricing_structure", v as PricingStructureType)}
                icon={Link2}
                label="Single bundled price"
                description="Course and materials sold together"
              />
              <SelectTile
                value="separate"
                selected={data.pricing_structure === "separate"}
                onSelect={(v) => setData("pricing_structure", v as PricingStructureType)}
                icon={SplitSquareHorizontal}
                label="Separate pricing (recommended)"
                description="Course fee and materials priced separately"
              />
            </div>
            {errors.pricing_structure && (
              <p className="text-sm text-destructive">{errors.pricing_structure}</p>
            )}
          </div>
        ) : null}

        {data.has_physical_materials ? (
          <>
        <div className="space-y-2">
          <Label id="biu-label-shipping" className="text-sm font-medium">
            {data.course_delivery_type === "online" ? "5." : "4."} Shipping
          </Label>
          <div
            role="radiogroup"
            aria-labelledby="biu-label-shipping"
            className="grid gap-2 sm:grid-cols-2"
          >
            <SelectTile
              value="false"
              selected={!data.requires_shipping}
              onSelect={(v) => setData("requires_shipping", v === "true")}
              icon={Store}
              label="No shipping required"
            />
            <SelectTile
              value="true"
              selected={data.requires_shipping}
              onSelect={(v) => setData("requires_shipping", v === "true")}
              icon={Truck}
              label="Shipping required for materials"
            />
          </div>
          {errors.requires_shipping && (
            <p className="text-sm text-destructive">{errors.requires_shipping}</p>
          )}
        </div>

        {isSeparate ? (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <Label className="text-sm font-medium">Split amounts (USD)</Label>
            <p className="text-xs text-muted-foreground">
              These must sum to the total charged at checkout. Total updates the course price field automatically.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="digital_course_fee">Digital / course access</Label>
                <Input
                  id="digital_course_fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.digital_course_fee}
                  onChange={(e) => setData("digital_course_fee", e.target.value)}
                  className={errors.digital_course_fee ? "border-destructive" : ""}
                />
                {errors.digital_course_fee && (
                  <p className="text-xs text-destructive">{errors.digital_course_fee}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="materials_fee">Physical materials</Label>
                <Input
                  id="materials_fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.materials_fee}
                  onChange={(e) => setData("materials_fee", e.target.value)}
                  className={errors.materials_fee ? "border-destructive" : ""}
                />
                {errors.materials_fee && <p className="text-xs text-destructive">{errors.materials_fee}</p>}
              </div>
            </div>
            {data.requires_shipping ? (
              <div className="space-y-1 max-w-xs">
                <Label htmlFor="shipping_fee_amount">Shipping</Label>
                <Input
                  id="shipping_fee_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.shipping_fee_amount}
                  onChange={(e) => setData("shipping_fee_amount", e.target.value)}
                  className={errors.shipping_fee_amount ? "border-destructive" : ""}
                />
                {errors.shipping_fee_amount && (
                  <p className="text-xs text-destructive">{errors.shipping_fee_amount}</p>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {isBundledWithShip ? (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
            <Label htmlFor="shipping_fee_bundled">Shipping amount (USD)</Label>
            <p className="text-xs text-muted-foreground">
              Total course price includes bundle + shipping. Enter shipping here; the bundle portion is the remainder.
            </p>
            <Input
              id="shipping_fee_bundled"
              type="number"
              min="0"
              step="0.01"
              value={data.shipping_fee_amount}
              onChange={(e) => setData("shipping_fee_amount", e.target.value)}
              className={errors.shipping_fee_amount ? "border-destructive max-w-xs" : "max-w-xs"}
            />
            {errors.shipping_fee_amount && (
              <p className="text-xs text-destructive">{errors.shipping_fee_amount}</p>
            )}
          </div>
        ) : null}
          </>
        ) : null}

        <div className="space-y-3 rounded-xl border border-purple-200/60 bg-gradient-to-br from-purple-50/50 via-white/80 to-blue-50/50 p-4 dark:border-purple-900/45 dark:from-purple-950/25 dark:via-slate-950/50 dark:to-blue-950/20">
          <div>
            <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {data.course_delivery_type === "online" ? "6." : "5."} Sales tax & buyer locations
            </Label>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Confirm how tax may apply to your paid course buyers. Rates depend on where the customer is located at
              checkout.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="tax_ack_outside_ca"
              checked={data.tax_ack_outside_ca}
              onCheckedChange={(c) => setData("tax_ack_outside_ca", c === true)}
              className="mt-0.5 border-purple-300 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white dark:border-purple-700"
            />
            <label htmlFor="tax_ack_outside_ca" className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              I understand that buyers may owe sales tax based on their address (including outside California), when the
              law requires it.
            </label>
          </div>
          {errors.tax_ack_outside_ca && (
            <p className="text-sm text-destructive">{errors.tax_ack_outside_ca}</p>
          )}
          <div className="flex items-start gap-3">
            <Checkbox
              id="tax_ack_auto_calculate"
              checked={data.tax_ack_auto_calculate}
              onCheckedChange={(c) => setData("tax_ack_auto_calculate", c === true)}
              className="mt-0.5 border-purple-300 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white dark:border-purple-700"
            />
            <label htmlFor="tax_ack_auto_calculate" className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              I agree that BIU may automatically calculate and collect applicable sales tax at checkout, using this
              classification and the buyer&apos;s location.
            </label>
          </div>
          {errors.tax_ack_auto_calculate && (
            <p className="text-sm text-destructive">{errors.tax_ack_auto_calculate}</p>
          )}
        </div>

        {showBundledWarning ? (
          <div
            className="flex gap-3 rounded-lg border border-amber-500/50 bg-amber-100/80 p-4 text-sm dark:bg-amber-950/40"
            role="status"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
            <div>
              <p className="font-medium text-amber-950 dark:text-amber-100">Tax impact notice</p>
              <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
                This setup will cause the <strong>full course price</strong> to be taxed. To reduce taxes, consider
                separating course and materials pricing.
              </p>
            </div>
          </div>
        ) : null}

        <div className="space-y-2 rounded-lg border border-dashed bg-background/60 p-4">
          <Label className="text-sm font-medium">
            {data.course_delivery_type === "online" ? "7." : "6."} Tax classification (system)
          </Label>
          <p className="text-xs text-muted-foreground">This value is computed from your answers and cannot be edited.</p>
          <div className="mt-2 space-y-2">
            {(Object.keys(classificationLabels) as TaxClassification[]).map((key) => {
              const active = taxClassification === key
              const ClsIcon = classificationIcons[key]
              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center gap-3.5 rounded-2xl border-2 px-3.5 py-3 text-sm transition-colors sm:px-4",
                    active
                      ? "border-purple-400/80 bg-gradient-to-r from-purple-50/95 via-white to-blue-50/80 font-semibold text-slate-900 shadow-[0_6px_28px_-12px_rgba(147,51,234,0.35)] ring-1 ring-purple-200/70 dark:border-purple-500/55 dark:from-purple-950/45 dark:via-slate-900 dark:to-blue-950/35 dark:text-white dark:ring-purple-800/45"
                      : "border-dashed border-slate-200/80 bg-slate-50/50 text-slate-500 opacity-75 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500",
                  )}
                >
                  <span
                    className={cn(
                      "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors",
                      active
                        ? "border-transparent bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-md dark:from-purple-500 dark:to-blue-600"
                        : "border-slate-200 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800",
                    )}
                    aria-hidden
                  >
                    <ClsIcon className="h-5 w-5" strokeWidth={2} />
                    {active ? (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-600/30 dark:border-slate-900">
                        <Check className="h-2 w-2 stroke-[3]" />
                      </span>
                    ) : null}
                  </span>
                  <span className="leading-snug">{classificationLabels[key]}</span>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
