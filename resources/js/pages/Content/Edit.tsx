import React, { useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { PageProps, ContentItem } from '@/types';
import AppLayout from '@/layouts/app-layout';

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

    return (
        <AppLayout>
            <Head title="Edit Content" />

            <div className="py-6">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded dark:bg-green-900 dark:border-green-700 dark:text-green-300">
                            {flash?.success}
                        </div>
                    )}

                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Content</h2>
                                    <p className="text-gray-600 dark:text-gray-400">Update your content</p>
                                </div>
                                <Link
                                    href={route('content.items.index')}
                                    className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-md transition-colors"
                                >
                                    Back to Content
                                </Link>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Content Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Content Type *
                                    </label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {(['prayer', 'devotional', 'scripture'] as const).map((type) => (
                                            <label
                                                key={type}
                                                className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none transition-colors ${
                                                    data.type === type
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                                                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="type"
                                                    value={type}
                                                    checked={data.type === type}
                                                    onChange={(e) => setData('type', e.target.value as any)}
                                                    className="sr-only"
                                                />
                                                <div className="flex w-full items-center justify-between">
                                                    <div className="flex items-center">
                                                        <div className="text-sm">
                                                            <div className={`font-medium ${
                                                                data.type === type
                                                                    ? 'text-blue-900 dark:text-blue-100'
                                                                    : 'text-gray-900 dark:text-gray-100'
                                                            }`}>
                                                                {type.charAt(0).toUpperCase() + type.slice(1)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {data.type === type && (
                                                        <div className="shrink-0 text-blue-600 dark:text-blue-400">
                                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                    {errors.type && <div className="text-red-500 text-sm mt-1 dark:text-red-400">{errors.type}</div>}
                                </div>

                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                                        placeholder="Enter a meaningful title..."
                                    />
                                    {errors.title && <div className="text-red-500 text-sm mt-1 dark:text-red-400">{errors.title}</div>}
                                </div>

                                {/* Scripture Reference */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Scripture Reference
                                    </label>
                                    <input
                                        type="text"
                                        value={data.meta.scripture_ref}
                                        onChange={(e) => setData('meta', { ...data.meta, scripture_ref: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                                        placeholder="e.g., John 3:16"
                                    />
                                    {errors['meta.scripture_ref'] && <div className="text-red-500 text-sm mt-1 dark:text-red-400">{errors['meta.scripture_ref']}</div>}
                                </div>

                                {/* Image Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Featured Image
                                    </label>

                                    {imagePreview ? (
                                        <div className="relative">
                                            <img
                                                src={imagePreview}
                                                alt="Preview"
                                                className="w-full h-64 object-cover rounded-lg"
                                            />
                                            <div className="absolute top-2 right-2 flex space-x-2">
                                                <button
                                                    type="button"
                                                    onClick={removeImage}
                                                    className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                                                    title="Remove image"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
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
                                                        className="bg-gray-500 text-white p-1 rounded-full hover:bg-gray-600 transition-colors"
                                                        title="Restore original image"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v0M3 10l6 6m-6-6l6-6" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : contentItem.meta?.image_url ? (
                                        <div className="relative">
                                            <img
                                                src={contentItem.meta.image_url}
                                                alt="Current"
                                                className="w-full h-64 object-cover rounded-lg"
                                            />
                                            <div className="absolute top-2 right-2">
                                                <button
                                                    type="button"
                                                    onClick={removeImage}
                                                    className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                                                    title="Remove image"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                                            <div className="space-y-1 text-center">
                                                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                                    <label className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                                        <span>Upload an image</span>
                                                        <input
                                                            type="file"
                                                            className="sr-only"
                                                            accept="image/*"
                                                            onChange={handleImageChange}
                                                        />
                                                    </label>
                                                    <p className="pl-1">or drag and drop</p>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    PNG, JPG, GIF up to 2MB
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {errors['meta.image'] && <div className="text-red-500 text-sm mt-1 dark:text-red-400">{errors['meta.image']}</div>}
                                </div>

                                {/* Content Body */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Content Body *
                                    </label>
                                    <textarea
                                        value={data.body}
                                        onChange={(e) => setData('body', e.target.value)}
                                        rows={12}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                                        placeholder="Write your prayer or devotional content here..."
                                    />
                                    {errors.body && <div className="text-red-500 text-sm mt-1 dark:text-red-400">{errors.body}</div>}
                                </div>

                                {/* Tags */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Tags
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {data.meta.tags.map((tag, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                            >
                                                {tag}
                                                <button
                                                    type="button"
                                                    onClick={() => removeTag(index)}
                                                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Type a tag and press Enter..."
                                        onKeyDown={addTag}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                                    />
                                </div>

                                {/* Form Actions */}
                                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <Link
                                        href={route('content.items.index')}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                    >
                                        Cancel
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {processing ? 'Updating...' : 'Update Content'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default ContentEdit;
