import { Head } from '@inertiajs/react';
import { ParetoPage } from '@/components/pareto/pareto-page';
import { dashboard } from '@/routes';

export default function ParetoIndex() {
    return (
        <>
            <Head title="Pareto" />
            <ParetoPage />
        </>
    );
}

ParetoIndex.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Plataforma', href: '#' },
        { title: 'Pareto', href: '/pareto' },
    ],
};
