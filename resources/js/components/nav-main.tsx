import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type NavGroup } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';

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
        const permissionAllowed = !entry.permission || userPermissions.includes(entry.permission);
        const roleAllowed = !entry.role || (Array.isArray(entry.role)
            ? entry.role.some((r) => userRoles.includes(r))
            : userRoles.includes(entry.role)
        );
        return permissionAllowed && roleAllowed;
    };

    // Auto-expand groups that contain the current active page
    useEffect(() => {
        const activeGroups = new Set<string>();
        items.forEach((item) => {
            if (isGroup(item)) {
                const hasActiveChild = item.items.some(subItem => {
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
    }, [page.url, items]);

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

    const buildVisibleEntries = (entries: NavEntry[]): NavEntry[] =>
        entries.reduce<NavEntry[]>((acc, entry) => {
            if (isGroup(entry)) {
                if (!hasDirectAccess(entry)) {
                    return acc;
                }

                const children = buildVisibleEntries(entry.items);

                if (children.length === 0) {
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

    const visibleItems = buildVisibleEntries(items);

    return (
        <>
            {visibleItems.map((item) => {
                if (isGroup(item)) {
                    const isExpanded = expandedGroups.has(item.title);
                    const hasActiveChild = item.items.some(subItem =>
                        subItem.href === page.url ||
                        page.url.startsWith(subItem.href + '/create') ||
                        !!page.url.match(new RegExp(`^${subItem.href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\d+/edit$`)) ||
                        page.url.startsWith(subItem.href)
                    );

                    return (
                        <SidebarGroup key={item.title} className="px-2 py-0">
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
                                    >
                                        <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                        <span>{item.title}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>

                            {isExpanded && (
                                <div className="ml-4 space-y-1">
                                    {item.items.map((subItem) => (
                                        <SidebarMenu key={subItem.title}>
                                            <SidebarMenuItem>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={
                                                        subItem.href === page.url ||
                                                        page.url.startsWith(subItem.href + '/create') ||
                                                        !!page.url.match(new RegExp(`^${subItem.href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\d+/edit$`)) ||
                                                        page.url.startsWith(subItem.href)
                                                    }
                                                    tooltip={{ children: subItem.title }}
                                                >
                                                    <Link href={subItem.href} prefetch>
                                                        {subItem.icon && <subItem.icon />}
                                                        <span>{subItem.title}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        </SidebarMenu>
                                    ))}
                                </div>
                            )}
                        </SidebarGroup>
                    );
                }

                return (
                    <SidebarGroup key={item.title} className="px-2 py-0">
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={item.href === page.url}
                                    tooltip={{ children: item.title }}
                                >
                                    <Link href={item.href} prefetch>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
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
