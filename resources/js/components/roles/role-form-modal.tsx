import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, type FormEvent } from 'react';
import { RoleFormFields } from '@/components/roles/role-form-fields';
import type { RoleItem } from '@/components/roles/roles-table';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type Props = {
    open: boolean;
    role?: RoleItem | null;
    onClose: () => void;
};

const emptyValues = {
    name: '',
};

export function RoleFormModal({ open, role = null, onClose }: Props) {
    const isEditing = Boolean(role);
    const form = useForm(emptyValues);

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({
            name: role?.name ?? '',
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, role?.id]);

    const canSubmit = useMemo(() => {
        return form.data.name.trim().length > 0 && !form.processing;
    }, [form.data.name, form.processing]);

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

        if (isEditing && role) {
            form.put(`/roles/${role.id}`, {
                preserveScroll: true,
                onSuccess: () => handleClose(),
            });
            return;
        }

        form.post('/roles', {
            preserveScroll: true,
            onSuccess: () => handleClose(),
        });
    };

    return (
        <AppModal
            open={open}
            onClose={handleClose}
            title={isEditing ? 'Editar rol' : 'Nuevo rol'}
            description={
                isEditing
                    ? 'Actualiza la información del rol seleccionado.'
                    : 'Completa los datos para registrar un nuevo rol.'
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
                        form="role-form"
                        disabled={!canSubmit}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {form.processing ? <Spinner /> : null}
                        {isEditing ? 'Guardar cambios' : 'Crear rol'}
                    </Button>
                </>
            }
        >
            <form id="role-form" onSubmit={handleSubmit} className="space-y-1">
                <RoleFormFields
                    values={form.data}
                    errors={{
                        name: form.errors.name,
                    }}
                    onChange={(field, value) => form.setData(field, value)}
                />
            </form>
        </AppModal>
    );
}
