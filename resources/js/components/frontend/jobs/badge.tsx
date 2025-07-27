import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";

export function JobTypeBadge({ type, className }: { type: string; className?: string }) {
    const getBadgeInfo = () => {
        switch (type) {
            case 'volunteer':
                return { text: 'Volunteer', variant: 'secondary' as const };
            case 'paid':
                return { text: 'Paid', variant: 'default' as const };
            case 'internship':
                return { text: 'Internship', variant: 'outline' as const };
            case 'medicaid':
                return { text: 'Medicaid', variant: 'secondary' as const };
            default:
                return { text: type, variant: 'secondary' as const };
        }
    };

    const { text, variant } = getBadgeInfo();

    return (
        <Badge
            variant={variant}
            className={cn("rounded-full", className)}
        >
            {text}
        </Badge>
    );
}

export function LocationTypeBadge({ type, className }: { type: string; className?: string }) {
    const getBadgeInfo = () => {
        switch (type) {
            case 'onsite':
                return { text: 'Onsite', variant: 'secondary' as const };
            case 'remote':
                return { text: 'Remote', variant: 'default' as const };
            case 'hybrid':
                return { text: 'Hybrid', variant: 'outline' as const };
            default:
                return { text: type, variant: 'secondary' as const };
        }
    };

    const { text, variant } = getBadgeInfo();

    return (
        <Badge
            variant={variant}
            className={cn("rounded-full", className)}
        >
            {text}
        </Badge>
    );
}

// Additional badge components for job status if needed
export function JobStatusBadge({ status, className }: { status: string; className?: string }) {
    const getBadgeInfo = () => {
        switch (status) {
            case 'open':
                return { text: 'Open', variant: 'default' as const };
            case 'draft':
                return { text: 'Draft', variant: 'outline' as const };
            case 'closed':
                return { text: 'Closed', variant: 'destructive' as const };
            case 'filled':
                return { text: 'Filled', variant: 'destructive' as const };
            default:
                return { text: status, variant: 'secondary' as const };
        }
    };

    const { text, variant } = getBadgeInfo();

    return (
        <Badge
            variant={variant}
            className={cn("rounded-full", className)}
        >
            {text}
        </Badge>
    );
}
