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

const navButtonClass =
    'cursor-pointer rounded-xl transition-all duration-200 ease-out hover:bg-[#e8f1fa] hover:text-[#1a2b4c] data-[active=true]:bg-[#1a2b4c] data-[active=true]:text-white data-[active=true]:shadow-md data-[active=true]:hover:bg-[#243f6b] data-[active=true]:hover:text-white';

const navSubButtonClass =
    'cursor-pointer rounded-lg transition-all duration-200 ease-out hover:bg-[#e8f1fa] hover:text-[#1a2b4c] data-[active=true]:bg-[#e8f1fa] data-[active=true]:font-semibold data-[active=true]:text-[#1a2b4c] data-[active=true]:shadow-[inset_3px_0_0_0_#4a90e2]';

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
    active = false,
    tone = 'default',
}: {
    icon: NonNullable<NavItem['icon']>;
    active?: boolean;
    tone?: 'default' | 'open' | 'sub';
}) {
    return (
        <span
            className={cn(
                'flex shrink-0 items-center justify-center rounded-lg transition-all duration-200',
                tone === 'sub' ? 'size-6 rounded-md' : 'size-7',
                tone === 'sub' &&
                    (active
                        ? 'bg-[#1a2b4c]/10 text-[#1a2b4c]'
                        : 'bg-[#f4f8fc] text-[#4a90e2]'),
                tone === 'default' &&
                    (active
                        ? 'bg-white/15 text-white'
                        : 'bg-[#eef4fb] text-[#2e5a9e]'),
                tone === 'open' && 'bg-white text-[#1a2b4c] shadow-sm',
            )}
        >
            <Icon className={tone === 'sub' ? 'size-3.5' : 'size-4'} />
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
                        isActive={active && !open}
                        className={cn(
                            navButtonClass,
                            'h-10 data-[state=open]:bg-[#eef4fb] data-[state=open]:text-[#1a2b4c] data-[state=open]:shadow-none',
                        )}
                    >
                        {item.icon ? (
                            <NavIcon
                                icon={item.icon}
                                active={active && !open}
                                tone={open ? 'open' : 'default'}
                            />
                        ) : null}
                        <span className="font-medium">{item.title}</span>
                        <ChevronRight
                            className={cn(
                                'ml-auto size-4 shrink-0 text-[#6b8ead] transition-transform duration-300 ease-out',
                                open && 'rotate-90 text-[#1a2b4c]',
                            )}
                        />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="nav-collapsible-content overflow-hidden">
                    <SidebarMenuSub className="ml-2 border-[#cfe0f0] py-1.5">
                        {children.map((child) => {
                            const childActive = Boolean(
                                child.href && isCurrentUrl(child.href),
                            );

                            return (
                                <SidebarMenuSubItem key={child.title}>
                                    <SidebarMenuSubButton
                                        asChild
                                        isActive={childActive}
                                        className={cn(navSubButtonClass, 'h-9')}
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
                                                    active={childActive}
                                                    tone="sub"
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

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const { isCurrentUrl } = useCurrentUrl();
    const { isMobile, setOpenMobile } = useSidebar();

    const closeMobile = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    return (
        <SidebarGroup className="px-2 py-1">
            <SidebarGroupLabel className="mb-1 px-2 text-[11px] font-semibold tracking-[0.16em] text-[#6b8ead] uppercase">
                Operaciones
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1.5">
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
                                className={cn(navButtonClass, 'h-10')}
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
                                            active={active}
                                        />
                                    ) : null}
                                    <span className="font-medium">
                                        {item.title}
                                    </span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
