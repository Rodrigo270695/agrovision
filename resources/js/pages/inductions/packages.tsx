import { Head, usePage } from '@inertiajs/react';
import { InductionsPage } from '@/components/inductions/inductions-page';
import { dashboard } from '@/routes';

type CatalogType = {
    slug: string;
    title: string;
    short: string;
};

export default function InductionPackagesPage() {
    const { catalogType } = usePage().props as unknown as {
        catalogType: CatalogType;
    };

    return (
        <>
            <Head title={`Paquetes · ${catalogType?.short ?? 'Inducción'}`} />
            <InductionsPage />
        </>
    );
}

InductionPackagesPage.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Inducción', href: '/inducciones' },
        { title: 'Configuración', href: '/inducciones' },
        { title: 'Paquetes', href: '/inducciones' },
    ],
};
