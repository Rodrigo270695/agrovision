import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/types';

type Accent = {
    icon: string;
    chip: string;
    activeChip: string;
};

const accents: Record<string, Accent> = {
    Panel: {
        icon: 'text-[#2e5a9e]',
        chip: 'bg-[#e8f1fa]',
        activeChip: 'bg-white/15 text-white',
    },
    Plataforma: {
        icon: 'text-[#2e5a9e]',
        chip: 'bg-[#e8f1fa]',
        activeChip: 'bg-white text-[#1a2b4c]',
    },
    Pareto: {
        icon: 'text-[#6d28d9]',
        chip: 'bg-[#efe8fb]',
        activeChip: 'bg-[#6d28d9]/15 text-[#5b21b6]',
    },
    Periodos: {
        icon: 'text-[#0369a1]',
        chip: 'bg-[#e0f2fe]',
        activeChip: 'bg-[#0369a1]/15 text-[#075985]',
    },
    Unidades: {
        icon: 'text-[#2e5a9e]',
        chip: 'bg-[#e8f1fa]',
        activeChip: 'bg-[#2e5a9e]/15 text-[#1a2b4c]',
    },
    Inspecciones: {
        icon: 'text-[#0f766e]',
        chip: 'bg-[#ccfbf1]',
        activeChip: 'bg-[#0f766e]/15 text-[#115e59]',
    },
    Consolidados: {
        icon: 'text-[#c2410c]',
        chip: 'bg-[#fff1e6]',
        activeChip: 'bg-[#c2410c]/15 text-[#9a3412]',
    },
    Alcohómetro: {
        icon: 'text-[#b45309]',
        chip: 'bg-[#fef3c7]',
        activeChip: 'bg-[#b45309]/15 text-[#92400e]',
    },
    Inducción: {
        icon: 'text-[#047857]',
        chip: 'bg-[#d1fae5]',
        activeChip: 'bg-white text-[#047857]',
    },
    Configuración: {
        icon: 'text-[#047857]',
        chip: 'bg-[#d1fae5]',
        activeChip: 'bg-[#047857]/15 text-[#065f46]',
    },
    Usuario: {
        icon: 'text-[#6d28d9]',
        chip: 'bg-[#efe8fb]',
        activeChip: 'bg-white text-[#6d28d9]',
    },
    Usuarios: {
        icon: 'text-[#6d28d9]',
        chip: 'bg-[#efe8fb]',
        activeChip: 'bg-[#6d28d9]/15 text-[#5b21b6]',
    },
    Roles: {
        icon: 'text-[#1d4ed8]',
        chip: 'bg-[#dbeafe]',
        activeChip: 'bg-[#1d4ed8]/15 text-[#1e40af]',
    },
    Empresas: {
        icon: 'text-[#2e5a9e]',
        chip: 'bg-[#e8f1fa]',
        activeChip: 'bg-white/15 text-white',
    },
};

const fallbackAccent: Accent = {
    icon: 'text-[#2e5a9e]',
    chip: 'bg-[#e8f1fa]',
    activeChip: 'bg-white/15 text-white',
};

function accentFor(title: string): Accent {
    return accents[title] ?? fallbackAccent;
}

const itemClass =
    'h-9 cursor-pointer rounded-lg px-2 text-[13px] font-medium text-[#3d5166] hover:bg-[#e8f1fa] hover:text-[#1a2b4c] data-[active=true]:bg-[#1a2b4c] data-[active=true]:text-white data-[active=true]:shadow-sm data-[active=true]:hover:bg-[#122038] data-[active=true]:hover:text-white';

const subItemClass =
    'h-8 cursor-pointer rounded-md px-2 text-[13px] text-[#3d5166] hover:bg-[#e8f1fa] hover:text-[#1a2b4c] data-[active=true]:bg-[#e8f1fa] data-[active=true]:font-semibold data-[active=true]:text-[#1a2b4c] data-[active=true]:shadow-[inset_3px_0_0_0_#2e5a9e]';

function itemIsActive(
    item: NavItem,
    isCurrentUrl: (url: NonNullable<NavItem['href']>) => boolean,
): boolean {
    if (item.href && isCurrentUrl(item.href)) {
        return true;
    }

    return Boolean(item.items?.some((child) => itemIsActive(child, isCurrentUrl)));
}

function NavIcon({
    icon: Icon,
    title,
    active = false,
    size = 'md',
}: {
    icon: NonNullable<NavItem['icon']>;
    title: string;
    active?: boolean;
    size?: 'md' | 'sm';
}) {
    const accent = accentFor(title);

    return (
        <span
            className={cn(
                'flex shrink-0 items-center justify-center rounded-md transition-colors',
                size === 'sm' ? 'size-6' : 'size-7',
                active ? accent.activeChip : cn(accent.chip, accent.icon),
            )}
        >
            <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} strokeWidth={2} />
        </span>
    );
}

function NavCollapsibleItem({ item }: { item: NavItem }) {
    const { isCurrentUrl } = useCurrentUrl();
    const { isMobile, setOpenMobile } = useSidebar();
    const children = item.items ?? [];
    const active = itemIsActive(item, isCurrentUrl);
    const [open, setOpen] = useState(active);

    const closeMobile = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    useEffect(() => {
        if (active) {
            setOpen(true);
        }
    }, [active]);

    return (
        <Collapsible
            asChild
            open={open}
            onOpenChange={setOpen}
            className="group/collapsible"
        >
            <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                        tooltip={{ children: item.title }}
                        isActive={false}
                        className={cn(
                            itemClass,
                            'data-[active=true]:bg-transparent data-[active=true]:text-[#1a2b4c] data-[active=true]:shadow-none',
                            open && 'bg-[#eef4fb] text-[#1a2b4c]',
                        )}
                    >
                        {item.icon ? (
                            <NavIcon
                                icon={item.icon}
                                title={item.title}
                                active={open}
                            />
                        ) : null}
                        <span>{item.title}</span>
                        <ChevronRight
                            className={cn(
                                'ml-auto size-3.5 shrink-0 text-[#6b8ead] transition-transform duration-200',
                                open && 'rotate-90 text-[#2e5a9e]',
                            )}
                        />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="nav-collapsible-content overflow-hidden">
                    <SidebarMenuSub className="mx-0 mb-1 ml-3.5 border-l border-[#cfe0f0] px-0 py-1">
                        {children.map((child) => {
                            const childActive = Boolean(
                                child.href && isCurrentUrl(child.href),
                            );

                            return (
                                <SidebarMenuSubItem key={child.title}>
                                    <SidebarMenuSubButton
                                        asChild
                                        isActive={childActive}
                                        className={subItemClass}
                                    >
                                        <Link
                                            href={child.href ?? '#'}
                                            prefetch
                                            className="cursor-pointer"
                                            onClick={closeMobile}
                                        >
                                            {child.icon ? (
                                                <NavIcon
                                                    icon={child.icon}
                                                    title={child.title}
                                                    active={childActive}
                                                    size="sm"
                                                />
                                            ) : null}
                                            <span>{child.title}</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            );
                        })}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuItem>
        </Collapsible>
    );
}

export function NavMain({
    items = [],
    groupLabel = 'Operaciones',
}: {
    items: NavItem[];
    groupLabel?: string;
}) {
    const { isCurrentUrl } = useCurrentUrl();
    const { isMobile, setOpenMobile } = useSidebar();

    const closeMobile = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    return (
        <SidebarGroup className="px-2 py-1">
            <SidebarGroupLabel className="mb-1 px-2 text-[10px] font-semibold tracking-[0.16em] text-[#2e5a9e] uppercase">
                {groupLabel}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1">
                {items.map((item) => {
                    if (item.items && item.items.length > 0) {
                        return (
                            <NavCollapsibleItem key={item.title} item={item} />
                        );
                    }

                    const active = Boolean(
                        item.href && isCurrentUrl(item.href),
                    );

                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={active}
                                tooltip={{ children: item.title }}
                                className={itemClass}
                            >
                                <Link
                                    href={item.href ?? '#'}
                                    prefetch
                                    className="cursor-pointer"
                                    onClick={closeMobile}
                                >
                                    {item.icon ? (
                                        <NavIcon
                                            icon={item.icon}
                                            title={item.title}
                                            active={active}
                                        />
                                    ) : null}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
