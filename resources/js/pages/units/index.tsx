import { Head } from '@inertiajs/react';
import { UnitsPage } from '@/components/units/units-page';
import { dashboard } from '@/routes';

export default function UnitsIndex() {
    return (
        <>
            <Head title="Unidades" />
            <UnitsPage />
        </>
    );
}

UnitsIndex.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Unidades', href: '/unidades' },
    ],
};
