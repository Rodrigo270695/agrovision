import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar">
                <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]">
                    <AppSidebarHeader breadcrumbs={breadcrumbs} />
                    <div className="min-h-0 overflow-y-auto overscroll-y-contain">
                        {children}
                    </div>
                </div>
            </AppContent>
        </AppShell>
    );
}
