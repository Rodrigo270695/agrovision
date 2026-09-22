import { useEffect, useState } from 'react';
import {
    getOfflineStatus,
    patchOfflineStatus,
    subscribeOfflineStatus,
    type OfflineUiStatus,
} from '@/lib/offline/status';

export function useOfflineStatus(): OfflineUiStatus {
    const [status, setStatus] = useState<OfflineUiStatus>(getOfflineStatus);

    useEffect(() => {
        const syncOnline = () => {
            patchOfflineStatus({ online: navigator.onLine });
        };

        window.addEventListener('online', syncOnline);
        window.addEventListener('offline', syncOnline);
        syncOnline();

        const unsubscribe = subscribeOfflineStatus(setStatus);

        return () => {
            window.removeEventListener('online', syncOnline);
            window.removeEventListener('offline', syncOnline);
            unsubscribe();
        };
    }, []);

    return status;
}
