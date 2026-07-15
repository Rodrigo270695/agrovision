import { router } from '@inertiajs/react';
import { useState } from 'react';
import { AppDeleteModal } from '@/components/shared/app-delete-modal';
import type { ParetoItem } from '@/components/pareto/pareto-table';

type Props = {
    open: boolean;
    item: ParetoItem | null;
    onClose: () => void;
};

export function ParetoDeleteModal({ open, item, onClose }: Props) {
    const [processing, setProcessing] = useState(false);

    const handleConfirm = () => {
        if (!item || processing) {
            return;
        }

        setProcessing(true);
        router.delete(`/pareto/${item.id}`, {
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
            title="Eliminar ítem Pareto"
            description="Se quitará esta exigencia del catálogo Pareto."
            itemName={item ? `${item.item_number}. ${item.label}` : undefined}
            confirmLabel="Eliminar"
            processing={processing}
        />
    );
}
