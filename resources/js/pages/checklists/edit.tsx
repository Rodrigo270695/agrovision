import { Head, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import {
    ChecklistEditForm,
    type ChecklistFormData,
} from '@/components/checklists/checklist-edit-form';
import { saveEditSnapshot } from '@/lib/offline/store';
import { dashboard } from '@/routes';

type PageProps = {
    checklist: ChecklistFormData;
};

export default function ChecklistEditPage() {
    const { checklist } = usePage().props as unknown as PageProps;

    useEffect(() => {
        void saveEditSnapshot(checklist);
    }, [checklist]);

    return (
        <>
            <Head
                title={`Inspección ${checklist.template.type.toUpperCase()} · ${checklist.plate_number}`}
            />
            <div className="flex flex-col gap-4 p-4">
                <ChecklistEditForm checklist={checklist} />
            </div>
        </>
    );
}

ChecklistEditPage.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Inspecciones', href: '/inspecciones' },
        { title: 'Editar', href: '#' },
    ],
};
