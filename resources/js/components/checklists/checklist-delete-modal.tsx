import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { ChecklistItemRow } from '@/components/checklists/checklists-table';
import { AppDeleteModal } from '@/components/shared/app-delete-modal';

type Props = {
    open: boolean;
    checklist: ChecklistItemRow | null;
    onClose: () => void;
};

export function ChecklistDeleteModal({ open, checklist, onClose }: Props) {
    const [processing, setProcessing] = useState(false);

    const handleConfirm = () => {
        if (!checklist || processing) {
            return;
        }

        setProcessing(true);

        router.delete(`/inspecciones/${checklist.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setProcessing(false);
                onClose();
            },
        });
    };

    return (
        <AppDeleteModal
            open={open}
            onClose={onClose}
            onConfirm={handleConfirm}
            processing={processing}
            title="Eliminar inspección"
            description="Se eliminará el checklist y todas sus respuestas."
            itemName={
                checklist
                    ? `${checklist.plate_number} (${checklist.template?.type?.toUpperCase() ?? ''})`
                    : undefined
            }
        />
    );
}
