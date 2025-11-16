"use client"

import type React from "react"
import { Head, useForm, Link } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save, Coins } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

interface AssetCreateProps {
    defaults: {
        type: string
    }
}

export default function AssetCreate({ defaults }: AssetCreateProps) {
    const { data, setData, post, processing, errors } = useForm({
        type: defaults.type || "gold",
        name: "",
        symbol: "",
        description: "",
        media: null as File[] | null,
        meta: {},
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        post(route("admin.fractional.assets.store"))
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { title: "Dashboard", href: "/dashboard" },
        { title: "Fractional Ownership", href: route("admin.fractional.assets.index") },
        { title: "Assets", href: route("admin.fractional.assets.index") },
        { title: "Create Asset", href: route("admin.fractional.assets.create") },
    ]

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Fractional Asset" />

            <div className="m-2 md:m-4 space-y-4">
                <div className="flex items-center gap-4">
                    <Link href={route("admin.fractional.assets.index")}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-semibold">Create New Asset</h1>
                        <p className="text-sm text-muted-foreground">Add a new asset type for fractional ownership.</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Coins className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <CardTitle>Asset Information</CardTitle>
                                <CardDescription>Enter the details for your fractional asset.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="type">Asset Type *</Label>
                                    <Input
                                        id="type"
                                        type="text"
                                        value={data.type}
                                        onChange={(e) => setData("type", e.target.value)}
                                        placeholder="e.g., gold, real-estate, art, cryptocurrency"
                                        required
                                        className={errors.type ? "border-red-500" : ""}
                                    />
                                    {errors.type && <p className="text-sm text-red-500">{errors.type}</p>}
                                    <p className="text-xs text-muted-foreground">The category or type of asset (e.g., gold, real estate, art)</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="name">Asset Name *</Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData("name", e.target.value)}
                                        placeholder="e.g., Gold Bar, Luxury Property"
                                        required
                                        className={errors.name ? "border-red-500" : ""}
                                    />
                                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                                    <p className="text-xs text-muted-foreground">A descriptive name for this asset</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="symbol">Symbol</Label>
                                    <Input
                                        id="symbol"
                                        type="text"
                                        value={data.symbol}
                                        onChange={(e) => setData("symbol", e.target.value)}
                                        placeholder="e.g., GLD, AU, BTC"
                                        className={errors.symbol ? "border-red-500" : ""}
                                    />
                                    {errors.symbol && <p className="text-sm text-red-500">{errors.symbol}</p>}
                                    <p className="text-xs text-muted-foreground">Optional trading symbol or abbreviation</p>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => setData("description", e.target.value)}
                                        placeholder="Provide a detailed description of the asset, its characteristics, and value proposition..."
                                        rows={5}
                                        className={errors.description ? "border-red-500" : ""}
                                    />
                                    {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                                    <p className="text-xs text-muted-foreground">Detailed information about the asset that will help investors make informed decisions</p>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4 border-t">
                                <Button type="submit" disabled={processing} className="min-w-[120px]">
                                    <Save className="h-4 w-4 mr-2" />
                                    {processing ? "Creating..." : "Create Asset"}
                                </Button>
                                <Link href={route("admin.fractional.assets.index")}>
                                    <Button type="button" variant="outline">
                                        Cancel
                                    </Button>
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    )
}
