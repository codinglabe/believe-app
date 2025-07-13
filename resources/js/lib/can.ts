import { usePage } from '@inertiajs/react';

type Auth = {
    permissions: string[];
};

type PageProps = {
    auth: Auth;
};

export function useCan(permission: string): boolean {
    const { auth } = usePage<PageProps>().props;
    return auth.permissions.includes(permission);
}

export function isCan(permission: string, permissions: string[]): boolean {
    return permissions.includes(permission);
}
