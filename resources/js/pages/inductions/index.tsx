import { Head } from '@inertiajs/react';
import { InductionsPage } from '@/components/inductions/inductions-page';
import { dashboard } from '@/routes';

export default function InductionsIndex() {
    return (
        <>
            <Head title="Inducción · Configuración" />
            <InductionsPage />
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
