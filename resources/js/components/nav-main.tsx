import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from '@/components/ui/sidebar';
import { type NavItem, type NavGroup } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface NavMainProps {
    items?: (NavItem | NavGroup)[];
}

export function NavMain({ items = [] }: NavMainProps) {
    const page = usePage();
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
    
    return (
        <>
            {items.map((item, index) => {
                if ('items' in item) {
                    // This is a NavGroup
                    const isExpanded = expandedGroups.has(item.title);
                    const hasActiveChild = item.items.some(subItem => subItem.href === page.url);
                    
                    return (
                        <SidebarGroup key={item.title} className="px-2 py-0">
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton 
                                        onClick={() => toggleGroup(item.title)}
                                        isActive={hasActiveChild}
                                        tooltip={{ children: item.title }}
                                    >
                                        <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                        <span>{item.title}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                
                                {isExpanded && (
                                    <div className="ml-4 space-y-1">
                                        {item.items.map((subItem) => (
                                            <SidebarMenuItem key={subItem.title}>
                                                <SidebarMenuButton  
                                                    asChild 
                                                    isActive={subItem.href === page.url}
                                                    tooltip={{ children: subItem.title }}
                                                >
                                                    <Link href={subItem.href} prefetch>
                                                        {subItem.icon && <subItem.icon />}
                                                        <span>{subItem.title}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))}
                                    </div>
                                )}
                            </SidebarMenu>
                        </SidebarGroup>
                    );
                } else {
                    // This is a NavItem
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
