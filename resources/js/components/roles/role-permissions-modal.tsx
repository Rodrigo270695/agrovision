import { useForm } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { RoleItem } from '@/components/roles/roles-table';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export type PermissionCatalogItem = {
    id?: number | null;
    name: string;
    label: string;
    module: string;
};

type Props = {
    open: boolean;
    role: RoleItem | null;
    catalog: PermissionCatalogItem[];
    onClose: () => void;
};

const checkClassName =
    'size-3.5 shrink-0 border-[#9bb4ce] data-[state=checked]:border-[#2e5a9e] data-[state=checked]:bg-[#2e5a9e] data-[state=checked]:text-white data-[state=indeterminate]:border-[#2e5a9e] data-[state=indeterminate]:bg-[#2e5a9e] data-[state=indeterminate]:text-white';

export function RolePermissionsModal({
    open,
    role,
    catalog,
    onClose,
}: Props) {
    const [search, setSearch] = useState('');
    const form = useForm<{ permissions: string[] }>({
        permissions: [],
    });

    useEffect(() => {
        if (!open || !role) {
            return;
        }

        setSearch('');
        form.setData(
            'permissions',
            role.permissions?.map((permission) => permission.name) ?? [],
        );
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, role?.id]);

    const grouped = useMemo(() => {
        const query = search.trim().toLowerCase();
        const groups = new Map<string, PermissionCatalogItem[]>();

        for (const item of catalog) {
            if (
                query &&
                !item.label.toLowerCase().includes(query) &&
                !item.name.toLowerCase().includes(query) &&
                !item.module.toLowerCase().includes(query)
            ) {
                continue;
            }

            const current = groups.get(item.module) ?? [];
            current.push(item);
            groups.set(item.module, current);
        }

        return Array.from(groups.entries());
    }, [catalog, search]);

    const selectedTotal = form.data.permissions.length;

    const handleClose = () => {
        if (form.processing) {
            return;
        }

        form.reset();
        form.clearErrors();
        setSearch('');
        onClose();
    };

    const togglePermission = (name: string, checked: boolean) => {
        const next = checked
            ? [...form.data.permissions, name]
            : form.data.permissions.filter((item) => item !== name);

        form.setData('permissions', next);
    };

    const toggleModule = (
        moduleItems: PermissionCatalogItem[],
        checked: boolean,
    ) => {
        const names = moduleItems.map((item) => item.name);

        if (checked) {
            form.setData('permissions', [
                ...new Set([...form.data.permissions, ...names]),
            ]);
            return;
        }

        form.setData(
            'permissions',
            form.data.permissions.filter((name) => !names.includes(name)),
        );
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!role) {
            return;
        }

        form.put(`/roles/${role.id}/permissions`, {
            preserveScroll: true,
            onSuccess: () => handleClose(),
        });
    };

    return (
        <AppModal
            open={open}
            onClose={handleClose}
            title="Asignar permisos"
            description={
                role
                    ? `Rol "${role.name}" · ${selectedTotal} seleccionados`
                    : 'Selecciona los permisos del rol.'
            }
            className="sm:max-w-2xl"
            bodyClassName="!p-0"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={form.processing}
                        className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c] hover:bg-white"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="role-permissions-form"
                        disabled={form.processing || !role}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {form.processing ? <Spinner /> : null}
                        Guardar permisos
                    </Button>
                </>
            }
        >
            <form
                id="role-permissions-form"
                onSubmit={handleSubmit}
                className="flex flex-col"
            >
                <div className="sticky top-0 z-10 border-b border-[#e2eaf3] bg-white px-4 py-2 sm:px-5">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#6b8ead]" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar permiso o módulo..."
                            className="h-8 border-[#c5d5e6] bg-[#f8fafc] pl-8 text-xs focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/30"
                        />
                    </div>
                </div>

                <div className="space-y-2 px-4 py-2.5 sm:px-5">
                    {grouped.length === 0 ? (
                        <p className="py-6 text-center text-xs text-[#6b8ead]">
                            No se encontraron permisos.
                        </p>
                    ) : (
                        grouped.map(([module, items]) => {
                            const selectedCount = items.filter((item) =>
                                form.data.permissions.includes(item.name),
                            ).length;
                            const allSelected =
                                items.length > 0 &&
                                selectedCount === items.length;
                            const someSelected =
                                selectedCount > 0 && !allSelected;

                            return (
                                <section
                                    key={module}
                                    className="rounded-lg border border-[#e2eaf3] bg-[#f8fafc]/70"
                                >
                                    <div className="flex items-center justify-between gap-2 border-b border-[#e2eaf3] px-2.5 py-1.5">
                                        <h3 className="text-xs font-semibold text-[#1a2b4c]">
                                            {module}
                                            <span className="ml-1.5 font-normal text-[#6b8ead]">
                                                {selectedCount}/{items.length}
                                            </span>
                                        </h3>
                                        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-[#5a7390]">
                                            <Checkbox
                                                checked={
                                                    allSelected
                                                        ? true
                                                        : someSelected
                                                          ? 'indeterminate'
                                                          : false
                                                }
                                                onCheckedChange={(value) =>
                                                    toggleModule(
                                                        items,
                                                        value === true,
                                                    )
                                                }
                                                className={checkClassName}
                                            />
                                            Todos
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-1 gap-0.5 p-1.5 sm:grid-cols-2 lg:grid-cols-3">
                                        {items.map((item) => {
                                            const checked =
                                                form.data.permissions.includes(
                                                    item.name,
                                                );

                                            return (
                                                <label
                                                    key={item.name}
                                                    title={item.name}
                                                    className={cn(
                                                        'flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-[#1a2b4c] transition-colors hover:bg-white',
                                                        checked &&
                                                            'bg-[#e8f1fa]/70 ring-1 ring-[#c5d5e6]',
                                                    )}
                                                >
                                                    <Checkbox
                                                        checked={checked}
                                                        onCheckedChange={(
                                                            value,
                                                        ) =>
                                                            togglePermission(
                                                                item.name,
                                                                value === true,
                                                            )
                                                        }
                                                        className={checkClassName}
                                                    />
                                                    <span className="truncate font-medium leading-tight">
                                                        {item.label}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })
                    )}

                    {form.errors.permissions ? (
                        <p className="text-xs text-red-600">
                            {form.errors.permissions}
                        </p>
                    ) : null}
                </div>
            </form>
        </AppModal>
    );
}
