import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, type FormEvent } from 'react';
import { FormModal } from '@/components/forms/form-modal';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type TenantEditRow = {
    id: string;
    name: string;
};

type Props = {
    open: boolean;
    tenant?: TenantEditRow | null;
    modules: Record<string, string>;
    onClose: () => void;
};

const lockedModules = new Set(['dashboard', 'users', 'roles']);

const inputClassName =
    'h-11 border-[#c5d5e6] bg-white focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/35';

function defaultModules(catalog: Record<string, string>): Record<string, boolean> {
    return Object.fromEntries(Object.keys(catalog).map((key) => [key, true]));
}

export function TenantFormModal({ open, tenant = null, modules, onClose }: Props) {
    const isEditing = Boolean(tenant);
    const form = useForm({
        id: '',
        name: '',
        admin_name: '',
        admin_email: '',
        admin_password: '',
        modules: defaultModules(modules),
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({
            id: tenant?.id ?? '',
            name: tenant?.name ?? '',
            admin_name: '',
            admin_email: '',
            admin_password: '',
            modules: defaultModules(modules),
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, tenant?.id]);

    const canSubmit = useMemo(() => {
        if (form.processing || form.data.name.trim().length === 0) {
            return false;
        }

        if (isEditing) {
            return true;
        }

        return (
            form.data.id.trim().length > 0 &&
            form.data.admin_name.trim().length > 0 &&
            form.data.admin_email.trim().length > 0 &&
            form.data.admin_password.length >= 8
        );
    }, [form.data, form.processing, isEditing]);

    const handleClose = () => {
        form.reset();
        form.clearErrors();
        onClose();
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        if (isEditing && tenant) {
            form.transform((data) => ({
                name: data.name,
                modules: data.modules,
            }));
            form.put(`/plataforma/empresas/${tenant.id}`, {
                preserveScroll: true,
                onSuccess: () => handleClose(),
                onFinish: () => form.transform((data) => data),
            });
            return;
        }

        form.post('/plataforma/empresas', {
            preserveScroll: true,
            onSuccess: () => handleClose(),
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                    handleClose();
                }
            }}
            title={isEditing ? 'Editar empresa' : 'Nueva empresa'}
            description={
                isEditing
                    ? 'Actualiza el nombre y los módulos de la empresa.'
                    : 'Crea el tenant, el schema y el administrador inicial.'
            }
            size="lg"
            onSubmit={handleSubmit}
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
                        disabled={!canSubmit}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {form.processing ? <Spinner /> : null}
                        {isEditing ? 'Guardar cambios' : 'Crear empresa'}
                    </Button>
                </>
            }
        >
            <div className="grid gap-4">
                <div className="grid gap-1.5">
                    <Label htmlFor="tenant-id">Slug / subdominio</Label>
                    <Input
                        id="tenant-id"
                        value={form.data.id}
                        disabled={isEditing}
                        onChange={(event) => form.setData('id', event.target.value)}
                        placeholder="agrovision"
                        className={inputClassName}
                    />
                    <InputError message={form.errors.id} />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="tenant-name">Nombre</Label>
                    <Input
                        id="tenant-name"
                        value={form.data.name}
                        onChange={(event) => form.setData('name', event.target.value)}
                        placeholder="Agrovision"
                        className={inputClassName}
                    />
                    <InputError message={form.errors.name} />
                </div>

                {isEditing ? null : (
                    <>
                        <div className="grid gap-1.5">
                            <Label htmlFor="tenant-admin-name">Admin</Label>
                            <Input
                                id="tenant-admin-name"
                                value={form.data.admin_name}
                                onChange={(event) =>
                                    form.setData('admin_name', event.target.value)
                                }
                                placeholder="Administrador"
                                className={inputClassName}
                            />
                            <InputError message={form.errors.admin_name} />
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="tenant-admin-email">Email admin</Label>
                            <Input
                                id="tenant-admin-email"
                                type="email"
                                value={form.data.admin_email}
                                onChange={(event) =>
                                    form.setData('admin_email', event.target.value)
                                }
                                className={inputClassName}
                            />
                            <InputError message={form.errors.admin_email} />
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="tenant-admin-password">Password admin</Label>
                            <PasswordInput
                                id="tenant-admin-password"
                                value={form.data.admin_password}
                                onChange={(event) =>
                                    form.setData('admin_password', event.target.value)
                                }
                                className={inputClassName}
                            />
                            <InputError message={form.errors.admin_password} />
                        </div>
                    </>
                )}

                <div className="grid gap-2">
                    <p className="text-sm font-medium text-[#1a2b4c]">Módulos</p>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(modules).map(([key, label]) => {
                            const locked = lockedModules.has(key);

                            return (
                                <label
                                    key={key}
                                    className="flex items-center gap-2 text-sm text-[#1a2b4c]"
                                >
                                    <Checkbox
                                        checked={form.data.modules[key] ?? true}
                                        disabled={locked}
                                        onCheckedChange={(checked) =>
                                            form.setData('modules', {
                                                ...form.data.modules,
                                                [key]: checked === true,
                                            })
                                        }
                                    />
                                    {label}
                                </label>
                            );
                        })}
                    </div>
                </div>
            </div>
        </FormModal>
    );
}
