import { Head } from '@inertiajs/react';
import { AuditPage } from '@/components/audit/audit-page';
import { dashboard } from '@/routes';

export default function AuditIndex() {
    return (
        <>
            <Head title="Auditoría" />
            <AuditPage />
        </>
    );
}

AuditIndex.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Usuario', href: '/auditoria' },
        { title: 'Auditoría', href: '/auditoria' },
    ],
};
