import { Head } from '@inertiajs/react';
import { FleetDataPage } from '@/components/fleet-data/fleet-data-page';
import { dashboard } from '@/routes';

export default function FleetDataIndex() {
    return (
        <>
            <Head title="Seguro RC y GPS" />
            <FleetDataPage />
        </>
    );
}

FleetDataIndex.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Plataforma', href: '/datos-flota' },
        { title: 'Seguro RC y GPS', href: '/datos-flota' },
    ],
};
