import { NavMain } from '@/components/nav-main';
import { dashboardSidebarNavItems } from '@/config/dashboard-sidebar-nav';
import { useSidebarResize } from '@/contexts/sidebar-resize-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar } from '@/components/ui/sidebar';
import { usePage } from '@inertiajs/react';
import { Sparkles, ArrowRight } from 'lucide-react';
import SiteTitle from './site-title';
import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef } from 'react';

/** Drag the right edge to change width (persisted). Desktop expanded sidebar only. */
function SidebarResizeHandle() {
    const { state } = useSidebar();
    const isMobile = useIsMobile();
    const { setSidebarWidthPx, sidebarWidthPx, minWidth, maxWidth } = useSidebarResize();
    const dragging = useRef(false);

    const onMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (isMobile || state !== 'expanded') return;
            e.preventDefault();
            dragging.current = true;
            const startX = e.clientX;
            const startWidth = sidebarWidthPx;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            const onMove = (ev: MouseEvent) => {
                if (!dragging.current) return;
                const delta = ev.clientX - startX;
                setSidebarWidthPx(startWidth + delta);
            };
            const onUp = () => {
                dragging.current = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        },
        [isMobile, state, sidebarWidthPx, setSidebarWidthPx]
    );

    useEffect(() => {
        return () => {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, []);

    if (isMobile || state !== 'expanded') return null;

    return (
        <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            aria-valuemin={minWidth}
            aria-valuemax={maxWidth}
            aria-valuenow={sidebarWidthPx}
            tabIndex={0}
            className="absolute right-0 top-0 z-50 h-full w-3 translate-x-1/2 cursor-col-resize select-none hover:bg-primary/15 active:bg-primary/25"
            onMouseDown={onMouseDown}
            onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    setSidebarWidthPx(sidebarWidthPx - 8);
                }
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    setSidebarWidthPx(sidebarWidthPx + 8);
                }
            }}
        />
    );
}


export function AppSidebar() {
    const page = usePage();
    const userRoles = (page.props as any).auth?.roles ?? [];
    const isOrganization = userRoles.some((role: string) => {
        const r = role.toLowerCase();
        return r === 'organization' || r === 'care_alliance';
    });
    const currentPlanId = (page.props as any).auth?.user?.current_plan_id ?? null;
    const hasPlan = currentPlanId !== null;

    return (
        <Sidebar collapsible="icon" variant="inset" className='z-30 [&_.group\\/sidebar-wrapper.has-data-\\[variant\\=inset\\]]:!bg-sidebar [&_[data-sidebar=sidebar]]:!bg-sidebar'>
            <div className="relative h-full flex flex-col border-r border-sidebar-border bg-sidebar">
                <SidebarResizeHandle />
                <SidebarHeader className="h-16 shrink-0 flex flex-col justify-center border-b-2 border-sidebar-border bg-sidebar px-4 py-0">
                    <SidebarMenu className="gap-0">
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                size="default"
                                asChild
                                className="h-auto min-h-0 items-center py-1 hover:bg-sidebar-accent/50 transition-colors rounded-lg"
                            >
                                <SiteTitle
                                    href={route('dashboard')}
                                    className="[&_img]:h-9 [&_img]:w-9 [&_span]:text-lg"
                                />
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>

                <SidebarContent className="px-3 py-4 bg-sidebar flex-1 overflow-y-auto min-h-0 sidebar-scrollbar">
                    <div className="space-y-1">
                        <NavMain items={dashboardSidebarNavItems} />
                    </div>
                </SidebarContent>

                {isOrganization && !hasPlan && (
                    <SidebarFooter className="px-3 py-3 border-t border-sidebar-border bg-sidebar flex-shrink-0">
                        <motion.div
                            className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/15 dark:to-primary/10 border border-primary/20 dark:border-primary/30 p-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            whileHover={{ scale: 1.02 }}
                        >
                            <motion.div
                                className="flex items-center gap-3 mb-3"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                            >
                                <motion.div
                                    className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/20 dark:bg-primary/25 flex items-center justify-center"
                                    animate={{
                                        rotate: [0, 10, -10, 0],
                                        scale: [1, 1.1, 1]
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        repeatDelay: 3
                                    }}
                                >
                                    <Sparkles className="h-5 w-5 text-primary" />
                                </motion.div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm text-foreground leading-tight mb-1">
                                        Upgrade to Pro
                                    </h3>
                                    <p className="text-xs text-muted-foreground leading-snug">
                                        Unlock premium features and tools
                                    </p>
                                </div>
                            </motion.div>
                            <Link href={route('plans.index')}>
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Button
                                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium h-9 shadow-sm group"
                                        size="sm"
                                    >
                                        <span>Upgrade Now</span>
                                        <ArrowRight className="h-4 w-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </motion.div>
                            </Link>
                        </motion.div>
                    </SidebarFooter>
                )}
            </div>
        </Sidebar>
    );
}
