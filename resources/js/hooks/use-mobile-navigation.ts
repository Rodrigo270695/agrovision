import { useCallback } from 'react';
import { useSidebar } from '@/components/ui/sidebar';

export type CleanupFn = () => void;

export function useMobileNavigation(): CleanupFn {
    const { isMobile, setOpenMobile } = useSidebar();

    return useCallback(() => {
        document.body.style.removeProperty('pointer-events');

        if (isMobile) {
            setOpenMobile(false);
        }
    }, [isMobile, setOpenMobile]);
}
