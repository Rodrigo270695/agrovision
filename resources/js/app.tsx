import { createInertiaApp, router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

let offlineNoticeAt = 0;

function noticeOffline(): void {
    const now = Date.now();

    if (now - offlineNoticeAt < 4000) {
        return;
    }

    offlineNoticeAt = now;
    toast.error(
        'Sin conexión. Se muestra lo último guardado en este teléfono.',
    );
}

router.on('httpException', (event) => {
    const data = event.detail.response.data;

    if (typeof data !== 'string' || !data.includes('Sin conexión')) {
        return;
    }

    noticeOffline();

    return false;
});

router.on('networkError', () => {
    noticeOffline();

    return false;
});

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
            case name === 'auth/login':
            case name === 'central/login':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();

void import('@/lib/register-service-worker').then(({ registerAppServiceWorker }) => {
    void registerAppServiceWorker();
});

void import('@/lib/offline/sync').then(({ startOfflineSync }) => {
    startOfflineSync();
});
