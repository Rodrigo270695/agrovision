import { router } from '@inertiajs/react';
import { useState } from 'react';
import { AppDeleteModal } from '@/components/shared/app-delete-modal';
import type { UserItem } from '@/components/users/users-table';

type Props = {
    open: boolean;
    user: UserItem | null;
    onClose: () => void;
};

export function UserDeleteModal({ open, user, onClose }: Props) {
    const [processing, setProcessing] = useState(false);

    const handleClose = () => {
        if (processing) {
            return;
        }

        onClose();
    };

    const handleConfirm = () => {
        if (!user || processing) {
            return;
        }

        setProcessing(true);

        router.delete(`/usuarios/${user.id}`, {
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
            title="Eliminar usuario"
            description="Confirma si deseas eliminar este usuario del sistema."
            itemName={user?.name}
            confirmLabel="Eliminar usuario"
            processing={processing}
        />
    );
}
