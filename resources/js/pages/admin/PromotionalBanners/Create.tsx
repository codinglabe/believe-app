"use client"

import React from "react"
import { Head, useForm, Link } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/admin/ui/switch"
import { 
    Save, 
    ArrowLeft,
    Image,
    Type,
} from "lucide-react"
import { ImageUpload } from "@/components/admin/ImageUpload"
import type { BreadcrumbItem } from "@/types"

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Promotional Banners', href: '/admin/promotional-banners' },
    { title: 'Create Banner', href: '/admin/promotional-banners/create' },
]

export default function AdminPromotionalBannersCreate() {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        type: 'text' as 'image' | 'text',
        image_url: '',
        text_content: '',
        external_link: '',
        is_active: true,
        display_order: 0,
        starts_at: '',
        ends_at: '',
        background_color: '#3b82f6',
        text_color: '#ffffff',
        description: '',
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        post('/admin/promotional-banners')
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Promotional Banner" />
            
            <div className="space-y-6 p-4 sm:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Promotional Banner</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                            Create a new promotional banner to display on the dashboard
                        </p>
                    </div>
                    <Link href="/admin/promotional-banners">
                        <Button variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Banners
                        </Button>
                    </Link>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Form */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Banner Details</CardTitle>
                                    <CardDescription>
                                        Configure the banner content and settings
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Title */}
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Title</Label>
                                        <Input
                                            id="title"
                                            value={data.title}
                                            onChange={(e) => setData('title', e.target.value)}
                                            placeholder="Banner title (optional)"
                                            className={errors.title ? 'border-red-500' : ''}
                                        />
                                        {errors.title && (
                                            <p className="text-sm text-red-500">{errors.title}</p>
                                        )}
                                    </div>

                                    {/* Type */}
                                    <div className="space-y-2">
                                        <Label>Banner Type *</Label>
                                        <div className="flex gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setData('type', 'text')}
                                                className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                                                    data.type === 'text' 
                                                        ? 'border-primary bg-primary/10' 
                                                        : 'border-gray-300 hover:border-gray-400'
                                                }`}
                                            >
                                                <Type className="h-6 w-6 mx-auto mb-2" />
                                                <div className="font-medium">Text Banner</div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setData('type', 'image')}
                                                className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                                                    data.type === 'image' 
                                                        ? 'border-primary bg-primary/10' 
                                                        : 'border-gray-300 hover:border-gray-400'
                                                }`}
                                            >
                                                <Image className="h-6 w-6 mx-auto mb-2" />
                                                <div className="font-medium">Image Banner</div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Text Content */}
                                    {data.type === 'text' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="text_content">Text Content *</Label>
                                            <Textarea
                                                id="text_content"
                                                value={data.text_content}
                                                onChange={(e) => setData('text_content', e.target.value)}
                                                placeholder="Enter banner text content"
                                                rows={4}
                                                className={errors.text_content ? 'border-red-500' : ''}
                                            />
                                            {errors.text_content && (
                                                <p className="text-sm text-red-500">{errors.text_content}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Image Upload */}
                                    {data.type === 'image' && (
                                        <div className="space-y-2">
                                            <ImageUpload
                                                label="Banner Image *"
                                                value={data.image_url}
                                                onChange={(file) => setData('image', file)}
                                                disabled={processing}
                                                processing={processing}
                                            />
                                            {(errors.image || errors.image_url) && (
                                                <p className="text-sm text-red-500">{errors.image || errors.image_url}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* External Link */}
                                    <div className="space-y-2">
                                        <Label htmlFor="external_link">External Link</Label>
                                        <Input
                                            id="external_link"
                                            type="url"
                                            value={data.external_link}
                                            onChange={(e) => setData('external_link', e.target.value)}
                                            placeholder="https://example.com"
                                            className={errors.external_link ? 'border-red-500' : ''}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            URL to redirect when banner is clicked (optional)
                                        </p>
                                        {errors.external_link && (
                                            <p className="text-sm text-red-500">{errors.external_link}</p>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder="Internal description (not displayed)"
                                            rows={2}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Display Settings */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Display Settings</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Display Order */}
                                        <div className="space-y-2">
                                            <Label htmlFor="display_order">Display Order</Label>
                                            <Input
                                                id="display_order"
                                                type="number"
                                                min="0"
                                                value={data.display_order}
                                                onChange={(e) => setData('display_order', parseInt(e.target.value) || 0)}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Lower numbers appear first
                                            </p>
                                        </div>

                                        {/* Background Color */}
                                        <div className="space-y-2">
                                            <Label htmlFor="background_color">Background Color</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="background_color"
                                                    type="color"
                                                    value={data.background_color}
                                                    onChange={(e) => setData('background_color', e.target.value)}
                                                    className="w-20 h-10"
                                                />
                                                <Input
                                                    type="text"
                                                    value={data.background_color}
                                                    onChange={(e) => setData('background_color', e.target.value)}
                                                    placeholder="#3b82f6"
                                                />
                                            </div>
                                        </div>

                                        {/* Text Color */}
                                        <div className="space-y-2">
                                            <Label htmlFor="text_color">Text Color</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="text_color"
                                                    type="color"
                                                    value={data.text_color}
                                                    onChange={(e) => setData('text_color', e.target.value)}
                                                    className="w-20 h-10"
                                                />
                                                <Input
                                                    type="text"
                                                    value={data.text_color}
                                                    onChange={(e) => setData('text_color', e.target.value)}
                                                    placeholder="#ffffff"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Date Range */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="starts_at">Start Date (Optional)</Label>
                                            <Input
                                                id="starts_at"
                                                type="datetime-local"
                                                value={data.starts_at}
                                                onChange={(e) => setData('starts_at', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ends_at">End Date (Optional)</Label>
                                            <Input
                                                id="ends_at"
                                                type="datetime-local"
                                                value={data.ends_at}
                                                onChange={(e) => setData('ends_at', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Active Status */}
                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div>
                                            <Label htmlFor="is_active">Active</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Banner will be displayed if active and within date range
                                            </p>
                                        </div>
                                        <Switch
                                            id="is_active"
                                            checked={data.is_active}
                                            onCheckedChange={(checked) => setData('is_active', checked)}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Preview */}
                        <div className="lg:col-span-1">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Preview</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div 
                                        className="rounded-lg p-6 border-2 border-dashed"
                                        style={{
                                            backgroundColor: data.background_color || '#3b82f6',
                                            color: data.text_color || '#ffffff',
                                            minHeight: '200px',
                                        }}
                                    >
                                        {data.type === 'image' && (data.image || data.image_url) ? (
                                            <img 
                                                src={data.image ? URL.createObjectURL(data.image) : data.image_url || '/placeholder.svg'} 
                                                alt={data.title || 'Banner'} 
                                                className="w-full h-48 object-cover rounded"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none'
                                                }}
                                            />
                                        ) : (
                                            <p className="text-center">
                                                {data.text_content || (data.type === 'image' ? 'Select an image to preview' : 'Enter text content to preview')}
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-4 pt-6">
                        <Link href="/admin/promotional-banners">
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing} className="bg-primary hover:bg-primary/90">
                            <Save className="h-4 w-4 mr-2" />
                            {processing ? 'Creating...' : 'Create Banner'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    )
}

