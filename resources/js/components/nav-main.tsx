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
        
        accessibleItems.forEach((item) => {
            if (isGroup(item)) {
                // Check if any accessible child item matches the current URL
                const hasActiveChild = item.items.some(subItem => {
                    // Only check items that user has access to (already filtered by buildVisibleEntries)
                    const basePath = subItem.href;
                    const currentPath = page.url;

                    if (subItem.href === currentPath) return true;
                    if (currentPath.startsWith(`${basePath}/create`)) return true;
                    if (currentPath.startsWith(basePath)) return true;
                    if (currentPath.match(new RegExp(`^${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\d+/edit$`))) return true;

                    return false;
                });

                if (hasActiveChild) {
                    activeGroups.add(item.title);
                }
            }
        });
        setExpandedGroups(activeGroups);
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
                                        className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-sm"
                                    >
                                        {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                                        <span className="truncate flex-1">{item.title}</span>
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
                                        {item.items.map((subItem, index) => (
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
                                                            className="flex items-center gap-2.5 w-full rounded-md px-2.5 py-2 text-sm transition-all duration-200 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium data-[active=true]:shadow-sm"
                                                >
                                                            <Link href={subItem.href} prefetch className="flex items-center gap-2.5 w-full">
                                                                {subItem.icon && <subItem.icon className="h-4 w-4 shrink-0" />}
                                                                <span className="truncate flex-1">{subItem.title}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        </SidebarMenu>
                                            </motion.div>
                                    ))}
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
                                    className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-sm"
                                >
                                    <Link href={item.href} prefetch className="flex items-center gap-3 w-full">
                                        {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                                        <span className="truncate flex-1">{item.title}</span>
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
