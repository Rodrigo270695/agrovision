import { Head } from '@inertiajs/react';
import { InductionShowPage } from '@/components/inductions/induction-show-page';
import { dashboard } from '@/routes';

export default function InductionShow() {
    return (
        <>
            <Head title="Inducción · Asistentes" />
            <InductionShowPage />
        </>
    );
}

InductionShow.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Inducción', href: '/inducciones' },
        { title: 'Asistentes', href: '/inducciones' },
    ],
};
