import { usePage } from '@inertiajs/react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import {
    InspectionEditApprovals,
    InspectionEditGrants,
} from '@/components/checklists/inspection-edit-approvals';
import { ObservationInbox } from '@/components/observation-remediations/observation-inbox';
import { PushNotificationPrompt } from '@/components/push/push-notification-prompt';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const page = usePage();
    const isCentral = Boolean(page.props.central);
    const path = page.url.split('?')[0];
    const companyName = (
        page.props as { company?: { name?: string } }
    ).company?.name;
    const resolvedBreadcrumbs =
        breadcrumbs.length > 0
            ? breadcrumbs
            : path.includes('/empresas/') && path.endsWith('/reportes')
              ? [
                    { title: 'Panel', href: '/plataforma' },
                    { title: 'Empresas', href: '/plataforma/empresas' },
                    {
                        title: companyName
                            ? `Reportes · ${companyName}`
                            : 'Reportes',
                        href: path,
                    },
                ]
              : path === '/reportes-dueno'
                ? [
                      { title: 'Panel', href: '/dashboard' },
                      {
                          title: 'Reportes de la empresa',
                          href: '/reportes-dueno',
                      },
                  ]
                : breadcrumbs;

    return (
        <header className="z-20 flex h-14 shrink-0 items-center gap-2 border-b border-brand-200/80 bg-card/95 px-4 backdrop-blur transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sm:px-4 md:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
                <SidebarTrigger />
                <span
                    aria-hidden
                    className="hidden h-5 w-px bg-brand-200 sm:block"
                />
                <Breadcrumbs breadcrumbs={resolvedBreadcrumbs} />
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
                {isCentral ? null : (
                    <>
                        <InspectionEditApprovals />
                        <InspectionEditGrants />
                        <ObservationInbox />
                        <PushNotificationPrompt />
                    </>
                )}
            </div>
        </header>
    );
}
