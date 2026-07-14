import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type AppDeleteModalProps = {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
    itemName?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    processing?: boolean;
    children?: ReactNode;
};

/**
 * Modal padre reutilizable para confirmar eliminaciones.
 * Usa AppModal: solo se cierra con Esc, X o Cancelar.
 */
export function AppDeleteModal({
    open,
    onClose,
    onConfirm,
    title = 'Eliminar registro',
    description = 'Esta acción no se puede deshacer.',
    itemName,
    confirmLabel = 'Eliminar',
    cancelLabel = 'Cancelar',
    processing = false,
    children,
}: AppDeleteModalProps) {
    return (
        <AppModal
            open={open}
            onClose={onClose}
            title={title}
            description={description}
            className="sm:max-w-md"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={processing}
                        className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c] hover:bg-white disabled:cursor-not-allowed"
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        onClick={onConfirm}
                        disabled={processing}
                        className="cursor-pointer bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {processing ? <Spinner /> : null}
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            {children ?? (
                <div className="flex gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                    <TriangleAlert className="mt-0.5 size-5 shrink-0 text-red-600" />
                    <p className="text-sm text-[#4a3a3a]">
                        {itemName ? (
                            <>
                                ¿Seguro que deseas eliminar{' '}
                                <strong className="font-semibold text-[#1a2b4c]">
                                    {itemName}
                                </strong>
                                ? No podrás recuperar este registro
                                después.
                            </>
                        ) : (
                            '¿Seguro que deseas continuar con la eliminación?'
                        )}
                    </p>
                </div>
            )}
        </AppModal>
    );
}
