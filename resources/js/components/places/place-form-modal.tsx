import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, type FormEvent } from 'react';
import { PlaceFormFields } from '@/components/places/place-form-fields';
import type { PlaceItem } from '@/components/places/places-table';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type Props = {
    open: boolean;
    place?: PlaceItem | null;
    onClose: () => void;
};

const emptyValues = {
    name: '',
    description: '',
    status: 'active' as const,
};

export function PlaceFormModal({ open, place = null, onClose }: Props) {
    const isEditing = Boolean(place);
    const form = useForm(emptyValues);

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({
            name: place?.name ?? '',
            description: place?.description ?? '',
            status: place?.status === 'inactive' ? 'inactive' : 'active',
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, place?.id]);

    const canSubmit = useMemo(
        () => form.data.name.trim().length > 0 && !form.processing,
        [form.data.name, form.processing],
    );

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

        const options = {
            preserveScroll: true,
            onSuccess: () => handleClose(),
        };

        if (isEditing && place) {
            form.put(`/lugares/${place.id}`, options);

            return;
        }

        form.post('/lugares', options);
    };

    return (
        <AppModal
            open={open}
            onClose={handleClose}
            title={isEditing ? 'Editar lugar' : 'Nuevo lugar'}
            description="El nombre es obligatorio. La descripción es opcional."
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
                        form="place-form"
                        disabled={!canSubmit}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {form.processing ? <Spinner /> : null}
                        {isEditing ? 'Guardar cambios' : 'Crear lugar'}
                    </Button>
                </>
            }
        >
            <form id="place-form" onSubmit={handleSubmit}>
                <PlaceFormFields
                    values={form.data}
                    errors={{
                        name: form.errors.name,
                        description: form.errors.description,
                        status: form.errors.status,
                    }}
                    onChange={(field, value) => form.setData(field, value)}
                />
            </form>
        </AppModal>
    );
}
