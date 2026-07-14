import { Head } from '@inertiajs/react';
import { UsersPage } from '@/components/users/users-page';
import { dashboard } from '@/routes';

export default function UsersIndex() {
    return (
        <>
            <Head title="Usuarios" />
            <UsersPage />
        </>
    );
}

UsersIndex.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Usuarios', href: '/usuarios' },
    ],
};
