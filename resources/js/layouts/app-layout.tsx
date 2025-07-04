import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { useFlashMessage } from '@/hooks/use-flash-message';
import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { showSuccessToast, showErrorToast } from '@/lib/toast';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => {
    // Handle flash messages
    useFlashMessage();
    
    // Handle Laravel session flash messages
    const { props: pageProps } = usePage();
    
        useEffect(() => {        // Handle success messages from Laravel session
        if (pageProps.success && typeof pageProps.success === 'string') {
            showSuccessToast(pageProps.success);
        }
        
        // Handle error messages from Laravel session
        if (pageProps.error && typeof pageProps.error === 'string') {
            showErrorToast(pageProps.error);
        }
        
        // Handle info messages from Laravel session
        if (pageProps.info && typeof pageProps.info === 'string') {
            showSuccessToast(pageProps.info);
        }
        
        // Handle warning messages from Laravel session
        if (pageProps.warning && typeof pageProps.warning === 'string') {
            showErrorToast(pageProps.warning);
        }
    }, [pageProps.success, pageProps.error, pageProps.info, pageProps.warning]);

    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
            {children}

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
                        background: "hsl(var(--background))",
                        color: "hsl(var(--foreground))",
                        border: "1px solid hsl(var(--border))",
                    },
                    // Default options for specific types
                    success: {
                        duration: 4000,
                        iconTheme: {
                            primary: "hsl(var(--primary))",
                            secondary: "hsl(var(--primary-foreground))",
                        },
                    },
                    error: {
                        duration: 5000,
                        iconTheme: {
                            primary: "#ef4444",
                            secondary: "#fff",
                        },
                    },
                }}
            />
        </AppLayoutTemplate>
    );
};
