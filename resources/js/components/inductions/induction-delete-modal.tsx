import { router } from '@inertiajs/react';
import { useState } from 'react';
import { AppDeleteModal } from '@/components/shared/app-delete-modal';
import type { InductionItem } from '@/components/inductions/inductions-table';

type Props = {
    open: boolean;
    induction: InductionItem | null;
    onClose: () => void;
};

export function InductionDeleteModal({ open, induction, onClose }: Props) {
    const [processing, setProcessing] = useState(false);

    const handleClose = () => {
        if (processing) {
            return;
        }

        onClose();
    };

    const handleConfirm = () => {
        if (!induction || processing) {
            return;
        }

        setProcessing(true);

        router.delete(`/inducciones/${induction.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setProcessing(false);
                onClose();
            },
            onError: () => setProcessing(false),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <AppDeleteModal
            open={open}
            onClose={handleClose}
            onConfirm={handleConfirm}
            title="Eliminar inducción"
            description="Se eliminarán también los asistentes registrados."
            itemName={induction?.title}
            confirmLabel="Eliminar inducción"
            processing={processing}
        />
    );
}
