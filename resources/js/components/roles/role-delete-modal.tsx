import { router } from '@inertiajs/react';
import { useState } from 'react';
import { AppDeleteModal } from '@/components/shared/app-delete-modal';
import type { RoleItem } from '@/components/roles/roles-table';

type Props = {
    open: boolean;
    role: RoleItem | null;
    onClose: () => void;
};

export function RoleDeleteModal({ open, role, onClose }: Props) {
    const [processing, setProcessing] = useState(false);

    const handleClose = () => {
        if (processing) {
            return;
        }

        onClose();
    };

    const handleConfirm = () => {
        if (!role || processing) {
            return;
        }

        setProcessing(true);

        router.delete(`/roles/${role.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setProcessing(false);
                onClose();
            },
            onError: () => {
                setProcessing(false);
            },
            onFinish: () => {
                setProcessing(false);
            },
        });
    };

    return (
        <AppDeleteModal
            open={open}
            onClose={handleClose}
            onConfirm={handleConfirm}
            title="Eliminar rol"
            description="Confirma si deseas eliminar este rol del sistema."
            itemName={role?.name}
            confirmLabel="Eliminar rol"
            processing={processing}
        />
    );
}
