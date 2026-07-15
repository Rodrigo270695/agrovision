import { Head } from '@inertiajs/react';
import { AlcoholTestsPage } from '@/components/alcohol-tests/alcohol-tests-page';
import { dashboard } from '@/routes';

export default function AlcoholTestsIndex() {
    return (
        <>
            <Head title="Alcohómetro" />
            <AlcoholTestsPage />
        </>
    );
}

AlcoholTestsIndex.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Alcohómetro', href: '/alcoholimetro' },
    ],
};
