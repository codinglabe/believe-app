import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { PageProps, Campaign, CampaignStats } from '@/types';
import AppLayout from '@/layouts/app-layout';

interface CampaignsShowProps {
    campaign: Campaign & {
        scheduled_drops: Array<{
            id: number;
            publish_at_utc: string;
            status: string;
            content_item: {
                id: number;
                title: string;
                body: string;
                meta: any;
            };
            send_jobs: Array<{
                id: number;
                status: string;
                channel: string;
                user: {
                    id: number;
                    name: string;
                };
            }>;
        }>;
    };
    stats: CampaignStats;
}

const CampaignsShow: React.FC<CampaignsShowProps> = ({ campaign, stats }) => {
    const { flash } = usePage<PageProps>().props;
    const auth = usePage<PageProps>().props.auth;

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            timeZone: auth.user.timezone, // Force UTC timezone
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

// Example output: "Dec 25, 2024, 02:30 PM UTC"

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'sent': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'expanded': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        }
    };

    const getJobStatusColor = (status: string) => {
        switch (status) {
            case 'sent': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'queued': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        }
    };

    return (
        <AppLayout>
            <Head title={`Campaign - ${campaign.name}`} />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded dark:bg-green-900 dark:border-green-700 dark:text-green-200">
                            {flash?.success}
                        </div>
                    )}

                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{campaign.name}</h1>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Created by {campaign.user.name} on {new Date(campaign.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <Link
                                href={route('campaigns.index')}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
                            >
                                Back to Campaigns
                            </Link>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Drops</dt>
                                <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{stats.total_drops}</dd>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Sent Drops</dt>
                                <dd className="mt-1 text-3xl font-semibold text-green-600 dark:text-green-400">{stats.sent_drops}</dd>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Pending Drops</dt>
                                <dd className="mt-1 text-3xl font-semibold text-yellow-600 dark:text-yellow-400">{stats.pending_drops}</dd>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Sends</dt>
                                <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{stats.total_sends}</dd>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Successful</dt>
                                <dd className="mt-1 text-3xl font-semibold text-green-600 dark:text-green-400">{stats.successful_sends}</dd>
                            </div>
                        </div>
                    </div>

                    {/* Campaign Details */}
                    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg mb-6">
                        <div className="px-4 py-5 sm:px-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Campaign Details</h3>
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-700">
                            <dl>
                                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Period</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-200 sm:mt-0 sm:col-span-2">
                                        {new Date(campaign.start_date).toLocaleDateString()} to {new Date(campaign.end_date).toLocaleDateString()}
                                    </dd>
                                </div>
                                <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Send Time</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-200 sm:mt-0 sm:col-span-2">
                                        {campaign.send_time_local} (Local Time)
                                    </dd>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Channels</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-200 sm:mt-0 sm:col-span-2">
                                        <div className="flex flex-wrap gap-2">
                                            {campaign.channels.map((channel) => (
                                                <span key={channel} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                    {channel}
                                                </span>
                                            ))}
                                        </div>
                                    </dd>
                                </div>
                                <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
                                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-200 sm:mt-0 sm:col-span-2">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                                            {campaign.status}
                                        </span>
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>

                    {/* Scheduled Drops */}
                    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Scheduled Drops</h3>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {campaign.scheduled_drops.length} total
                            </span>
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-700">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Date & Time
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Content
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Sends
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {campaign.scheduled_drops.map((drop) => (
                                            <tr key={drop.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                                    {formatDateTime(drop.publish_at_utc)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {drop.content_item.title}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                                        {drop.content_item.body.replace(/<[^>]*>/g, '').substring(0, 100)}...
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(drop.status)}`}>
                                                        {drop.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                                    <div className="flex flex-col space-y-1">
                                                        {drop.send_jobs.reduce((acc: any, job) => {
                                                            acc[job.channel] = (acc[job.channel] || 0) + 1;
                                                            return acc;
                                                        }, {}) && Object.entries(drop.send_jobs.reduce((acc: any, job) => {
                                                            acc[job.channel] = (acc[job.channel] || 0) + 1;
                                                            return acc;
                                                        }, {})).map(([channel, count]) => (
                                                            <div key={channel} className="flex items-center text-xs">
                                                                <span className="font-medium text-gray-900 dark:text-gray-200">{channel}:</span>
                                                                <span className="ml-1 text-gray-600 dark:text-gray-400">{count as number}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default CampaignsShow;
