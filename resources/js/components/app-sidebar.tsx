import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type NavGroup } from '@/types';
import { Link } from '@inertiajs/react';
import { BookOpen, Folder, Download, LayoutGrid, FileText, Code } from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: (NavItem | NavGroup)[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'Upload Data',
        href: '/upload',
        icon: Download,
    },
    {
        title: 'Manage Data',
        href: '/manage-data',
        icon: FileText,
    },
    {
<<<<<<< HEAD
        title: 'Codes',
        items: [
            {
                title: 'Classification Codes',
                href: '/classification-codes',
                icon: FileText,
            },
            {
                title: 'Status Codes',
                href: '/status-codes',
                icon: FileText,
            },
            {
                title: 'Deductibility Codes',
                href: '/deductibility-codes',
                icon: FileText,
            },
        ],
=======
        title: 'Classification Codes',
        href: '/classification-codes',
        icon: FileText,
    },
    {
        title: 'Status Codes',
        href: '/status-codes',
        icon: FileText,
    },
    {
        title: 'Deductibility Codes',
        href: '/deductibility-codes',
        icon: FileText,
>>>>>>> 85f61b1983c62c5d64a8e828ec098d96561318b8
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
