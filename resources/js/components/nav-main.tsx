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
    'h-9 cursor-pointer rounded-lg px-2 text-[13px] font-medium text-[#3d5166] transition-colors hover:bg-[#e8f1fa] hover:text-[#0f1f3a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e4d8c]/35 data-[active=true]:bg-[#0f1f3a] data-[active=true]:text-white data-[active=true]:shadow-sm data-[active=true]:hover:bg-[#122038] data-[active=true]:hover:text-white';

const subItemClass =
    'h-8 cursor-pointer rounded-md px-2 text-[13px] text-[#3d5166] transition-colors hover:bg-[#e8f1fa] hover:text-[#0f1f3a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e4d8c]/35 data-[active=true]:bg-[#e8f1fa] data-[active=true]:font-semibold data-[active=true]:text-[#0f1f3a] data-[active=true]:shadow-[inset_3px_0_0_0_#1e4d8c]';

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
}: {
    icon: NonNullable<NavItem['icon']>;
    active?: boolean;
    size?: 'md' | 'sm';
}) {
    return (
        <span
            className={cn(
                'flex shrink-0 items-center justify-center rounded-md transition-colors',
                size === 'sm' ? 'size-6' : 'size-7',
                active
                    ? 'bg-[#1e4d8c] text-white'
                    : 'bg-[#e8f1fa] text-[#1e4d8c]',
            )}
            aria-hidden
        >
            <Icon
                className={size === 'sm' ? 'size-3.5' : 'size-4'}
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
                            'data-[active=true]:bg-transparent data-[active=true]:text-[#0f1f3a] data-[active=true]:shadow-none',
                            open &&
                                !sectionActive &&
                                'bg-slate-50 text-[#0f1f3a]',
                            sectionActive &&
                                'bg-[#eef4fb] font-semibold text-[#0f1f3a]',
                        )}
                    >
                        {item.icon ? (
                            <NavIcon
                                icon={item.icon}
                                active={sectionActive}
                            />
                        ) : null}
                        <NavLabel>{item.title}</NavLabel>
                        <ChevronRight
                            className={cn(
                                'ml-auto size-3.5 shrink-0 text-[#6b8ead] transition-transform duration-200 motion-reduce:transition-none',
                                open && 'rotate-90 text-[#1e4d8c]',
                            )}
                            aria-hidden
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
        <SidebarGroup className="px-2 py-1">
            <SidebarGroupLabel className="mb-1 px-2 text-[10px] font-semibold tracking-[0.16em] text-[#1e4d8c] uppercase">
                {groupLabel}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1">
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
