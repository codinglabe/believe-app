import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type NavGroup } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useCan as can, useRole as role } from '@/lib/can';
interface NavMainProps {
    items?: (NavItem | NavGroup)[];
}

export function NavMain({ items = [] }: NavMainProps) {
    const page = usePage();
    //const { permissions } = (page?.props?.auth as { permissions?: string[] }) ?? {};
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Auto-expand groups that contain the current active page
    useEffect(() => {
        const activeGroups = new Set<string>();
        items.forEach((item) => {
            if ('items' in item) {
                const hasActiveChild = item.items.some(subItem => {
                    // Check for exact match
                    if (subItem.href === page.url) return true;

                    // Check for create/edit pages
                    const basePath = subItem.href;
                    const currentPath = page.url;

                    // For create pages: /status-codes/create should match /status-codes
                    if (currentPath.startsWith(basePath + '/create')) return true;

                    // For edit pages: /status-codes/123/edit should match /status-codes
                    if (currentPath.match(new RegExp(`^${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\d+/edit$`))) return true;

                    // For admin routes: /admin/courses should match /admin/courses
                    if (currentPath.startsWith(basePath)) return true;

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

    const shouldShowItem = (item: NavItem | NavGroup) => {
        // If no permission or role is specified, show the item
        if (!item.permission && !item.role) return true;

        // For groups, check if any child item is visible
        if ('items' in item) {
            const hasVisibleChild = item.items.some(childItem => {
                if (!childItem.permission && !childItem.role) return true;
                return can(childItem.permission ?? '') || role(childItem.role ?? '');
            });
            
            // Show group if user has group permission OR if any child is visible
            const hasGroupPermission = can(item.permission ?? '') || role(item.role ?? '');
            return hasGroupPermission || hasVisibleChild;
        }

        // For individual items, check if user has the required permission or role
        return can(item.permission ?? '') || role(item.role ?? '');
    };

    return (
        <>
            {items.map((item) => {
                if (!shouldShowItem(item)) return null;

                if ('items' in item) {
                    const isExpanded = expandedGroups.has(item.title);
                    const hasActiveChild = item.items.some(subItem =>
                        subItem.href === page.url ||
                        page.url.startsWith(subItem.href + '/create') ||
                        page.url.match(new RegExp(`^${subItem.href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\d+/edit$`))
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
                                        shouldShowItem(subItem) && (
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
                                        )
                                    ))}
                                </div>
                            )}
                        </SidebarGroup>
                    );
                } else {
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
                }
            })}
        </>
    );
}
