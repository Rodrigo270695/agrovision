import { Head } from '@inertiajs/react';
import { PlacesPage } from '@/components/places/places-page';
import { dashboard } from '@/routes';

export default function PlacesIndex() {
    return (
        <>
            <Head title="Lugares" />
            <PlacesPage />
        </>
    );
}

PlacesIndex.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Plataforma', href: '/lugares' },
        { title: 'Lugares', href: '/lugares' },
    ],
};
