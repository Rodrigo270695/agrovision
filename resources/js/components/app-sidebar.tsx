import { Link } from '@inertiajs/react';
import { useMemo } from 'react';
import {
    Bus,
    CalendarRange,
    ChartPie,
    ClipboardCheck,
    FileStack,
    GraduationCap,
    LayoutGrid,
    Layers,
    Settings2,
    Shield,
    Users,
    UsersRound,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCan } from '@/hooks/use-can';
import { filterNavItems } from '@/lib/filter-nav-items';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Panel',
        href: dashboard(),
        icon: LayoutGrid,
        permission: 'dashboard.view',
    },
    {
        title: 'Plataforma',
        icon: Layers,
        items: [
            {
                title: 'Pareto',
                href: '/pareto',
                icon: ChartPie,
                permission: 'pareto.view',
            },
            {
                title: 'Periodos',
                href: '/periodos',
                icon: CalendarRange,
                permission: 'periods.view',
            },
            {
                title: 'Unidades',
                href: '/unidades',
                icon: Bus,
                permission: 'units.view',
            },
            {
                title: 'Inspecciones',
                href: '/inspecciones',
                icon: ClipboardCheck,
                permission: 'checklists.view',
            },
            {
                title: 'Consolidados',
                href: '/consolidados',
                icon: FileStack,
                permission: 'consolidations.view',
            },
        ],
    },
    {
        title: 'Inducción',
        icon: GraduationCap,
        items: [
            {
                title: 'Configuración',
                href: '/inducciones',
                icon: Settings2,
                permission: 'inductions.view',
            },
        ],
    },
    {
        title: 'Usuario',
        icon: UsersRound,
        items: [
            {
                title: 'Usuarios',
                href: '/usuarios',
                icon: Users,
                permission: 'users.view',
            },
            {
                title: 'Roles',
                href: '/roles',
                icon: Shield,
                permission: 'roles.view',
            },
        ],
    },
];

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const { can } = useCan();
    const { isMobile, setOpenMobile } = useSidebar();

    const visibleNavItems = useMemo(
        () => filterNavItems(mainNavItems, can),
        [can],
    );

    const visibleFooterItems = useMemo(
        () => filterNavItems(footerNavItems, can),
        [can],
    );

    const closeMobile = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link
                                href={dashboard()}
                                prefetch
                                onClick={closeMobile}
                            >
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={visibleNavItems} />
            </SidebarContent>

            <SidebarFooter>
                {visibleFooterItems.length > 0 ? (
                    <NavFooter items={visibleFooterItems} className="mt-auto" />
                ) : null}
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
