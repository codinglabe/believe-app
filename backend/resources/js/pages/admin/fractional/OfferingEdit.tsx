"use client"

import type React from "react"
import { Head, useForm, Link } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save, PieChart, DollarSign, Calendar } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

interface FractionalAsset {
    id: number
    name: string
}

interface FractionalOffering {
    id: number
    asset_id: number
    title: string
    summary: string | null
    total_shares: number
    available_shares: number
    price_per_share: number
    token_price: number | null
    currency: string
    status: string
    go_live_at: string | null
    close_at: string | null
    asset: FractionalAsset
}

interface OfferingEditProps {
    offering: FractionalOffering
    assets: FractionalAsset[]
}

export default function OfferingEdit({ offering, assets }: OfferingEditProps) {
    const formatDateTimeLocal = (dateString: string | null) => {
        if (!dateString) return ""
        const date = new Date(dateString)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, "0")
        const day = String(date.getDate()).padStart(2, "0")
        const hours = String(date.getHours()).padStart(2, "0")
        const minutes = String(date.getMinutes()).padStart(2, "0")
        return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    const { data, setData, put, processing, errors } = useForm({
        asset_id: String(offering.asset_id),
        title: offering.title,
        summary: offering.summary || "",
        total_shares: String(offering.total_shares),
        available_shares: String(offering.available_shares),
        price_per_share: String(offering.price_per_share),
        token_price: String(offering.token_price || offering.price_per_share),
        ownership_percentage: offering.ownership_percentage ? String(offering.ownership_percentage) : "",
        currency: offering.currency,
        status: offering.status,
        go_live_at: formatDateTimeLocal(offering.go_live_at),
        close_at: formatDateTimeLocal(offering.close_at),
        meta: {},
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        put(route("admin.fractional.offerings.update", offering.id))
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { title: "Dashboard", href: "/dashboard" },
        { title: "Fractional Ownership", href: route("admin.fractional.offerings.index") },
        { title: "Offerings", href: route("admin.fractional.offerings.index") },
        { title: "Edit Offering", href: route("admin.fractional.offerings.edit", offering.id) },
    ]

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Fractional Offering" />

            <div className="m-2 md:m-4 space-y-4">
                <div className="flex items-center gap-4">
                    <Link href={route("admin.fractional.offerings.index")}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-semibold">Edit Offering</h1>
                        <p className="text-sm text-muted-foreground">Update the fractional ownership offering details.</p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <PieChart className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <CardTitle>Offering Details</CardTitle>
                                    <CardDescription>Update the fractional ownership offering configuration.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="asset_id">Asset *</Label>
                                    <Select value={data.asset_id} onValueChange={(value) => setData("asset_id", value)}>
                                        <SelectTrigger className={errors.asset_id ? "border-red-500" : ""}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {assets.map((asset) => (
                                                <SelectItem key={asset.id} value={String(asset.id)}>
                                                    {asset.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.asset_id && <p className="text-sm text-red-500">{errors.asset_id}</p>}
                                    <p className="text-xs text-muted-foreground">Select the asset for this offering</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="title">Title *</Label>
                                    <Input
                                        id="title"
                                        type="text"
                                        value={data.title}
                                        onChange={(e) => setData("title", e.target.value)}
                                        required
                                        className={errors.title ? "border-red-500" : ""}
                                    />
                                    {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
                                    <p className="text-xs text-muted-foreground">A clear, descriptive title for this offering</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="summary">Summary</Label>
                                    <Textarea
                                        id="summary"
                                        value={data.summary}
                                        onChange={(e) => setData("summary", e.target.value)}
                                        rows={3}
                                        className={errors.summary ? "border-red-500" : ""}
                                    />
                                    {errors.summary && <p className="text-sm text-red-500">{errors.summary}</p>}
                                    <p className="text-xs text-muted-foreground">A brief overview of what investors will receive</p>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="total_shares">Total Shares *</Label>
                                        <Input
                                            id="total_shares"
                                            type="number"
                                            min="1"
                                            value={data.total_shares}
                                            onChange={(e) => setData("total_shares", e.target.value)}
                                            required
                                            className={errors.total_shares ? "border-red-500" : ""}
                                        />
                                        {errors.total_shares && <p className="text-sm text-red-500">{errors.total_shares}</p>}
                                        <p className="text-xs text-muted-foreground">Total number of shares available</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="available_shares">Available Shares *</Label>
                                        <Input
                                            id="available_shares"
                                            type="number"
                                            min="0"
                                            value={data.available_shares}
                                            onChange={(e) => setData("available_shares", e.target.value)}
                                            required
                                            className={errors.available_shares ? "border-red-500" : ""}
                                        />
                                        {errors.available_shares && <p className="text-sm text-red-500">{errors.available_shares}</p>}
                                        <p className="text-xs text-muted-foreground">Number of shares currently available for purchase</p>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="price_per_share">Cost per Share *</Label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="price_per_share"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={data.price_per_share}
                                                onChange={(e) => setData("price_per_share", e.target.value)}
                                                required
                                                className={errors.price_per_share ? "border-red-500 pl-9" : "pl-9"}
                                            />
                                        </div>
                                        {errors.price_per_share && <p className="text-sm text-red-500">{errors.price_per_share}</p>}
                                        <p className="text-xs text-muted-foreground">Total asset value divided by total shares</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="token_price">Token Price *</Label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="token_price"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={data.token_price}
                                                onChange={(e) => setData("token_price", e.target.value)}
                                                required
                                                className={errors.token_price ? "border-red-500 pl-9" : "pl-9"}
                                            />
                                        </div>
                                        {errors.token_price && <p className="text-sm text-red-500">{errors.token_price}</p>}
                                        <p className="text-xs text-muted-foreground">Price per token/share that users will pay</p>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="currency">Currency *</Label>
                                        <Input
                                            id="currency"
                                            type="text"
                                            maxLength={3}
                                            value={data.currency}
                                            onChange={(e) => setData("currency", e.target.value.toUpperCase())}
                                            required
                                            className={errors.currency ? "border-red-500" : ""}
                                        />
                                        {errors.currency && <p className="text-sm text-red-500">{errors.currency}</p>}
                                        <p className="text-xs text-muted-foreground">3-letter currency code (e.g., USD, EUR)</p>
                                    </div>

                                    {/* Ownership Percentage */}
                                    <div className="space-y-2">
                                        <Label htmlFor="ownership_percentage">Ownership % per Token</Label>
                                        <div className="relative">
                                            <Input
                                                id="ownership_percentage"
                                                type="number"
                                                step="0.0001"
                                                min="0"
                                                max="100"
                                                value={data.ownership_percentage}
                                                onChange={(e) => setData("ownership_percentage", e.target.value)}
                                                placeholder="2.000"
                                                className={errors.ownership_percentage ? "border-red-500 pr-12" : "pr-12"}
                                            />
                                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                                        </div>
                                        {errors.ownership_percentage && <p className="text-sm text-red-500">{errors.ownership_percentage}</p>}
                                        <p className="text-xs text-muted-foreground">
                                            If empty, auto-calculated: (Token Price ÷ Cost per Share) × 100
                                        </p>
                                    </div>
                                </div>

                                {/* Auto-calculated preview */}
                                {data.price_per_share && data.token_price && parseFloat(data.price_per_share) > 0 && !data.ownership_percentage && (
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                        <p className="text-xs text-blue-700 dark:text-blue-300">
                                            Auto-calculated: <span className="font-semibold">{((parseFloat(data.token_price) / parseFloat(data.price_per_share)) * 100).toFixed(3)}%</span>
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="status">Status *</Label>
                                    <Select value={data.status} onValueChange={(value) => setData("status", value)}>
                                        <SelectTrigger className={errors.status ? "border-red-500" : ""}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">Draft</SelectItem>
                                            <SelectItem value="live">Live</SelectItem>
                                            <SelectItem value="sold_out">Sold Out</SelectItem>
                                            <SelectItem value="closed">Closed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.status && <p className="text-sm text-red-500">{errors.status}</p>}
                                    <p className="text-xs text-muted-foreground">Current status of the offering</p>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="go_live_at">Go Live Date</Label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="go_live_at"
                                                type="datetime-local"
                                                value={data.go_live_at}
                                                onChange={(e) => setData("go_live_at", e.target.value)}
                                                className={errors.go_live_at ? "border-red-500 pl-9" : "pl-9"}
                                            />
                                        </div>
                                        {errors.go_live_at && <p className="text-sm text-red-500">{errors.go_live_at}</p>}
                                        <p className="text-xs text-muted-foreground">When the offering becomes available</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="close_at">Close Date</Label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="close_at"
                                                type="datetime-local"
                                                value={data.close_at}
                                                onChange={(e) => setData("close_at", e.target.value)}
                                                className={errors.close_at ? "border-red-500 pl-9" : "pl-9"}
                                            />
                                        </div>
                                        {errors.close_at && <p className="text-sm text-red-500">{errors.close_at}</p>}
                                        <p className="text-xs text-muted-foreground">When the offering closes</p>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4 border-t">
                                    <Button type="submit" disabled={processing} className="min-w-[120px]">
                                        <Save className="h-4 w-4 mr-2" />
                                        {processing ? "Saving..." : "Save Changes"}
                                    </Button>
                                    <Link href={route("admin.fractional.offerings.index")}>
                                        <Button type="button" variant="outline">
                                            Cancel
                                        </Button>
                                    </Link>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Quick Tips</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-muted-foreground">
                            <div className="space-y-1">
                                <p className="font-medium text-foreground">Shares</p>
                                <p>Total shares represent the entire asset divided into fractions. Available shares are what's currently for sale.</p>
                            </div>
                            <div className="space-y-1">
                                <p className="font-medium text-foreground">Pricing</p>
                                <p>Set a fair price per share based on the total asset value divided by total shares.</p>
                            </div>
                            <div className="space-y-1">
                                <p className="font-medium text-foreground">Status</p>
                                <p>Start with "Draft" to prepare, then set to "Live" when ready for investors.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    )
}
