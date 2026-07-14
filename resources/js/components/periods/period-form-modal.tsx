import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, type FormEvent } from 'react';
import { PeriodFormFields } from '@/components/periods/period-form-fields';
import type { PeriodItem } from '@/components/periods/periods-table';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type Props = {
    open: boolean;
    period?: PeriodItem | null;
    onClose: () => void;
};

const emptyValues = {
    name: '',
    date: '',
    status: 'active' as const,
};

export function PeriodFormModal({ open, period = null, onClose }: Props) {
    const isEditing = Boolean(period);
    const form = useForm(emptyValues);

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({
            name: period?.name ?? '',
            date: period?.date ? String(period.date).slice(0, 10) : '',
            status: period?.status === 'inactive' ? 'inactive' : 'active',
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, period?.id]);

    const canSubmit = useMemo(() => {
        return (
            form.data.name.trim().length > 0 &&
            form.data.date.length > 0 &&
            !form.processing
        );
    }, [form.data.name, form.data.date, form.processing]);

    const handleClose = () => {
        form.reset();
        form.clearErrors();
        form.setData(emptyValues);
        onClose();
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        if (isEditing && period) {
            form.put(`/periodos/${period.id}`, {
                preserveScroll: true,
                onSuccess: () => handleClose(),
            });
            return;
        }

        form.post('/periodos', {
            preserveScroll: true,
            onSuccess: () => handleClose(),
        });
    };

    return (
        <AppModal
            open={open}
            onClose={handleClose}
            title={isEditing ? 'Editar periodo' : 'Nuevo periodo'}
            description={
                isEditing
                    ? 'Actualiza la información del periodo seleccionado.'
                    : 'Completa los datos para registrar un nuevo periodo.'
            }
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c] hover:bg-white"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="period-form"
                        disabled={!canSubmit}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {form.processing ? <Spinner /> : null}
                        {isEditing ? 'Guardar cambios' : 'Crear periodo'}
                    </Button>
                </>
            }
        >
            <form id="period-form" onSubmit={handleSubmit}>
                <PeriodFormFields
                    values={form.data}
                    errors={{
                        name: form.errors.name,
                        date: form.errors.date,
                        status: form.errors.status,
                    }}
                    onChange={(field, value) => form.setData(field, value)}
                />
            </form>
        </AppModal>
    );
}
