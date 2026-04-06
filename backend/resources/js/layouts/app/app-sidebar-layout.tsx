import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';
import { Toaster } from 'react-hot-toast';

export default function AppSidebarLayout({ children, breadcrumbs = [] }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    return (
        <AppShell variant="sidebar">
            <AppContent variant="sidebar">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {children}
            </AppContent>
            {/* Toast Container */}
            <Toaster
                position="top-right"
                reverseOrder={false}
                gutter={8}
                containerClassName=""
                containerStyle={{}}
                toastOptions={{
                    // Define default options
                    className: "",
                    duration: 4000,
                    style: {
                        background: "#1f2937",
                        color: "#ffffff",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        padding: "16px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                    },
                    // Default options for specific types
                    success: {
                        duration: 4000,
                        style: {
                            background: "#10b981",
                            color: "#ffffff",
                            border: "1px solid #059669",
                            borderRadius: "8px",
                            padding: "16px",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                        },
                        iconTheme: {
                            primary: "#ffffff",
                            secondary: "#10b981",
                        },
                    },
                    error: {
                        duration: 5000,
                        style: {
                            background: "#ef4444",
                            color: "#ffffff",
                            border: "1px solid #dc2626",
                            borderRadius: "8px",
                            padding: "16px",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                        },
                        iconTheme: {
                            primary: "#ffffff",
                            secondary: "#ef4444",
                        },
                    },
                }}
            />
        </AppShell>
    );
}
