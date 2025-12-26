import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type NavGroup } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavMainProps {
    items?: (NavItem | NavGroup)[];
}

type NavEntry = NavItem | NavGroup;

type PageProps = {
    auth: {
        permissions?: string[];
        roles?: string[];
    };
    url: string;
};

const isGroup = (item: NavEntry): item is NavGroup => 'items' in item;
const isNavItem = (item: NavEntry): item is NavItem => 'href' in item;

export function NavMain({ items = [] }: NavMainProps) {
    const page = usePage<PageProps>();
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const userPermissions = page.props.auth.permissions ?? [];
    const userRoles = page.props.auth.roles ?? [];

    const hasDirectAccess = (entry: NavEntry): boolean => {
        // Check permissions: if entry has permission requirement, user must have it
        let permissionAllowed = true;
        if (entry.permission) {
            if (Array.isArray(entry.permission)) {
                // If permission is an array, user must have at least one
                permissionAllowed = entry.permission.some((p) => userPermissions.includes(p));
            } else {
                // If permission is a string, user must have it
                permissionAllowed = userPermissions.includes(entry.permission);
            }
        }

        // Check roles: if entry has role requirement, user must have it
        let roleAllowed = true;
        if (entry.role) {
            if (Array.isArray(entry.role)) {
                // If role is an array, user must have at least one
                roleAllowed = entry.role.some((r) => {
                    // Case-insensitive comparison for roles
                    const roleLower = r.toLowerCase();
                    return userRoles.some(ur => ur.toLowerCase() === roleLower);
                });
            } else {
                // If role is a string, user must have it (case-insensitive)
                const roleLower = entry.role.toLowerCase();
                roleAllowed = userRoles.some(ur => ur.toLowerCase() === roleLower);
            }
        }

        // User must satisfy both permission AND role requirements (if any)
        return permissionAllowed && roleAllowed;
    };

    const buildVisibleEntries = (entries: NavEntry[]): NavEntry[] =>
        entries.reduce<NavEntry[]>((acc, entry) => {
            if (isGroup(entry)) {
                // Check if user has access to the group itself (role/permission check)
                if (!hasDirectAccess(entry)) {
                    return acc;
                }

                // Filter children based on their permissions/roles
                const children = buildVisibleEntries(entry.items);

                // If group has only role requirement (no permission), show it even if no children
                // This allows showing the group structure for organization users
                // They'll see the group but only accessible child items
                const hasOnlyRoleRequirement = entry.role && !entry.permission;

                // Show group if:
                // 1. It has children, OR
                // 2. It has only role requirement (no permission requirement)
                if (children.length === 0 && !hasOnlyRoleRequirement) {
                    // If no children and group has permission requirement, hide the group
                    return acc;
                }

                acc.push({ ...entry, items: children });
                return acc;
            }

            if (hasDirectAccess(entry)) {
                acc.push(entry);
            }

            return acc;
        }, []);

    // Auto-expand groups that contain the current active page
    // Only consider groups and items that the user has access to
    useEffect(() => {
        const activeGroups = new Set<string>();
        const accessibleItems = buildVisibleEntries(items);

        const checkItem = (entry: NavEntry, currentPath: string): boolean => {
            if (isGroup(entry)) {
                let hasActive = false;
                entry.items.forEach(subItem => {
                    if (checkItem(subItem, currentPath)) {
                        hasActive = true;
                        activeGroups.add(entry.title);
                    }
                });
                return hasActive;
            } else {
                const basePath = entry.href;
                if (!basePath) return false;
                if (entry.href === currentPath) return true;
                if (currentPath.startsWith(`${basePath}/create`)) return true;
                if (currentPath.startsWith(basePath)) return true;
                if (currentPath.match(new RegExp(`^${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\d+/edit$`))) return true;
                return false;
            }
        };

        accessibleItems.forEach((item) => {
            checkItem(item, page.url);
        });

        setExpandedGroups(activeGroups);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page.url, items, userPermissions, userRoles]);

    const toggleGroup = (groupTitle: string) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupTitle)) {
                newSet.delete(groupTitle);
            } else {
                newSet.add(groupTitle);
            }
            return newSet;
        });
    };

    const visibleItems = buildVisibleEntries(items);

    return (
        <>
            {visibleItems.map((item) => {
                if (isGroup(item)) {
                    const isExpanded = expandedGroups.has(item.title);
                    const hasActiveChild = item.items.some(subItem => {
                        // If subItem is a group, recursively check its children
                        if (isGroup(subItem)) {
                            return subItem.items.some(subSubItem => {
                                if (isGroup(subSubItem)) {
                                    return subSubItem.items.some(ssItem => {
                                        if (!isNavItem(ssItem)) return false;
                                        const basePath = ssItem.href;
                                        if (!basePath) return false;
                                        return ssItem.href === page.url ||
                                            page.url.startsWith(`${basePath}/create`) ||
                                            !!page.url.match(new RegExp(`^${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\d+/edit$`)) ||
                                            page.url.startsWith(basePath);
                                    });
                                }
                                if (!isNavItem(subSubItem)) return false;
                                const basePath = subSubItem.href;
                                if (!basePath) return false;
                                return subSubItem.href === page.url ||
                                    page.url.startsWith(`${basePath}/create`) ||
                                    !!page.url.match(new RegExp(`^${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\d+/edit$`)) ||
                                    page.url.startsWith(basePath);
                            });
                        }
                        // If subItem is a regular item, check its href
                        if (!isNavItem(subItem)) return false;
                        const isExactMatch = subItem.href === page.url;
                        const isCreatePage = page.url.startsWith(subItem.href + '/create');
                        const isEditPage = !!page.url.match(new RegExp(`^${subItem.href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\d+/edit$`));
                        // Special handling for volunteers/timesheet - only match timesheet routes
                        if (subItem.href === '/volunteers/timesheet') {
                            return page.url.startsWith('/volunteers/timesheet');
                        }
                        // Special handling for volunteers - match volunteers routes but NOT timesheet routes
                        if (subItem.href === '/volunteers') {
                            return page.url.startsWith('/volunteers') && !page.url.startsWith('/volunteers/timesheet');
                        }
                        // Default behavior for other routes
                        return isExactMatch || isCreatePage || isEditPage || page.url.startsWith(subItem.href);
                    });

                    return (
                        <SidebarGroup key={item.title} className="px-0 py-0">
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            toggleGroup(item.title);
                                        }}
                                        isActive={hasActiveChild}
                                        tooltip={{ children: item.title }}
                                        title={item.title}
                                        className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-sm"
                                    >
                                        {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                                        <span className="truncate flex-1" title={item.title}>{item.title}</span>
                                        <motion.div
                                            animate={{ rotate: isExpanded ? 90 : 0 }}
                                            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                    >
                                            <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
                                        </motion.div>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>

                            <AnimatePresence initial={false}>
                            {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{
                                            duration: 0.3,
                                            ease: [0.4, 0, 0.2, 1]
                                        }}
                                        className="ml-6 space-y-0.5 overflow-hidden border-l border-sidebar-border/50 pl-3"
                                    >
                                        {item.items.map((subItem, index) => {
                                            // Check if subItem is a nested group
                                            if (isGroup(subItem)) {
                                                const isSubExpanded = expandedGroups.has(subItem.title);
                                                const hasActiveSubChild = subItem.items.some(subSubItem => {
                                                    if (isGroup(subSubItem)) {
                                                        return subSubItem.items.some(ssItem => {
                                                            if (!isNavItem(ssItem)) return false;
                                                            const basePath = ssItem.href;
                                                            if (!basePath) return false;
                                                            return ssItem.href === page.url ||
                                                                page.url.startsWith(`${basePath}/create`) ||
                                                                !!page.url.match(new RegExp(`^${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\d+/edit$`)) ||
                                                                page.url.startsWith(basePath);
                                                        });
                                                    }
                                                    if (!isNavItem(subSubItem)) return false;
                                                    const basePath = subSubItem.href;
                                                    if (!basePath) return false;
                                                    return subSubItem.href === page.url ||
                                                        page.url.startsWith(`${basePath}/create`) ||
                                                        !!page.url.match(new RegExp(`^${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\d+/edit$`)) ||
                                                        page.url.startsWith(basePath);
                                                });

                                                return (
                                                    <motion.div
                                                        key={subItem.title}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{
                                                            duration: 0.2,
                                                            delay: index * 0.05,
                                                            ease: [0.4, 0, 0.2, 1]
                                                        }}
                                                    >
                                                        <SidebarMenu>
                                                            <SidebarMenuItem>
                                                                <SidebarMenuButton
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        toggleGroup(subItem.title);
                                                                    }}
                                                                    isActive={hasActiveSubChild}
                                                                    tooltip={{ children: subItem.title }}
                                                                    title={subItem.title}
                                                                    className="flex items-center gap-2.5 w-full rounded-md px-2.5 py-2 text-sm transition-all duration-200 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium"
                                                                >
                                                                    {subItem.icon && <subItem.icon className="h-4 w-4 shrink-0" />}
                                                                    <span className="truncate flex-1" title={subItem.title}>{subItem.title}</span>
                                                                    <motion.div
                                                                        animate={{ rotate: isSubExpanded ? 90 : 0 }}
                                                                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                                                    >
                                                                        <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />
                                                                    </motion.div>
                                                                </SidebarMenuButton>
                                                            </SidebarMenuItem>
                                                        </SidebarMenu>

                                                        <AnimatePresence initial={false}>
                                                            {isSubExpanded && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{
                                                                        duration: 0.3,
                                                                        ease: [0.4, 0, 0.2, 1]
                                                                    }}
                                                                    className="ml-4 space-y-0.5 overflow-hidden border-l border-sidebar-border/30 pl-3 mt-1"
                                                                >
                                                                    {subItem.items.map((subSubItem, subIndex) => {
                                                                        if (isGroup(subSubItem)) {
                                                                            // Handle 3rd level nesting if needed
                                                                            return (
                                                                                <motion.div
                                                                                    key={subSubItem.title}
                                                                                    initial={{ opacity: 0, x: -10 }}
                                                                                    animate={{ opacity: 1, x: 0 }}
                                                                                    transition={{
                                                                                        duration: 0.2,
                                                                                        delay: subIndex * 0.05,
                                                                                        ease: [0.4, 0, 0.2, 1]
                                                                                    }}
                                                                                >
                                                                                    <SidebarMenu>
                                                                                        <SidebarMenuItem>
                                                                                            <SidebarMenuButton
                                                                                                onClick={(e) => {
                                                                                                    e.preventDefault();
                                                                                                    e.stopPropagation();
                                                                                                    toggleGroup(subSubItem.title);
                                                                                                }}
                                                                                                isActive={subSubItem.items.some(ssItem => isNavItem(ssItem) && ssItem.href && page.url.startsWith(ssItem.href))}
                                                                                                tooltip={{ children: subSubItem.title }}
                                                                                                title={subSubItem.title}
                                                                                                className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs transition-all duration-200 hover:bg-sidebar-accent/50"
                                                                                            >
                                                                                                {subSubItem.icon && <subSubItem.icon className="h-3 w-3 shrink-0" />}
                                                                                                <span className="truncate flex-1" title={subSubItem.title}>{subSubItem.title}</span>
                                                                                                <motion.div
                                                                                                    animate={{ rotate: expandedGroups.has(subSubItem.title) ? 90 : 0 }}
                                                                                                    transition={{ duration: 0.3 }}
                                                                                                >
                                                                                                    <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />
                                                                                                </motion.div>
                                                                                            </SidebarMenuButton>
                                                                                        </SidebarMenuItem>
                                                                                    </SidebarMenu>
                                                                                    <AnimatePresence>
                                                                                        {expandedGroups.has(subSubItem.title) && (
                                                                                            <motion.div
                                                                                                initial={{ height: 0, opacity: 0 }}
                                                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                                                exit={{ height: 0, opacity: 0 }}
                                                                                                className="ml-3 space-y-0.5 border-l border-sidebar-border/20 pl-2 mt-1"
                                                                                            >
                                                                                                {subSubItem.items.map((ssItem) => {
                                                                                                    if (!isNavItem(ssItem)) return null;
                                                                                                    return (
                                                                                                        <SidebarMenu key={ssItem.title}>
                                                                                                            <SidebarMenuItem>
                                                                                                                <SidebarMenuButton
                                                                                                                    asChild
                                                                                                                    isActive={ssItem.href === page.url || page.url.startsWith(ssItem.href)}
                                                                                                                    title={ssItem.title}
                                                                                                                    className="flex items-center gap-2 w-full rounded px-2 py-1.5 text-xs"
                                                                                                                >
                                                                                                                    <Link href={ssItem.href} prefetch className="flex items-center gap-2 w-full" title={ssItem.title}>
                                                                                                                        {ssItem.icon && <ssItem.icon className="h-3 w-3 shrink-0" />}
                                                                                                                        <span className="truncate flex-1" title={ssItem.title}>{ssItem.title}</span>
                                                                                                                    </Link>
                                                                                                                </SidebarMenuButton>
                                                                                                            </SidebarMenuItem>
                                                                                                        </SidebarMenu>
                                                                                                    );
                                                                                                })}
                                                                                            </motion.div>
                                                                                        )}
                                                                                    </AnimatePresence>
                                                                                </motion.div>
                                                                            );
                                                                        }
                                                                        // Regular item at 3rd level
                                                                        if (!isNavItem(subSubItem)) return null;
                                                                        return (
                                                                            <motion.div
                                                                                key={subSubItem.title}
                                                                                initial={{ opacity: 0, x: -10 }}
                                                                                animate={{ opacity: 1, x: 0 }}
                                                                                transition={{
                                                                                    duration: 0.2,
                                                                                    delay: subIndex * 0.05,
                                                                                    ease: [0.4, 0, 0.2, 1]
                                                                                }}
                                                                            >
                                                                                <SidebarMenu>
                                                                                    <SidebarMenuItem>
                                                                                        <SidebarMenuButton
                                                                                            asChild
                                                                                            isActive={
                                                                                                subSubItem.href === page.url ||
                                                                                                page.url.startsWith(subSubItem.href + '/create') ||
                                                                                                !!page.url.match(new RegExp(`^${subSubItem.href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\d+/edit$`)) ||
                                                                                                page.url.startsWith(subSubItem.href)
                                                                                            }
                                                                                            tooltip={{ children: subSubItem.title }}
                                                                                            title={subSubItem.title}
                                                                                            className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs transition-all duration-200 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                                                                                        >
                                                                                            <Link href={subSubItem.href} prefetch className="flex items-center gap-2 w-full" title={subSubItem.title}>
                                                                                                {subSubItem.icon && <subSubItem.icon className="h-3 w-3 shrink-0" />}
                                                                                                <span className="truncate flex-1" title={subSubItem.title}>{subSubItem.title}</span>
                                                                                            </Link>
                                                                                        </SidebarMenuButton>
                                                                                    </SidebarMenuItem>
                                                                                </SidebarMenu>
                                                                            </motion.div>
                                                                        );
                                                                    })}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </motion.div>
                                                );
                                            }
                                            // Regular item at 2nd level
                                            if (!isNavItem(subItem)) return null;
                                            return (
                                                <motion.div
                                                    key={subItem.title}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{
                                                        duration: 0.2,
                                                        delay: index * 0.05,
                                                        ease: [0.4, 0, 0.2, 1]
                                                    }}
                                                >
                                                    <SidebarMenu>
                                                <SidebarMenuItem>
                                                    <SidebarMenuButton
                                                        asChild
                                                        isActive={
                                                            (() => {
                                                                // Special handling for timesheet - only match timesheet routes
                                                                if (subItem.href === '/volunteers/timesheet') {
                                                                    return page.url.startsWith('/volunteers/timesheet');
                                                                }
                                                                // Special handling for volunteers - match volunteers routes but NOT timesheet routes
                                                                if (subItem.href === '/volunteers') {
                                                                    return page.url.startsWith('/volunteers') && !page.url.startsWith('/volunteers/timesheet');
                                                                }
                                                                // Default behavior for other routes
                                                                return subItem.href === page.url ||
                                                            page.url.startsWith(subItem.href + '/create') ||
                                                            !!page.url.match(new RegExp(`^${subItem.href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\d+/edit$`)) ||
                                                                    page.url.startsWith(subItem.href);
                                                            })()
                                                        }
                                                        tooltip={{ children: subItem.title }}
                                                        title={subItem.title}
                                                                className="flex items-center gap-2.5 w-full rounded-md px-2.5 py-2 text-sm transition-all duration-200 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium data-[active=true]:shadow-sm"
                                                    >
                                                                <Link href={subItem.href} prefetch className="flex items-center gap-2.5 w-full" title={subItem.title}>
                                                                    {subItem.icon && <subItem.icon className="h-4 w-4 shrink-0" />}
                                                                    <span className="truncate flex-1" title={subItem.title}>{subItem.title}</span>
                                                        </Link>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            </SidebarMenu>
                                                </motion.div>
                                            );
                                        })}
                                    </motion.div>
                            )}
                            </AnimatePresence>
                        </SidebarGroup>
                    );
                }

                return (
                    <SidebarGroup key={item.title} className="px-0 py-0">
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={item.href === page.url}
                                    tooltip={{ children: item.title }}
                                    title={item.title}
                                    className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-sm"
                                >
                                    <Link href={item.href} prefetch className="flex items-center gap-3 w-full" title={item.title}>
                                        {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                                        <span className="truncate flex-1" title={item.title}>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroup>
                );
            })}
        </>
    );
}
