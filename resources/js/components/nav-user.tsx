import { usePage } from '@inertiajs/react';
import { ChevronsUpDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import { cn } from '@/lib/utils';

export function NavUser() {
    const { auth } = usePage().props;
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLLIElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        const handlePointerDown = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node | null;
            if (target && rootRef.current?.contains(target)) {
                return;
            }
            setOpen(false);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    if (!auth.user) {
        return null;
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem ref={rootRef} className="relative">
                <SidebarMenuButton
                    size="lg"
                    className={cn(
                        'group text-sidebar-accent-foreground',
                        open && 'bg-sidebar-accent',
                    )}
                    data-test="sidebar-menu-button"
                    aria-expanded={open}
                    aria-haspopup="menu"
                    onClick={() => setOpen((value) => !value)}
                >
                    <UserInfo user={auth.user} />
                    <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>

                {open ? (
                    <div
                        role="menu"
                        className="bg-popover text-popover-foreground absolute right-0 bottom-[calc(100%+0.5rem)] left-0 z-50 min-w-56 rounded-lg border p-1 shadow-md"
                        onClick={() => setOpen(false)}
                    >
                        <UserMenuContent user={auth.user} />
                    </div>
                ) : null}
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
