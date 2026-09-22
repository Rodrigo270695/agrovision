import { Head } from '@inertiajs/react';
import { ChecklistsPage } from '@/components/checklists/checklists-page';
import { dashboard } from '@/routes';

export default function ChecklistsIndex() {
    return (
        <>
            <Head title="Inspecciones" />
            <ChecklistsPage />
        </>
    );
}

ChecklistsIndex.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Plataforma', href: '/inspecciones' },
        { title: 'Inspecciones', href: '/inspecciones' },
    ],
};
