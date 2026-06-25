import { ArrowDownLeft, ArrowUpRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Activity } from './types'
import { getActivityVisualMeta } from './utils'

interface ActivityTypeIconProps {
    activity: Activity
    size?: 'sm' | 'md'
    className?: string
}

export function ActivityTypeIcon({ activity, size = 'md', className }: ActivityTypeIconProps) {
    const { iconKind, iconContainerClass, iconClass } = getActivityVisualMeta(activity)
    const boxClass = size === 'sm' ? 'h-8 w-8 rounded-lg' : 'rounded-lg p-2'
    const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

    const icon =
        iconKind === 'outgoing' ? (
            <ArrowUpRight className={cn(iconSize, iconClass)} />
        ) : iconKind === 'deposit' ? (
            <Plus className={cn(iconSize, iconClass)} />
        ) : (
            <ArrowDownLeft className={cn(iconSize, iconClass)} />
        )

    return (
        <div
            className={cn(
                'flex shrink-0 items-center justify-center',
                boxClass,
                iconContainerClass,
                className,
            )}
        >
            {icon}
        </div>
    )
}
