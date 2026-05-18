import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { PageProps, Campaign, CampaignStats } from '@/types';
import AppLayout from '@/layouts/app-layout';
import { Calendar, Clock, Radio, CheckCircle2, User, ArrowLeft, FileText, Send } from 'lucide-react';

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
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
                            {flash?.success}
                        </div>
                    )}

                    {/* Professional Header */}
                    <div className="mb-8">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                <div className="p-3 rounded-xl bg-primary/10 flex-shrink-0">
                                    <Radio className="h-6 w-6 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Link
                                            href={route('campaigns.index')}
                                            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                                        >
                                            <ArrowLeft className="h-3 w-3" />
                                            Campaigns
                                        </Link>
                                        <span className="text-muted-foreground">/</span>
                                        <span className="text-sm text-muted-foreground truncate">{campaign.name}</span>
                                    </div>
                                    <h1 className="text-3xl font-bold mb-2">{campaign.name}</h1>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <User className="h-4 w-4" />
                                            <span>Created by {campaign.user.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-4 w-4" />
                                            <span>{new Date(campaign.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <Link
                                href={route('campaigns.index')}
                                className="inline-flex items-center gap-2 bg-card border border-border hover:bg-accent font-medium py-2.5 px-4 rounded-lg transition-colors shadow-sm hover:shadow-md"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Campaigns
                            </Link>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 overflow-hidden rounded-lg shadow-sm">
                            <div className="px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Total Drops</dt>
                                <dd className="mt-1 text-3xl font-semibold text-blue-900 dark:text-blue-300">{stats.total_drops}</dd>
                            </div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 overflow-hidden rounded-lg shadow-sm">
                            <div className="px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-green-600 dark:text-green-400 truncate">Sent Drops</dt>
                                <dd className="mt-1 text-3xl font-semibold text-green-900 dark:text-green-300">{stats.sent_drops}</dd>
                            </div>
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 overflow-hidden rounded-lg shadow-sm">
                            <div className="px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-yellow-600 dark:text-yellow-400 truncate">Pending Drops</dt>
                                <dd className="mt-1 text-3xl font-semibold text-yellow-900 dark:text-yellow-300">{stats.pending_drops}</dd>
                            </div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 overflow-hidden rounded-lg shadow-sm">
                            <div className="px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-purple-600 dark:text-purple-400 truncate">Total Sends</dt>
                                <dd className="mt-1 text-3xl font-semibold text-purple-900 dark:text-purple-300">{stats.total_sends}</dd>
                            </div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 overflow-hidden rounded-lg shadow-sm">
                            <div className="px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-green-600 dark:text-green-400 truncate">Successful</dt>
                                <dd className="mt-1 text-3xl font-semibold text-green-900 dark:text-green-300">{stats.successful_sends}</dd>
                            </div>
                        </div>
                    </div>

                    {/* Campaign Details - Professional Design */}
                    <div className="bg-card border border-border rounded-xl shadow-sm mb-8 overflow-hidden">
                        <div className="px-6 py-4 border-b border-border bg-muted/30">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Campaign Details
                            </h3>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Period */}
                                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <Calendar className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <dt className="text-sm font-medium text-muted-foreground mb-1">Campaign Period</dt>
                                            <dd className="text-sm font-semibold">
                                                {new Date(campaign.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(campaign.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </dd>
                                        </div>
                                    </div>
                                </div>

                                {/* Send Time */}
                                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <Clock className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <dt className="text-sm font-medium text-muted-foreground mb-1">Send Time</dt>
                                            <dd className="text-sm font-semibold">
                                                {campaign.send_time_local}
                                                <span className="text-xs text-muted-foreground ml-1">(Local Time)</span>
                                            </dd>
                                        </div>
                                    </div>
                                </div>

                                {/* Channels */}
                                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <Send className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <dt className="text-sm font-medium text-muted-foreground mb-2">Delivery Channels</dt>
                                            <dd className="flex flex-wrap gap-2">
                                                {campaign.channels.map((channel) => (
                                                    <span key={channel} className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                                        {channel}
                                                    </span>
                                                ))}
                                            </dd>
                                        </div>
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <CheckCircle2 className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <dt className="text-sm font-medium text-muted-foreground mb-1">Campaign Status</dt>
                                            <dd>
                                                <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold ${getStatusColor(campaign.status)}`}>
                                                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                                                </span>
                                            </dd>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scheduled Drops - Professional Design */}
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-primary" />
                                Scheduled Drops
                            </h3>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                                <span className="text-sm font-semibold text-primary">{campaign.scheduled_drops.length}</span>
                                <span className="text-xs text-muted-foreground">total drops</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Date & Time
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Content
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Delivery Channels
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-card divide-y divide-border">
                                    {campaign.scheduled_drops.map((drop, index) => (
                                        <tr key={drop.id} className="hover:bg-accent/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-md bg-primary/10">
                                                        <Clock className="h-3.5 w-3.5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold">
                                                            {formatDateTime(drop.publish_at_utc).split(',')[0]}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {formatDateTime(drop.publish_at_utc).split(',')[1]?.trim()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="max-w-md">
                                                    <div className="text-sm font-semibold mb-1.5 line-clamp-1">
                                                        {drop.content_item.title}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground line-clamp-2">
                                                        {drop.content_item.body.replace(/<[^>]*>/g, '').substring(0, 120)}
                                                        {drop.content_item.body.replace(/<[^>]*>/g, '').length > 120 && '...'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold ${getStatusColor(drop.status)}`}>
                                                    {drop.status.charAt(0).toUpperCase() + drop.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1.5 max-w-xs">
                                                    {drop.send_jobs.reduce((acc: any, job) => {
                                                        acc[job.channel] = (acc[job.channel] || 0) + 1;
                                                        return acc;
                                                    }, {}) && Object.entries(drop.send_jobs.reduce((acc: any, job) => {
                                                        acc[job.channel] = (acc[job.channel] || 0) + 1;
                                                        return acc;
                                                    }, {})).map(([channel, count]) => (
                                                        <div
                                                            key={channel}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20"
                                                        >
                                                            <span className="text-xs font-semibold text-primary">{channel}</span>
                                                            <span className="text-xs text-muted-foreground">({count as number})</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {campaign.scheduled_drops.length === 0 && (
                                <div className="text-center py-12">
                                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                    <p className="text-sm text-muted-foreground">No scheduled drops found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default CampaignsShow;
