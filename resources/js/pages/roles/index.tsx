import { Head } from '@inertiajs/react';
import { RolesPage } from '@/components/roles/roles-page';
import { dashboard } from '@/routes';

export default function RolesIndex() {
    return (
        <>
            <Head title="Roles" />
            <RolesPage />
        </>
    );
}

RolesIndex.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Roles', href: '/roles' },
    ],
};
