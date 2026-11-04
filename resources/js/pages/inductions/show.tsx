import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    InductionShowPage,
    type InductionShowProps,
} from '@/components/inductions/induction-show-page';
import { isBrowserOnline } from '@/lib/offline/ids';
import { getInductionSnapshot } from '@/lib/offline/store';
import { dashboard } from '@/routes';

export default function InductionShow() {
    const [offlineProps, setOfflineProps] = useState<InductionShowProps | null>(
        null,
    );
    const [checking, setChecking] = useState(!isBrowserOnline());

    useEffect(() => {
        if (isBrowserOnline()) {
            setChecking(false);

            return;
        }

        const path = window.location.pathname;
        const match = path.match(/\/inducciones\/(\d+)/);
        const id = match?.[1];

        if (!id) {
            setChecking(false);

            return;
        }

        void getInductionSnapshot(id).then((saved) => {
            if (saved && 'induction' in saved) {
                setOfflineProps(saved as unknown as InductionShowProps);
            }

            setChecking(false);
        });
    }, []);

    if (checking) {
        return (
            <>
                <Head title="Inducción · Asistentes" />
                <div className="p-6 text-sm text-muted-foreground">
                    Cargando copia local…
                </div>
            </>
        );
    }

    if (offlineProps) {
        return (
            <>
                <Head title="Inducción · Asistentes" />
                <InductionShowPage
                    snapshot={offlineProps}
                    onBack={() => router.visit('/inducciones')}
                />
            </>
        );
    }

    return (
        <>
            <Head title="Inducción · Asistentes" />
            <InductionShowPage />
        </>
    );
}

InductionShow.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Inducción', href: '/inducciones' },
        { title: 'Asistentes', href: '/inducciones' },
    ],
};
