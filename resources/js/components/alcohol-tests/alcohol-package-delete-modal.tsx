import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { AlcoholPackageItem } from '@/components/alcohol-tests/alcohol-packages-table';
import { AppDeleteModal } from '@/components/shared/app-delete-modal';

type Props = {
    open: boolean;
    packageItem: AlcoholPackageItem | null;
    onClose: () => void;
};

export function AlcoholPackageDeleteModal({
    open,
    packageItem,
    onClose,
}: Props) {
    const [processing, setProcessing] = useState(false);

    const handleConfirm = () => {
        if (!packageItem || processing) {
            return;
        }

        setProcessing(true);

        router.delete(`/alcoholimetro/${packageItem.id}`, {
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
            onClose={() => {
                if (!processing) {
                    onClose();
                }
            }}
            onConfirm={handleConfirm}
            title="Eliminar paquete"
            description="Se eliminan el paquete y los tests que contiene, con sus fotos. Esta acción no se puede deshacer."
            itemName={packageItem?.title}
            confirmLabel="Eliminar paquete"
            processing={processing}
        />
    );
}
