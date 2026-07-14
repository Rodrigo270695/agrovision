import { Head } from '@inertiajs/react';
import { PeriodsPage } from '@/components/periods/periods-page';
import { dashboard } from '@/routes';

export default function PeriodsIndex() {
    return (
        <>
            <Head title="Periodos" />
            <PeriodsPage />
        </>
    );
}

PeriodsIndex.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Periodos', href: '/periodos' },
    ],
};
