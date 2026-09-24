import { useForm } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
import type { FormEvent } from 'react';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { UserFormFields } from '@/components/users/user-form-fields';
import type { UserItem } from '@/components/users/users-table';

type Props = {
    open: boolean;
    user?: UserItem | null;
    places?: { id: number; name: string; site_name?: string | null }[];
    onClose: () => void;
};

const emptyValues = {
    name: '',
    email: '',
    document_type: 'dni',
    document_number: '',
    phone: '',
    place_id: '',
    place_ids: [] as string[],
    password: '',
    password_confirmation: '',
};

export function UserFormModal({
    open,
    user = null,
    places = [],
    onClose,
}: Props) {
    const isEditing = Boolean(user);
    const multiplePlaces =
        user?.roles?.some((role) => role.name.toLowerCase() === 'coordinador') ??
        false;
    const form = useForm(emptyValues);

    useEffect(() => {
        if (!open) {
            return;
        }

        const activeIds = new Set(places.map((place) => String(place.id)));
        const assigned = (user?.places ?? [])
            .map((place) => String(place.id))
            .filter((id) => activeIds.has(id));
        const primary =
            user?.place_id && activeIds.has(String(user.place_id))
                ? String(user.place_id)
                : '';
        const placeIds = primary
            ? [primary, ...assigned.filter((id) => id !== primary)]
            : assigned;

        form.setData({
            name: user?.name ?? '',
            email: user?.email ?? '',
            document_type: user?.document_type ?? 'dni',
            document_number: user?.document_number ?? '',
            phone: user?.phone ?? '',
            place_id: primary,
            place_ids: placeIds,
            password: '',
            password_confirmation: '',
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, user?.id]);

    const canSubmit = useMemo(() => {
        const docOk =
            form.data.document_type === 'dni'
                ? form.data.document_number.replace(/\D/g, '').length === 8
                : form.data.document_number.trim().length > 0;

        const phoneOk = /^9\d{8}$/.test(
            form.data.phone.replace(/\D/g, '').slice(0, 9),
        );

        const hasBasics =
            form.data.name.trim().length > 0 &&
            form.data.email.trim().length > 0 &&
            docOk &&
            phoneOk;

        if (!hasBasics || form.processing) {
            return false;
        }

        const { password, password_confirmation } = form.data;

        if (!isEditing) {
            return (
                password.length >= 8 && password === password_confirmation
            );
        }

        if (password.length === 0 && password_confirmation.length === 0) {
            return true;
        }

        return password.length >= 8 && password === password_confirmation;
    }, [form.data, form.processing, isEditing]);

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

        form.transform(
            ({ place_id, place_ids, password, password_confirmation, ...rest }) => {
                const placesPayload = multiplePlaces
                    ? { place_ids: place_ids.map((id) => Number(id)) }
                    : { place_id: place_id ? Number(place_id) : null };

                if (!password) {
                    return { ...rest, ...placesPayload };
                }

                return {
                    ...rest,
                    ...placesPayload,
                    password,
                    password_confirmation,
                };
            },
        );

        if (isEditing && user) {
            form.put(`/usuarios/${user.id}`, {
                preserveScroll: true,
                onSuccess: () => handleClose(),
                onFinish: () => {
                    form.transform((data) => data);
                },
            });

            return;
        }

        form.post('/usuarios', {
            preserveScroll: true,
            onSuccess: () => handleClose(),
        });
    };

    return (
        <AppModal
            open={open}
            onClose={handleClose}
            title={isEditing ? 'Editar usuario' : 'Nuevo usuario'}
            description={
                isEditing
                    ? 'Actualiza la información del usuario seleccionado.'
                    : 'Completa los datos para registrar un nuevo usuario.'
            }
            className="sm:max-w-lg"
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
                        form="user-form"
                        disabled={!canSubmit}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {form.processing ? <Spinner /> : null}
                        {isEditing ? 'Guardar cambios' : 'Crear usuario'}
                    </Button>
                </>
            }
        >
            <form id="user-form" onSubmit={handleSubmit} className="space-y-1">
                <UserFormFields
                    values={form.data}
                    errors={{
                        name: form.errors.name,
                        email: form.errors.email,
                        document_type: form.errors.document_type,
                        document_number: form.errors.document_number,
                        phone: form.errors.phone,
                        place_id: form.errors.place_id,
                        place_ids: form.errors.place_ids,
                        'place_ids.0': form.errors['place_ids.0'],
                        password: form.errors.password,
                        password_confirmation:
                            form.errors.password_confirmation,
                    }}
                    onChange={(field, value) => form.setData(field, value)}
                    onPlaceIdsChange={(placeIds) =>
                        form.setData('place_ids', placeIds)
                    }
                    places={places}
                    multiplePlaces={multiplePlaces}
                    requiresPlace={
                        user?.roles?.some((role) =>
                            ['coordinador', 'inspector'].includes(
                                role.name.toLowerCase(),
                            ),
                        ) ?? false
                    }
                    isEditing={isEditing}
                />
            </form>
        </AppModal>
    );
}
