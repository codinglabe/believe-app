import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";

export function JobTypeBadge({ type, className }: { type: string; className?: string }) {
    const getBadgeColor = () => {
        switch (type) {
            case 'volunteer':
                return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
            case 'paid':
                return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
            case 'internship':
                return 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800';
            case 'contract':
                return 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
        }
    };

    const getText = () => {
        return type.charAt(0).toUpperCase() + type.slice(1);
    };

    return (
        <Badge
            className={cn("rounded-md px-2.5 py-0.5 text-sm font-medium", getBadgeColor(), className)}
        >
            {getText()}
        </Badge>
    );
}

export function LocationTypeBadge({ type, className }: { type: string; className?: string }) {
    const getBadgeColor = () => {
        switch (type) {
            case 'onsite':
                return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
            case 'remote':
                return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800';
            case 'hybrid':
                return 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border border-teal-200 dark:border-teal-800';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
        }
    };

    const getText = () => {
        return type.charAt(0).toUpperCase() + type.slice(1);
    };

    return (
        <Badge
            className={cn("rounded-md px-2.5 py-0.5 text-sm font-medium", getBadgeColor(), className)}
        >
            {getText()}
        </Badge>
    );
}

// Additional badge components for job status if needed
export function JobStatusBadge({ status, className }: { status: string; className?: string }) {
    const getBadgeColor = () => {
        switch (status) {
            case 'open':
                return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
            case 'draft':
                return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
            case 'closed':
                return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800';
            case 'filled':
                return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
        }
    };

    const getText = () => {
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    return (
        <Badge
            className={cn("rounded-md px-2.5 py-0.5 text-sm font-medium", getBadgeColor(), className)}
        >
            {getText()}
        </Badge>
    );
}
