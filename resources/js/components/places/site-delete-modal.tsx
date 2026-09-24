import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { SiteItem } from '@/components/places/sites-table';
import { AppDeleteModal } from '@/components/shared/app-delete-modal';

type Props = {
    open: boolean;
    site: SiteItem | null;
    onClose: () => void;
};

export function SiteDeleteModal({ open, site, onClose }: Props) {
    const [processing, setProcessing] = useState(false);

    const handleConfirm = () => {
        if (!site || processing) {
            return;
        }

        setProcessing(true);

        router.delete(`/sedes/${site.id}`, {
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
            title="Eliminar sede"
            description="Solo se puede eliminar una sede que no tenga lugares."
            itemName={site?.name}
            confirmLabel="Eliminar sede"
            processing={processing}
        />
    );
}
