import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { PlaceItem } from '@/components/places/places-table';
import { AppDeleteModal } from '@/components/shared/app-delete-modal';

type Props = {
    open: boolean;
    place: PlaceItem | null;
    onClose: () => void;
};

export function PlaceDeleteModal({ open, place, onClose }: Props) {
    const [processing, setProcessing] = useState(false);

    const handleConfirm = () => {
        if (!place || processing) {
            return;
        }

        setProcessing(true);

        router.delete(`/lugares/${place.id}`, {
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
            title="Eliminar lugar"
            description="Confirma si deseas eliminar este lugar."
            itemName={place?.name}
            confirmLabel="Eliminar lugar"
            processing={processing}
        />
    );
}
