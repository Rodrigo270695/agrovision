import { useForm } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { PlaceMultiPicker } from '@/components/users/place-multi-picker';
import type { PlaceOption } from '@/components/users/place-multi-picker';
import type { UserItem } from '@/components/users/users-table';
import { cn } from '@/lib/utils';

export type RoleOption = {
    id: number;
    name: string;
};

type Props = {
    open: boolean;
    user: UserItem | null;
    roles: RoleOption[];
    places: PlaceOption[];
    onClose: () => void;
};

const checkClassName =
    'size-3.5 shrink-0 border-[#9bb4ce] data-[state=checked]:border-[#2e5a9e] data-[state=checked]:bg-[#2e5a9e] data-[state=checked]:text-white';

export function UserRolesModal({
    open,
    user,
    roles,
    places,
    onClose,
}: Props) {
    const [search, setSearch] = useState('');
    const form = useForm<{
        roles: string[];
        place_id: string;
        place_ids: string[];
    }>({
        roles: [],
        place_id: '',
        place_ids: [],
    });

    useEffect(() => {
        if (!open || !user) {
            return;
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSearch('');
        const activeIds = new Set(places.map((place) => String(place.id)));
        const assigned = (user.places ?? [])
            .map((place) => String(place.id))
            .filter((id) => activeIds.has(id));
        const primary =
            user.place_id && activeIds.has(String(user.place_id))
                ? String(user.place_id)
                : '';
        const placeIds = primary
            ? [primary, ...assigned.filter((id) => id !== primary)]
            : assigned;

        form.setData({
            roles: user.roles?.map((role) => role.name) ?? [],
            place_id: primary,
            place_ids: placeIds,
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, user?.id]);

    const isCoordinator = form.data.roles.some(
        (role) => role.toLowerCase() === 'coordinador',
    );
    const isInspector = form.data.roles.some(
        (role) => role.toLowerCase() === 'inspector',
    );
    const needsPlace = isCoordinator || isInspector;

    const filteredRoles = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return roles;
        }

        return roles.filter((role) =>
            role.name.toLowerCase().includes(query),
        );
    }, [roles, search]);

    const handleClose = () => {
        if (form.processing) {
            return;
        }

        form.reset();
        form.clearErrors();
        setSearch('');
        onClose();
    };

    const toggleRole = (name: string, checked: boolean) => {
        form.setData(
            'roles',
            checked
                ? [...form.data.roles, name]
                : form.data.roles.filter((role) => role !== name),
        );
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!user) {
            return;
        }

        form.transform((data) => {
            const needsPlaces = data.roles.some((role) =>
                ['coordinador', 'inspector'].includes(role.toLowerCase()),
            );

            return {
                roles: data.roles,
                place_ids: needsPlaces
                    ? data.place_ids.map((id) => Number(id))
                    : [],
            };
        });

        form.put(`/usuarios/${user.id}/roles`, {
            preserveScroll: true,
            onSuccess: () => handleClose(),
        });
    };

    return (
        <AppModal
            open={open}
            onClose={handleClose}
            title="Asignar roles"
            description={
                user
                    ? `Usuario "${user.name}" · ${form.data.roles.length} seleccionados`
                    : 'Selecciona los roles del usuario.'
            }
            className="sm:max-w-lg"
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
                        form="user-roles-form"
                        disabled={form.processing || !user}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {form.processing ? <Spinner /> : null}
                        Guardar roles
                    </Button>
                </>
            }
        >
            <form
                id="user-roles-form"
                onSubmit={handleSubmit}
                className="flex flex-col"
            >
                <div className="sticky top-0 z-10 border-b border-[#e2eaf3] bg-white px-4 py-2 sm:px-5">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#6b8ead]" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar rol..."
                            className="h-8 border-[#c5d5e6] bg-[#f8fafc] pl-8 text-xs focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/30"
                        />
                    </div>
                </div>

                <div className="space-y-1 px-4 py-2.5 sm:px-5">
                    {needsPlace ? (
                        <div className="mb-2 grid gap-1.5">
                            <Label className="text-xs text-[#1a2b4c]">
                                Lugares <span className="text-red-500">*</span>
                            </Label>
                            <PlaceMultiPicker
                                places={places}
                                value={form.data.place_ids}
                                onChange={(placeIds) =>
                                    form.setData('place_ids', placeIds)
                                }
                                disabled={form.processing}
                            />
                            <p className="text-[11px] text-[#6b8ead]">
                                {form.data.place_ids.length}{' '}
                                {form.data.place_ids.length === 1
                                    ? 'lugar seleccionado'
                                    : 'lugares seleccionados'}
                            </p>
                            <InputError
                                message={
                                    form.errors.place_ids ??
                                    form.errors['place_ids.0']
                                }
                            />
                        </div>
                    ) : null}
                    {filteredRoles.length === 0 ? (
                        <p className="py-6 text-center text-xs text-[#6b8ead]">
                            No se encontraron roles.
                        </p>
                    ) : (
                        filteredRoles.map((role) => {
                            const checked = form.data.roles.includes(role.name);
                            const isSuperAdmin =
                                role.name.toLowerCase() === 'superadmin';

                            return (
                                <label
                                    key={role.id}
                                    className={cn(
                                        'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[#1a2b4c] transition-colors hover:bg-[#f8fafc]',
                                        checked &&
                                            'bg-[#e8f1fa]/70 ring-1 ring-[#c5d5e6]',
                                    )}
                                >
                                    <Checkbox
                                        checked={checked}
                                        onCheckedChange={(value) =>
                                            toggleRole(role.name, value === true)
                                        }
                                        className={checkClassName}
                                    />
                                    <span className="font-medium">
                                        {role.name}
                                    </span>
                                    {isSuperAdmin ? (
                                        <span className="rounded bg-[#eef1f5] px-1.5 py-0.5 text-[10px] text-[#64748b]">
                                            Sistema
                                        </span>
                                    ) : null}
                                </label>
                            );
                        })
                    )}

                    {form.errors.roles ? (
                        <p className="text-xs text-red-600">{form.errors.roles}</p>
                    ) : null}
                </div>
            </form>
        </AppModal>
    );
}
