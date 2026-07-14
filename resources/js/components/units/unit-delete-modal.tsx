import { router } from '@inertiajs/react';
import { useState } from 'react';
import { AppDeleteModal } from '@/components/shared/app-delete-modal';
import type { UnitItem } from '@/components/units/units-table';

type Props = {
    open: boolean;
    unit: UnitItem | null;
    onClose: () => void;
};

export function UnitDeleteModal({ open, unit, onClose }: Props) {
    const [processing, setProcessing] = useState(false);

    const handleClose = () => {
        if (processing) {
            return;
        }

        onClose();
    };

    const handleConfirm = () => {
        if (!unit || processing) {
            return;
        }

        setProcessing(true);

        router.delete(`/unidades/${unit.id}`, {
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
            title="Eliminar unidad"
            description="Confirma si deseas eliminar esta unidad del sistema."
            itemName={unit?.correlative}
            confirmLabel="Eliminar unidad"
            processing={processing}
        />
    );
}
