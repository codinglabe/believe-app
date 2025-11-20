import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';

export function UserInfo({ user, showEmail = false }: { user: User; showEmail?: boolean }) {
    const getInitials = useInitials();
    const orgName = user.organization?.name || user.name;
    // Truncate to max 25 characters for display
    const displayName = orgName.length > 25 ? orgName.substring(0, 25) + '...' : orgName;

    return (
        <>
            <Avatar className="h-8 w-8 overflow-hidden rounded-full shrink-0">
                <AvatarImage src={user.image} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                    {getInitials(orgName)}
                </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                <span className="truncate font-medium max-w-[120px] sm:max-w-[150px] md:max-w-[180px]" title={orgName}>
                    {displayName}
                </span>
                {showEmail && <span className="text-muted-foreground truncate text-xs max-w-[120px] sm:max-w-[150px] md:max-w-[180px]" title={user.email}>{user.email}</span>}
            </div>
        </>
    );
}
