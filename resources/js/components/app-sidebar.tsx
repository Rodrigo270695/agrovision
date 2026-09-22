import { Link, usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import {
    Building2,
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
    Wine,
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
        module: 'dashboard',
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
                module: 'pareto',
            },
            {
                title: 'Periodos',
                href: '/periodos',
                icon: CalendarRange,
                permission: 'periods.view',
                module: 'periods',
            },
            {
                title: 'Unidades',
                href: '/unidades',
                icon: Bus,
                permission: 'units.view',
                module: 'units',
            },
            {
                title: 'Inspecciones',
                href: '/inspecciones',
                icon: ClipboardCheck,
                permission: 'checklists.view',
                module: 'checklists',
            },
            {
                title: 'Consolidados',
                href: '/consolidados',
                icon: FileStack,
                permission: 'consolidations.view',
                module: 'consolidations',
            },
            {
                title: 'Alcohómetro',
                href: '/alcoholimetro',
                icon: Wine,
                permission: 'alcoholtests.view',
                module: 'alcoholtests',
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
                module: 'inductions',
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
                module: 'users',
            },
            {
                title: 'Roles',
                href: '/roles',
                icon: Shield,
                permission: 'roles.view',
                module: 'roles',
            },
        ],
    },
];

const footerNavItems: NavItem[] = [];

const centralNavItems: NavItem[] = [
    {
        title: 'Panel',
        href: '/plataforma',
        icon: LayoutGrid,
    },
    {
        title: 'Empresas',
        href: '/plataforma/empresas',
        icon: Building2,
    },
];

export function AppSidebar() {
    const { can } = useCan();
    const { isMobile, setOpenMobile } = useSidebar();
    const page = usePage();
    const isCentral = Boolean(page.props.central);
    const modules = page.props.tenant?.modules ?? {};

    const visibleNavItems = useMemo(
        () =>
            isCentral
                ? centralNavItems
                : filterNavItems(mainNavItems, can, (module) =>
                      module ? modules[module] !== false : true,
                  ),
        [can, isCentral, modules],
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
            <SidebarHeader className="border-b border-[#d7e3f0] px-2 py-3">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="h-10 hover:bg-transparent"
                        >
                            <Link
                                href={isCentral ? '/plataforma' : dashboard()}
                                prefetch
                                onClick={closeMobile}
                            >
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="pt-2">
                <NavMain
                    items={visibleNavItems}
                    groupLabel={isCentral ? 'Grupo Indelsi' : 'Operaciones'}
                />
            </SidebarContent>

            <SidebarFooter className="border-t border-[#d7e3f0] px-2 py-2">
                {visibleFooterItems.length > 0 ? (
                    <NavFooter items={visibleFooterItems} className="mt-auto" />
                ) : null}
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
