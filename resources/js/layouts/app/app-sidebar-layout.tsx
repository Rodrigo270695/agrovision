import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { OfflineBanner } from '@/components/offline/offline-banner';
import { TenantImpersonationBanner } from '@/components/tenant-impersonation-banner';
import { preloadTenantPages } from '@/lib/offline/preload';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const page = usePage();

    useEffect(() => {
        if (page.props.central) {
            return;
        }

        preloadTenantPages(page.version);
    }, [page.props.central, page.version]);

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar">
                <TenantImpersonationBanner />
                <OfflineBanner />
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {/* Contenedor de scroll de todas las vistas del app shell */}
                <div
                    data-slot="app-scroll"
                    className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
                >
                    {children}
                </div>
            </AppContent>
        </AppShell>
    );
}
