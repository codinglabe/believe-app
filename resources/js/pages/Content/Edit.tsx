import React, { useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { PageProps, ContentItem } from '@/types';
import AppLayout from '@/layouts/app-layout';
import { FileText, ArrowLeft, Upload, X, Tag, Image as ImageIcon, BookOpen, Heart, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';

interface ContentEditProps {
    contentItem: ContentItem;
}

const ContentEdit: React.FC<ContentEditProps> = ({ contentItem }) => {
    const { flash } = usePage<PageProps>().props;
    const [imagePreview, setImagePreview] = useState<string | null>(contentItem.meta?.image_url || null);

    const { data, setData, errors, put, processing } = useForm({
        title: contentItem.title || '',
        body: contentItem.body || '',
        type: contentItem.type || 'prayer',
        meta: {
            scripture_ref: contentItem.meta?.scripture_ref || '',
            image: null as File | null,
            tags: contentItem.meta?.tags || [] as string[],
            image_url: contentItem.meta?.image_url || '', // Keep original image URL
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Use regular object instead of FormData for updates (unless changing image)
        const submitData = {
            title: data.title,
            body: data.body,
            type: data.type,
            meta: {
                scripture_ref: data.meta.scripture_ref,
                tags: data.meta.tags,
                // Only include image if a new one was selected
                ...(data.meta.image && { image: data.meta.image }),
                // Keep original image_url if no new image
                ...(!data.meta.image && { image_url: data.meta.image_url }),
            }
        };

        put(route('content.items.update', contentItem.id), submitData);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('meta', {
                ...data.meta,
                image: file
            });

            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setData('meta', {
            ...data.meta,
            image: null,
            image_url: '' // Remove image URL when removing image
        });
        setImagePreview(null);
    };

    const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
            e.preventDefault();
            const newTag = e.currentTarget.value.trim();
            setData('meta', {
                ...data.meta,
                tags: [...data.meta.tags, newTag]
            });
            e.currentTarget.value = '';
        }
    };

    const removeTag = (index: number) => {
        setData('meta', {
            ...data.meta,
            tags: data.meta.tags.filter((_, i) => i !== index)
        });
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'prayer':
                return <Heart className="h-5 w-5" />;
            case 'devotional':
                return <BookOpen className="h-5 w-5" />;
            case 'scripture':
                return <Sparkles className="h-5 w-5" />;
            default:
                return <FileText className="h-5 w-5" />;
        }
    };

    return (
        <AppLayout>
            <Head title="Edit Content" />

            <div className="py-6">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
                            {flash?.success}
                        </div>
                    )}

                    {/* Professional Header */}
                    <div className="mb-8">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                            <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                                <div className="p-2 sm:p-3 rounded-xl bg-primary/10 flex-shrink-0">
                                    <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                <Link
                                    href={route('content.items.index')}
                                            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                                >
                                            <ArrowLeft className="h-3 w-3" />
                                            Content
                                </Link>
                                        <span className="text-muted-foreground">/</span>
                                        <span className="text-sm text-muted-foreground">Edit</span>
                                    </div>
                                    <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-2">Edit Content</h1>
                                    <p className="text-muted-foreground text-sm sm:text-base">
                                        Update your prayer or devotional content
                                    </p>
                                </div>
                            </div>
                        </div>
                            </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Content Type Section */}
                        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <FileText className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-semibold">Content Type</h2>
                                <span className="text-sm text-muted-foreground">*</span>
                            </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {(['prayer', 'devotional', 'scripture'] as const).map((type) => (
                                    <button
                                                key={type}
                                        type="button"
                                        onClick={() => setData('type', type)}
                                        className={`relative flex flex-col items-center justify-center rounded-xl border-2 p-6 transition-all ${
                                                    data.type === type
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border bg-background hover:border-primary/50'
                                                }`}
                                            >
                                        <div className={`mb-3 ${data.type === type ? 'text-primary' : 'text-muted-foreground'}`}>
                                            {getTypeIcon(type)}
                                        </div>
                                        <div className={`font-semibold text-sm ${data.type === type ? 'text-primary' : ''}`}>
                                                                {type.charAt(0).toUpperCase() + type.slice(1)}
                                                    </div>
                                                    {data.type === type && (
                                            <div className="absolute top-3 right-3">
                                                <CheckCircle2 className="h-5 w-5 text-primary" />
                                                        </div>
                                                    )}
                                    </button>
                                        ))}
                                    </div>
                            {errors.type && (
                                <div className="flex items-center gap-1.5 mt-4 text-sm text-destructive">
                                    <X className="h-4 w-4" />
                                    {errors.type}
                                </div>
                            )}
                        </div>

                        {/* Basic Information Section */}
                        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <FileText className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-semibold">Basic Information</h2>
                                </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-primary" />
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                        placeholder="Enter a meaningful title..."
                                    />
                                    {errors.title && (
                                        <div className="flex items-center gap-1.5 mt-2 text-sm text-destructive">
                                            <X className="h-4 w-4" />
                                            {errors.title}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                        <BookOpen className="h-4 w-4 text-primary" />
                                        Scripture Reference
                                    </label>
                                    <input
                                        type="text"
                                        value={data.meta.scripture_ref}
                                        onChange={(e) => setData('meta', { ...data.meta, scripture_ref: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                        placeholder="e.g., John 3:16"
                                    />
                                    {errors['meta.scripture_ref'] && (
                                        <div className="flex items-center gap-1.5 mt-2 text-sm text-destructive">
                                            <X className="h-4 w-4" />
                                            {errors['meta.scripture_ref']}
                                        </div>
                                    )}
                                </div>
                            </div>
                                </div>

                        {/* Featured Image Section */}
                        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <ImageIcon className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-semibold">Featured Image</h2>
                            </div>

                                    {imagePreview ? (
                                <div className="relative group">
                                            <img
                                                src={imagePreview}
                                                alt="Preview"
                                        className="w-full h-64 object-cover rounded-lg border border-border"
                                            />
                                    <div className="absolute top-3 right-3 flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={removeImage}
                                            className="bg-destructive text-destructive-foreground p-2 rounded-full hover:bg-destructive/90 transition-colors shadow-lg"
                                                    title="Remove image"
                                                >
                                            <X className="h-4 w-4" />
                                                </button>
                                                {contentItem.meta?.image_url && imagePreview !== contentItem.meta.image_url && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setImagePreview(contentItem.meta?.image_url || null);
                                                            setData('meta', {
                                                                ...data.meta,
                                                                image: null,
                                                                image_url: contentItem.meta?.image_url || ''
                                                            });
                                                        }}
                                                className="bg-card border border-border text-foreground p-2 rounded-full hover:bg-accent transition-colors shadow-lg"
                                                        title="Restore original image"
                                                    >
                                                <RotateCcw className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : contentItem.meta?.image_url ? (
                                <div className="relative group">
                                            <img
                                                src={contentItem.meta.image_url}
                                                alt="Current"
                                        className="w-full h-64 object-cover rounded-lg border border-border"
                                            />
                                    <div className="absolute top-3 right-3">
                                                <button
                                                    type="button"
                                                    onClick={removeImage}
                                            className="bg-destructive text-destructive-foreground p-2 rounded-full hover:bg-destructive/90 transition-colors shadow-lg"
                                                    title="Remove image"
                                                >
                                            <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                <label className="flex flex-col items-center justify-center px-6 pt-8 pb-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
                                    <div className="flex flex-col items-center space-y-3">
                                        <div className="p-3 rounded-full bg-primary/10">
                                            <Upload className="h-8 w-8 text-primary" />
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm font-medium text-primary">Upload an image</span>
                                            <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 2MB</p>
                                                        <input
                                                            type="file"
                                                            className="sr-only"
                                                            accept="image/*"
                                                            onChange={handleImageChange}
                                                        />
                                    </div>
                                                    </label>
                                    )}
                            {errors['meta.image'] && (
                                <div className="flex items-center gap-1.5 mt-4 text-sm text-destructive">
                                    <X className="h-4 w-4" />
                                    {errors['meta.image']}
                                </div>
                            )}
                                </div>

                        {/* Content Body Section */}
                        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <FileText className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-semibold">Content Body</h2>
                                <span className="text-sm text-muted-foreground">*</span>
                            </div>
                                    <textarea
                                        value={data.body}
                                        onChange={(e) => setData('body', e.target.value)}
                                        rows={12}
                                className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-vertical"
                                        placeholder="Write your prayer or devotional content here..."
                                    />
                            {errors.body && (
                                <div className="flex items-center gap-1.5 mt-4 text-sm text-destructive">
                                    <X className="h-4 w-4" />
                                    {errors.body}
                                </div>
                            )}
                                </div>

                        {/* Tags Section */}
                        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <Tag className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-semibold">Tags</h2>
                                <span className="text-xs text-muted-foreground">(Press Enter to add tags)</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-4">
                                        {data.meta.tags.map((tag, index) => (
                                            <span
                                                key={index}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                                            >
                                                {tag}
                                                <button
                                                    type="button"
                                                    onClick={() => removeTag(index)}
                                            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                                            title="Remove tag"
                                                >
                                            <X className="h-3 w-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Type a tag and press Enter..."
                                        onKeyDown={addTag}
                                className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    />
                            <p className="text-xs text-muted-foreground mt-2">
                                Add tags to help organize and search your content
                            </p>
                                </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-4 pt-6 border-t border-border">
                                    <Link
                                        href={route('content.items.index')}
                                className="px-6 py-2.5 border border-border rounded-lg hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                                    >
                                        Cancel
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                className="px-8 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center gap-2 shadow-sm hover:shadow-md"
                                    >
                                {processing ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="h-4 w-4" />
                                        Update Content
                                    </>
                                )}
                                    </button>
                                </div>
                            </form>
                </div>
            </div>
        </AppLayout>
    );
};

export default ContentEdit;
