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

const itemClass =
    'h-10 cursor-pointer rounded-xl px-2.5 text-[13px] font-medium text-brand-700/80 transition-colors hover:bg-brand-100 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35 data-[active=true]:bg-brand-800 data-[active=true]:text-white data-[active=true]:shadow-[0_8px_18px_-12px_rgba(15,31,58,0.65)] data-[active=true]:hover:bg-brand-900 data-[active=true]:hover:text-white [&_svg]:shrink-0';

const subItemClass =
    'h-8 cursor-pointer rounded-lg px-2 text-[13px] text-brand-700/75 transition-colors hover:bg-brand-100 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35 data-[active=true]:bg-brand-100 data-[active=true]:font-semibold data-[active=true]:text-brand-800 data-[active=true]:shadow-[inset_3px_0_0_0_var(--brand-500)]';

function itemIsActive(
    item: NavItem,
    isCurrentUrl: (url: NonNullable<NavItem['href']>) => boolean,
): boolean {
    if (item.href && isCurrentUrl(item.href)) {
        return true;
    }

    return Boolean(
        item.items?.some((child) => itemIsActive(child, isCurrentUrl)),
    );
}

function NavIcon({
    icon: Icon,
    active = false,
    size = 'md',
    tone = 'solid',
}: {
    icon: NonNullable<NavItem['icon']>;
    active?: boolean;
    size?: 'md' | 'sm';
    /** solid = ícono blanco (fondo navy); soft = ícono navy (fondo claro) */
    tone?: 'solid' | 'soft';
}) {
    const useSoft = tone === 'soft' || size === 'sm';

    return (
        <span
            className={cn(
                'flex shrink-0 items-center justify-center rounded-md transition-colors',
                size === 'sm' ? 'size-6' : 'size-7',
                useSoft
                    ? active
                        ? 'bg-brand-200 text-brand-800 ring-1 ring-brand-300'
                        : 'bg-brand-100 text-brand-500 ring-1 ring-brand-200/70'
                    : active
                      ? 'bg-white/15 text-white ring-1 ring-white/20'
                      : 'bg-brand-100 text-brand-500 ring-1 ring-brand-200/70',
            )}
            aria-hidden
        >
            <Icon
                className={cn(
                    size === 'sm' ? 'size-3.5' : 'size-4',
                    useSoft
                        ? active
                            ? '!text-brand-800'
                            : '!text-brand-500'
                        : active
                          ? '!text-white'
                          : '!text-brand-500',
                )}
                strokeWidth={2}
            />
        </span>
    );
}

function NavLabel({ children }: { children: string }) {
    return (
        <span className="min-w-0 truncate" title={children}>
            {children}
        </span>
    );
}

function NavCollapsibleItem({
    item,
    open,
    onOpenChange,
}: {
    item: NavItem;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { isCurrentUrl } = useCurrentUrl();
    const { isMobile, setOpenMobile } = useSidebar();
    const children = item.items ?? [];
    const sectionActive = itemIsActive(item, isCurrentUrl);

    const closeMobile = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    return (
        <Collapsible
            asChild
            open={open}
            onOpenChange={onOpenChange}
            className="group/collapsible"
        >
            <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                        tooltip={{ children: item.title }}
                        isActive={false}
                        aria-expanded={open}
                        className={cn(
                            itemClass,
                            'text-brand-800 data-[active=true]:bg-brand-100 data-[active=true]:text-brand-800 data-[active=true]:shadow-none data-[active=true]:hover:bg-brand-100 data-[active=true]:hover:text-brand-800',
                            open &&
                                !sectionActive &&
                                'bg-brand-50 text-brand-800',
                            sectionActive &&
                                'bg-brand-100 font-semibold text-brand-800 ring-1 ring-brand-200/80',
                        )}
                    >
                        {item.icon ? (
                            <NavIcon
                                icon={item.icon}
                                active={sectionActive || open}
                                tone="soft"
                            />
                        ) : null}
                        <NavLabel>{item.title}</NavLabel>
                        <ChevronRight
                            className={cn(
                                'ml-auto size-3.5 shrink-0 text-brand-300 transition-transform duration-200 motion-reduce:transition-none',
                                open && 'rotate-90 text-brand-500',
                                sectionActive && 'text-brand-500',
                            )}
                            aria-hidden
                        />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="nav-collapsible-content overflow-hidden">
                    <SidebarMenuSub className="mx-0 mb-1 ml-3.5 border-l border-brand-200 px-0 py-1">
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
                                            aria-current={
                                                childActive
                                                    ? 'page'
                                                    : undefined
                                            }
                                        >
                                            {child.icon ? (
                                                <NavIcon
                                                    icon={child.icon}
                                                    active={childActive}
                                                    size="sm"
                                                />
                                            ) : null}
                                            <NavLabel>{child.title}</NavLabel>
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

    const activeSectionTitle =
        items.find(
            (item) =>
                Boolean(item.items?.length) && itemIsActive(item, isCurrentUrl),
        )?.title ?? null;

    const [openSection, setOpenSection] = useState<string | null>(
        activeSectionTitle,
    );

    useEffect(() => {
        setOpenSection(activeSectionTitle);
    }, [activeSectionTitle]);

    const closeMobile = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    return (
        <SidebarGroup className="relative px-1.5 py-1">
            <SidebarGroupLabel className="mb-2 px-2.5 text-[10px] font-bold tracking-[0.18em] text-brand-500 uppercase">
                {groupLabel}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1.5">
                {items.map((item) => {
                    if (item.items && item.items.length > 0) {
                        return (
                            <NavCollapsibleItem
                                key={item.title}
                                item={item}
                                open={openSection === item.title}
                                onOpenChange={(next) => {
                                    setOpenSection(next ? item.title : null);
                                }}
                            />
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
                                    aria-current={active ? 'page' : undefined}
                                >
                                    {item.icon ? (
                                        <NavIcon
                                            icon={item.icon}
                                            active={active}
                                        />
                                    ) : null}
                                    <NavLabel>{item.title}</NavLabel>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
