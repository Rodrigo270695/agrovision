import { useForm } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { PlaceFormFields } from '@/components/places/place-form-fields';
import type { PlaceItem } from '@/components/places/places-table';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type Props = {
    open: boolean;
    place?: PlaceItem | null;
    siteId?: number | null;
    onClose: () => void;
};

const emptyValues = {
    name: '',
    description: '',
    status: 'active' as const,
    site_id: '' as number | '',
};

export function PlaceFormModal({
    open,
    place = null,
    siteId = null,
    onClose,
}: Props) {
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
            site_id: siteId ?? '',
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, place?.id, siteId]);

    const canSubmit = useMemo(
        () =>
            form.data.name.trim().length > 0 &&
            Boolean(siteId) &&
            !form.processing,
        [form.data.name, form.processing, siteId],
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
                        className="cursor-pointer border-brand-300 text-brand-700 hover:bg-white"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="place-form"
                        disabled={!canSubmit}
                        className="cursor-pointer bg-brand-700 text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                <InputError message={form.errors.site_id} className="mt-3" />
            </form>
        </AppModal>
    );
}
