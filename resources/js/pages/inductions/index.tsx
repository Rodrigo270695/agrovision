import { Head } from '@inertiajs/react';
import { InductionsCatalogPage } from '@/components/inductions/inductions-catalog-page';
import { dashboard } from '@/routes';

export default function InductionsIndex() {
    return (
        <>
            <Head title="Inducción · Configuración" />
            <InductionsCatalogPage />
        </>
    );
}

InductionsIndex.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Inducción', href: '/inducciones' },
        { title: 'Configuración', href: '/inducciones' },
    ],
};
