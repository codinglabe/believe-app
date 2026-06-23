import { cn } from '@/lib/utils'

interface DepositPaymentMethodBadgeProps {
    label: string
    className?: string
}

/** Compact ACH / Wire / FedNow label for bank deposit rows. */
export function DepositPaymentMethodBadge({ label, className }: DepositPaymentMethodBadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center rounded-full bg-blue-500/10 px-1.5 py-0.5',
                'text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300',
                className,
            )}
        >
            {label}
        </span>
    )
}
