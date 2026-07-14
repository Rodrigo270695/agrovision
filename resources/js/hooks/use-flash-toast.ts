import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { FlashToast } from '@/types';

type SharedFlash = {
    flash?: {
        toast?: FlashToast | null;
        success?: string | null;
    };
};

function showFlashToast(flash?: SharedFlash['flash']): void {
    const data = flash?.toast;

    if (data?.message) {
        toast[data.type](data.message);

        return;
    }

    if (flash?.success) {
        toast.success(flash.success);
    }
}

export function useFlashToast(): void {
    useEffect(() => {
        return router.on('success', (event) => {
            const flash = (event.detail.page.props as SharedFlash).flash;
            showFlashToast(flash);
        });
    }, []);
}
