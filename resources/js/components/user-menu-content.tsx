import { Link, router } from '@inertiajs/react';
import { LogOut, Settings } from 'lucide-react';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { cn } from '@/lib/utils';
import { logout } from '@/routes';
import { edit } from '@/routes/profile';
import type { User } from '@/types';

type Props = {
    user: User;
};

export function UserMenuContent({ user }: Props) {
    const cleanup = useMobileNavigation();

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <>
            <div className="px-1 py-1.5">
                <div className="flex items-center gap-2 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </div>
            <div className="bg-border -mx-1 my-1 h-px" />
            <Link
                className={cn(
                    'relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none',
                    'text-[#2e5a9e] hover:bg-[#e8f1fa] hover:text-[#1a2b4c]',
                    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
                )}
                href={edit()}
                prefetch
                onClick={cleanup}
            >
                <Settings className="mr-2 text-[#2e5a9e]" />
                Configuración
            </Link>
            <div className="bg-border -mx-1 my-1 h-px" />
            <Link
                className={cn(
                    'relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none',
                    'text-red-700 hover:bg-red-50 hover:text-red-800',
                    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
                )}
                href={logout()}
                as="button"
                onClick={handleLogout}
                data-test="logout-button"
            >
                <LogOut className="mr-2" />
                Cerrar sesión
            </Link>
        </>
    );
}
