import { Link, usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import {
    Building2,
    Bus,
    CalendarRange,
    ChartColumn,
    ChartPie,
    ListTree,
    ClipboardCheck,
    FileStack,
    ScanSearch,
    Gauge,
    Award,
    GraduationCap,
    LayoutGrid,
    Layers,
    MapPin,
    Package,
    Radio,
    Settings2,
    Shield,
    Zap,
    Users,
    UsersRound,
    ContactRound,
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
                title: 'Lugares',
                href: '/lugares',
                icon: MapPin,
                permission: 'places.view',
                module: 'places',
            },
            {
                title: 'Unidades',
                href: '/unidades',
                icon: Bus,
                permission: 'units.view',
                module: 'units',
            },
            {
                title: 'Seguro RC y GPS',
                href: '/datos-flota',
                icon: Radio,
                permission: 'fleet_data.view',
                module: 'fleet_data',
            },
            {
                title: 'Inspecciones',
                href: '/inspecciones',
                icon: ClipboardCheck,
                permission: 'checklists.view',
                module: 'checklists',
            },
            {
                title: 'Cal. observaciones',
                href: '/calendario-observaciones',
                icon: CalendarRange,
                permission: 'observation_remediations.view',
                module: 'checklists',
            },
            {
                title: 'Paquetes',
                href: '/paquetes-inspeccion',
                icon: Package,
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
        title: 'Reportes',
        icon: ChartPie,
        items: [
            {
                title: 'Tablero SST',
                href: '/tablero-sst',
                icon: Gauge,
                permission: 'checklists.view',
                module: 'checklists',
            },
            {
                title: 'Reporte SST',
                href: '/reporte-sst',
                icon: ClipboardCheck,
                permission: 'checklists.view',
                module: 'checklists',
            },
            {
                title: 'Consulta de placas',
                href: '/reporte-placas',
                icon: ScanSearch,
                permission: 'checklists.view',
                module: 'checklists',
            },
            {
                title: 'Seguro RC / GPS',
                href: '/reporte-flota',
                icon: Shield,
                permission: 'fleet_data.view',
                module: 'fleet_data',
            },
            {
                title: 'Cumplimiento proveedor',
                href: '/reporte-proveedores',
                icon: ChartColumn,
                permission: 'checklists.view',
                module: 'checklists',
            },
            {
                title: 'Índice observaciones',
                href: '/reporte-observaciones',
                icon: ListTree,
                permission: 'checklists.view',
                module: 'checklists',
            },
            {
                title: 'Tablero conductores',
                href: '/tablero-conductores',
                icon: Users,
                permission: 'inductions.view',
                module: 'inductions',
            },
            {
                title: 'Consulta de conductores',
                href: '/consulta-conductores',
                icon: ContactRound,
                permission: 'inductions.view',
                module: 'inductions',
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
            {
                title: 'Cierre rápido',
                href: '/inducciones/cierre-rapido',
                icon: Zap,
                permission: 'inductions.quick_complete',
                module: 'inductions',
            },
        ],
    },
    {
        title: 'Certificados',
        icon: Award,
        items: [
            {
                title: 'Plantillas',
                href: '/certificados',
                icon: Award,
                permission: 'certificates.view',
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
    {
        title: 'Certificado',
        icon: Award,
        items: [
            {
                title: 'Participantes',
                href: '/plataforma/certificados/participantes',
                icon: Users,
            },
            {
                title: 'Plantilla',
                href: '/plataforma/certificados/plantillas',
                icon: Award,
            },
        ],
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
            <SidebarHeader className="relative overflow-hidden border-b border-brand-200/80 px-3 py-3 group-data-[collapsible=icon]:!px-1.5 group-data-[collapsible=icon]:!py-2.5">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-100 via-brand-50/40 to-transparent"
                />
                <SidebarMenu className="group-data-[collapsible=icon]:items-center">
                    <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="relative h-11 rounded-xl hover:bg-white/70 group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
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

            <SidebarContent className="relative gap-0 px-1.5 pt-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pt-2">
                <NavMain
                    items={visibleNavItems}
                    groupLabel={isCentral ? 'Grupo Indelsi' : 'Operaciones'}
                />
            </SidebarContent>

            <SidebarFooter className="border-t border-brand-200/80 px-2.5 py-2.5 group-data-[collapsible=icon]:!px-1.5 group-data-[collapsible=icon]:!py-2">
                {visibleFooterItems.length > 0 ? (
                    <NavFooter items={visibleFooterItems} className="mt-auto" />
                ) : null}
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
