import { usePage } from '@inertiajs/react';

type Auth = {
    permissions?: string[];
    roles?: string[] | string; // Can be array or string
    user?: {
        role?: string; // Single role if needed
    };
};

type PageProps = {
    auth: Auth;
};

// Check single permission
export function useCan(permission: string): boolean {
    const { auth } = usePage<PageProps>().props;
    const hasPermission = auth.permissions?.includes(permission) ?? false;

    // Debug: Log permission checks
    if (process.env.NODE_ENV === 'development') {
        // console.log(`Permission check: ${permission}`, {
        //     hasPermission,
        //     userPermissions: auth.permissions,
        //     userRoles: auth.roles
        // });
    }

    return hasPermission;
}

// Check permission against provided array
export function isCan(permission: string, permissions?: string[]): boolean {
    return permissions?.includes(permission) ?? false;
}

export function useRole(role: string | string[]): boolean {
    const { auth } = usePage<PageProps>().props;
    if (!auth.roles) return false;

    // Handle case where roles might be a single string
    const userRoles = Array.isArray(auth.roles) ? auth.roles : [auth.roles];

    if (Array.isArray(role)) {
        return role.some(r => userRoles.includes(r));
    }
    return userRoles.includes(role);
}

// Check role against provided array
export function isRole(role: string | string[], roles?: string[]): boolean {
    if (!roles) return false;

    if (Array.isArray(role)) {
        return role.some(r => roles.includes(r));
    }
    return roles.includes(role);
}
