import { router } from '@inertiajs/react';
import { useState } from 'react';
import { AppDeleteModal } from '@/components/shared/app-delete-modal';
import type { PeriodItem } from '@/components/periods/periods-table';

type Props = {
    open: boolean;
    period: PeriodItem | null;
    onClose: () => void;
};

export function PeriodDeleteModal({ open, period, onClose }: Props) {
    const [processing, setProcessing] = useState(false);

    const handleClose = () => {
        if (processing) {
            return;
        }

        onClose();
    };

    const handleConfirm = () => {
        if (!period || processing) {
            return;
        }

        setProcessing(true);

        router.delete(`/periodos/${period.id}`, {
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
            title="Eliminar periodo"
            description="Confirma si deseas eliminar este periodo del sistema."
            itemName={period?.name}
            confirmLabel="Eliminar periodo"
            processing={processing}
        />
    );
}
