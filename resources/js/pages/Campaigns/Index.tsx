import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { PageProps, Campaign, PaginatedResponse } from '@/types';
import AppLayout from '@/layouts/app-layout';

interface CampaignsIndexProps {
    campaigns: PaginatedResponse<Campaign>;
}

const CampaignsIndex: React.FC<CampaignsIndexProps> = ({ campaigns }) => {
    const { flash } = usePage<PageProps>().props;

    // Safely handle campaigns data without breaking pagination
    const safeCampaigns = campaigns || {
        data: [],
            current_page: 1,
            from: null,
            last_page: 1,
            links: [],
            path: '',
            per_page: 10,
            to: null,
            total: 0
    };


    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'paused':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'cancelled':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active':
                return (
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                );
            case 'paused':
                return (
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'cancelled':
                return (
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
        }
    };

    const getChannelIcon = (channel: string) => {
        switch (channel) {
            case 'push':
                return (
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                );
            case 'whatsapp':
                return (
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                );
            case 'web':
                return (
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Debug: Check the structure of campaigns data
    console.log('Campaigns data:', safeCampaigns);

    return (
        <AppLayout>
            <Head title="Campaigns" />

            <div className="py-6">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
                            {flash?.success}
                        </div>
                    )}

                    <div className="bg-card border border-border overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 bg-card border-b border-border">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
                                <div>
                                    <h2 className="text-2xl font-bold">Campaigns</h2>
                                    <p className="text-muted-foreground mt-1">
                                        Manage your daily prayer campaigns
                                    </p>
                                </div>
                                <Link
                                    href={route('campaigns.create')}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-lg flex items-center transition-colors self-start"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create Campaign
                                </Link>
                            </div>

                            {/* Stats Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-lg mr-3">
                                            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Campaigns</p>
                                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                                                {safeCampaigns?.total || safeCampaigns.data.length}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <div className="bg-green-100 dark:bg-green-800 p-2 rounded-lg mr-3">
                                            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-green-600 dark:text-green-400">Active</p>
                                            <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                                                {safeCampaigns.data.filter(campaign => campaign.status === 'active').length}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <div className="bg-yellow-100 dark:bg-yellow-800 p-2 rounded-lg mr-3">
                                            <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Paused</p>
                                            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">
                                                {safeCampaigns.data.filter(campaign => campaign.status === 'paused').length}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <div className="bg-purple-100 dark:bg-purple-800 p-2 rounded-lg mr-3">
                                            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Drops</p>
                                            <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                                                {safeCampaigns.data.reduce((total, campaign) => total + (campaign.scheduled_drops_count || 0), 0)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Campaigns Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-border">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Campaign
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Period
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Send Time
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Channels
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-card divide-y divide-border">
                                        {safeCampaigns.data.map((campaign) => (
                                            <tr key={campaign.id} className="hover:bg-accent transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="bg-primary/10 p-2 rounded-lg mr-3">
                                                            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium">
                                                                {campaign.name}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {campaign.scheduled_drops_count || 0} scheduled drops
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm">
                                                        {formatDate(campaign.start_date)}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        to {formatDate(campaign.end_date)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center text-sm">
                                                        <svg className="w-4 h-4 mr-1 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        {campaign.send_time_local}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-wrap gap-1">
                                                        {campaign.channels?.map((channel) => (
                                                            <span
                                                                key={channel}
                                                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary"
                                                            >
                                                                {getChannelIcon(channel)}
                                                                {channel}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                                                        {getStatusIcon(campaign.status)}
                                                        {campaign.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex space-x-3">
                                                        <Link
                                                            href={route('campaigns.show', campaign.id)}
                                                            className="text-primary hover:text-primary/80 transition-colors flex items-center"
                                                            title="View campaign details"
                                                        >
                                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                            View
                                                        </Link>
                                                        <Link
                                                            href={route('campaigns.destroy', campaign.id)}
                                                            method="delete"
                                                            as="button"
                                                            className="text-destructive hover:text-destructive/80 transition-colors flex items-center"
                                                            title="Cancel campaign"
                                                            onClick={(e: React.MouseEvent) => {
                                                                if (!confirm('Are you sure you want to cancel this campaign? All pending scheduled drops will be cancelled.')) {
                                                                    e.preventDefault();
                                                                }
                                                            }}
                                                        >
                                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                            Cancel
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Empty State */}
                                {safeCampaigns.data.length === 0 && (
                                    <div className="text-center py-12">
                                        <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                                            <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-medium mb-2">No campaigns</h3>
                                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                            Get started by creating your first prayer campaign to schedule daily content delivery.
                                        </p>
                                        <div className="flex justify-center space-x-4">
                                            <Link
                                                href={route('campaigns.create')}
                                                className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
                                            >
                                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                                Create Campaign
                                            </Link>
                                            <Link
                                                href={route('content.items.index')}
                                                className="inline-flex items-center px-4 py-2 border border-border hover:bg-accent font-medium rounded-lg transition-colors"
                                            >
                                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Manage Content
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Pagination - Fixed */}
                            {safeCampaigns && safeCampaigns.last_page > 1 && (
                                <div className="mt-6 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                                    <div className="text-sm text-muted-foreground">
                                        Showing {safeCampaigns.from || 0} to {safeCampaigns.to || 0} of {safeCampaigns.total} results
                                    </div>
                                    <nav className="flex space-x-1">
                                        {safeCampaigns.links.map((link: any, index: number) => (
                                            <Link
                                                key={index}
                                                href={link.url || '#'}
                                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                                    link.active
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-card text-muted-foreground hover:bg-accent border border-border'
                                                } ${!link.url && 'opacity-50 cursor-not-allowed pointer-events-none'}`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ))}
                                    </nav>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default CampaignsIndex;
