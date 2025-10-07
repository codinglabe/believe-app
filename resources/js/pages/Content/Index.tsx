import React, { useEffect, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { PageProps, ContentItem, PaginatedResponse } from '@/types';
import AppLayout from '@/layouts/app-layout';

interface ContentIndexProps {
    contentItems: PaginatedResponse<ContentItem>;
    filters?: {
        search?: string;
        type?: string;
        sort?: string;
    };
}

const ContentIndex: React.FC<ContentIndexProps> = ({ contentItems, filters }) => {
    const { flash } = usePage<PageProps>().props;

    // Safely handle undefined filters with default values
    const safeFilters = filters || {};

    console.log('Content Items:', safeFilters);
    const [search, setSearch] = useState(safeFilters.search || '');
    const [typeFilter, setTypeFilter] = useState(safeFilters.type || 'all');

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            router.get(route('content.items.index'), {
                search: search || undefined,
                type: typeFilter !== 'all' ? typeFilter : undefined,
            }, {
                preserveState: true,
                replace: true,
            });
        }, 500);

        return () => clearTimeout(timer);
    }, [search, typeFilter]);

    const clearFilters = () => {
        setSearch('');
        setTypeFilter('all');
        router.get(route('content.items.index'), {}, { preserveState: true });
    };

    const getTypeBadgeColor = (type: string) => {
        switch (type) {
            case 'prayer':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'devotional':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'scripture':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'prayer':
                return (
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                );
            case 'devotional':
                return (
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                );
            case 'scripture':
                return (
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                );
        }
    };



    const hasActiveFilters = search || typeFilter !== 'all';

    // Safely handle contentItems data
    const safeContentItems = contentItems || {
        data: [],
        meta: {
            current_page: 1,
            from: 0,
            last_page: 1,
            links: [],
            path: '',
            per_page: 12,
            to: 0,
            total: 0
        }
    };

    return (
        <AppLayout>
            <Head title="Content Library" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
                            {flash.success}
                        </div>
                    )}

                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            {/* Header Section */}
                            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-6 space-y-4 lg:space-y-0">
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Content Library</h2>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                                        Manage your prayers and devotional content
                                    </p>

                                    {/* Active Filters Summary */}
                                    {hasActiveFilters && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {search && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                    Search: "{search}"
                                                    <button
                                                        onClick={() => setSearch('')}
                                                        className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            )}
                                            {typeFilter !== 'all' && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                    Type: {typeFilter}
                                                    <button
                                                        onClick={() => setTypeFilter('all')}
                                                        className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-green-200 dark:hover:bg-green-800"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            )}
                                            {/* {sort !== 'newest' && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                                    Sort: {getSortLabel(sort)}
                                                    <button
                                                        onClick={() => setSort('newest')}
                                                        className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            )} */}
                                        </div>
                                    )}
                                </div>

                                {/* Create Content Button */}
                                <Link
                                    href={route('content.items.create')}
                                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg flex items-center transition-colors whitespace-nowrap self-start"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create Content
                                </Link>
                            </div>

                            {/* Filters Section */}
                            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                    <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
                                        {/* Search Input */}
                                        <div className="flex-1 min-w-0">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Search Content
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                    placeholder="Search by title, content, scripture, or tags..."
                                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors"
                                                />
                                                {search && (
                                                    <button
                                                        onClick={() => setSearch('')}
                                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                                    >
                                                        <svg className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Type Filter */}
                                        <div className="sm:w-48">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Content Type
                                            </label>
                                            <select
                                                value={typeFilter}
                                                onChange={(e) => setTypeFilter(e.target.value)}
                                                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                                            >
                                                <option value="all">All Types</option>
                                                <option value="prayer">Prayers</option>
                                                <option value="devotional">Devotionals</option>
                                                <option value="scripture">Scriptures</option>
                                            </select>
                                        </div>

                                        {/* Sort Filter */}
                                        {/* <div className="sm:w-48">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Sort By
                                            </label>
                                            <select
                                                value={sort}
                                                onChange={(e) => setSort(e.target.value)}
                                                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                                            >
                                                <option value="newest">Newest First</option>
                                                <option value="oldest">Oldest First</option>
                                                <option value="title">Title A-Z</option>
                                            </select>
                                        </div> */}
                                    </div>

                                    {/* Clear Filters Button */}
                                    {hasActiveFilters && (
                                        <div className="sm:self-end">
                                            <button
                                                onClick={clearFilters}
                                                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Results Summary */}
                            <div className="mb-6 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {safeContentItems.meta?.total === 0 ? 'No content found' :
                                         `Showing ${safeContentItems.meta?.from || 0}-${safeContentItems.meta?.to || 0} of ${safeContentItems.meta?.total || 0} content items`}
                                    </p>
                                </div>
                                {hasActiveFilters && safeContentItems.data.length > 0 && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        Filtered results
                                    </div>
                                )}
                            </div>

                            {/* Content Grid */}
                            {safeContentItems.data.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                        {hasActiveFilters ? 'No content found' : 'No content yet'}
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                                        {hasActiveFilters
                                            ? 'Try adjusting your search or filters to find what you\'re looking for.'
                                            : 'Get started by creating your first prayer, devotional, or scripture content.'
                                        }
                                    </p>
                                    {hasActiveFilters ? (
                                        <button
                                            onClick={clearFilters}
                                            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                                        >
                                            Clear Filters
                                        </button>
                                    ) : (
                                        <Link
                                            href={route('content.items.create')}
                                            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                                        >
                                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Create Your First Content
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {/* Stats Summary */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                            <div className="flex items-center">
                                                <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-lg mr-3">
                                                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Prayers</p>
                                                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                                                        {safeContentItems.data.filter(item => item.type === 'prayer').length}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                            <div className="flex items-center">
                                                <div className="bg-green-100 dark:bg-green-800 p-2 rounded-lg mr-3">
                                                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Devotionals</p>
                                                    <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                                                        {safeContentItems.data.filter(item => item.type === 'devotional').length}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                                            <div className="flex items-center">
                                                <div className="bg-purple-100 dark:bg-purple-800 p-2 rounded-lg mr-3">
                                                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Scriptures</p>
                                                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                                                        {safeContentItems.data.filter(item => item.type === 'scripture').length}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                            <div className="flex items-center">
                                                <div className="bg-gray-100 dark:bg-gray-600 p-2 rounded-lg mr-3">
                                                    <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                                                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-300">
                                                        {safeContentItems.meta?.total || safeContentItems.data.length}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {safeContentItems.data.map((item: ContentItem) => (
                                            <div
                                                key={item.id}
                                                className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm hover:shadow-md dark:hover:shadow-gray-900/50 transition-all duration-200 hover:translate-y-[-2px]"
                                            >
                                                {/* Image */}
                                                {item.meta?.image_url && (
                                                    <div className="relative">
                                                        <img
                                                            src={item.meta.image_url}
                                                            alt={item.title}
                                                            className="w-full h-48 object-cover rounded-t-xl"
                                                        />
                                                        <div className="absolute top-3 right-3">
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getTypeBadgeColor(item.type)}`}>
                                                                {getTypeIcon(item.type)}
                                                                {item.type}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Content */}
                                                <div className="p-5">
                                                    {/* Header with type badge if no image */}
                                                    {!item.meta?.image_url && (
                                                        <div className="flex justify-between items-start mb-3">
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getTypeBadgeColor(item.type)}`}>
                                                                {getTypeIcon(item.type)}
                                                                {item.type}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Title */}
                                                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-2 mb-2 leading-tight">
                                                        {item.title}
                                                    </h3>

                                                    {/* Body Preview */}
                                                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3 leading-relaxed">
                                                        {item.body.replace(/<[^>]*>/g, '')}
                                                    </p>

                                                    {/* Scripture Reference */}
                                                    {item.meta?.scripture_ref && (
                                                        <div className="flex items-center text-sm text-blue-600 dark:text-blue-400 mb-4">
                                                            <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                            </svg>
                                                            <span className="font-medium">{item.meta.scripture_ref}</span>
                                                        </div>
                                                    )}

                                                    {/* Footer */}
                                                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
                                                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                                                            <span>By {item.user?.name || 'Unknown'}</span>
                                                            <span>•</span>
                                                            <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                                        </div>

                                                        {/* Action Buttons */}
                                                        <div className="flex space-x-2">
                                                            <Link
                                                                href={route('content.items.edit', item.id)}
                                                                className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                                                                title="Edit content"
                                                            >
                                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                                Edit
                                                            </Link>
                                                            <Link
                                                                href={route('content.items.destroy', item.id)}
                                                                method="delete"
                                                                as="button"
                                                                className="inline-flex items-center px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium transition-colors"
                                                                title="Delete content"
                                                                onClick={(e: React.MouseEvent) => {
                                                                    if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
                                                                        e.preventDefault();
                                                                    }
                                                                }}
                                                            >
                                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                                Delete
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Pagination */}
                                    {safeContentItems.meta && safeContentItems.meta.last_page > 1 && (
                                        <div className="mt-8 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                                            <div className="text-sm text-gray-700 dark:text-gray-300">
                                                Showing {safeContentItems.meta.from} to {safeContentItems.meta.to} of {safeContentItems.meta.total} results
                                            </div>
                                            <nav className="flex space-x-1">
                                                {safeContentItems.meta.links.map((link: any, index: number) => (
                                                    <Link
                                                        key={index}
                                                        href={link.url || '#'}
                                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                                            link.active
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                                                        } ${!link.url && 'opacity-50 cursor-not-allowed pointer-events-none'}`}
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                    />
                                                ))}
                                            </nav>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default ContentIndex;
