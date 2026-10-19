import { router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { ParetoTemplateOption } from '@/components/pareto/pareto-table';

export type VehicleTypeAssignment = {
    id: number;
    name: string;
    checklist_template_id: number | null;
};

type Props = {
    open: boolean;
    templates: ParetoTemplateOption[];
    vehicleTypes: VehicleTypeAssignment[];
    canEdit: boolean;
    onClose: () => void;
};

export function ParetoVehicleTypesModal({
    open,
    templates,
    vehicleTypes,
    canEdit,
    onClose,
}: Props) {
    const usableTemplates = useMemo(
        () => templates.filter((item) => item.id != null),
        [templates],
    );
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [map, setMap] = useState<Record<number, number | null>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        const next: Record<number, number | null> = {};

        for (const type of vehicleTypes) {
            next[type.id] = type.checklist_template_id;
        }

        setMap(next);
        setSearch('');
        setSelectedId(usableTemplates[0]?.id ?? null);
    }, [open, usableTemplates, vehicleTypes]);

    const selected = usableTemplates.find((item) => item.id === selectedId) ?? null;

    const counts = useMemo(() => {
        const next: Record<number, number> = {};

        for (const template of usableTemplates) {
            next[template.id as number] = 0;
        }

        for (const templateId of Object.values(map)) {
            if (templateId != null && next[templateId] != null) {
                next[templateId] += 1;
            }
        }

        return next;
    }, [map, usableTemplates]);

    const filteredTypes = useMemo(() => {
        const query = search.trim().toLowerCase();
        const available = vehicleTypes.filter((item) => {
            const assignedTo = map[item.id] ?? null;

            return assignedTo == null || assignedTo === selectedId;
        });

        if (query === '') {
            return available;
        }

        return available.filter((item) =>
            item.name.toLowerCase().includes(query),
        );
    }, [map, search, selectedId, vehicleTypes]);

    const toggleType = (vehicleTypeId: number) => {
        if (!canEdit || selectedId == null) {
            return;
        }

        setMap((prev) => {
            const current = prev[vehicleTypeId] ?? null;

            return {
                ...prev,
                [vehicleTypeId]: current === selectedId ? null : selectedId,
            };
        });
    };

    const handleClose = () => {
        if (saving) {
            return;
        }

        onClose();
    };

    const handleSave = () => {
        if (!canEdit || saving) {
            return;
        }

        const grouped: Record<number, number[]> = {};

        for (const template of usableTemplates) {
            grouped[template.id as number] = [];
        }

        for (const [vehicleTypeId, templateId] of Object.entries(map)) {
            if (templateId == null || grouped[templateId] == null) {
                continue;
            }

            grouped[templateId].push(Number(vehicleTypeId));
        }

        setSaving(true);
        router.put(
            '/pareto/tipos-vehiculo',
            {
                assignments: usableTemplates.map((template) => ({
                    template_id: template.id,
                    vehicle_type_ids: grouped[template.id as number] ?? [],
                })),
            },
            {
                preserveScroll: true,
                onFinish: () => setSaving(false),
                onSuccess: () => onClose(),
            },
        );
    };

    return (
        <AppModal
            open={open}
            onClose={handleClose}
            title="Tipos de vehículo por checklist"
            description="Cada tipo de vehículo pertenece a un solo checklist. Al crear una inspección, la placa ya trae su plantilla."
            className="sm:max-w-3xl"
            bodyClassName="p-0 sm:px-0 sm:py-0"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={saving}
                        className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c] hover:bg-white"
                    >
                        Cancelar
                    </Button>
                    {canEdit ? (
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || usableTemplates.length === 0}
                            className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving ? <Spinner /> : null}
                            Guardar asignación
                        </Button>
                    ) : null}
                </>
            }
        >
            {usableTemplates.length === 0 ? (
                <p className="px-4 py-6 text-sm text-[#5a7390] sm:px-5">
                    Primero crea una plantilla de checklist en Pareto.
                </p>
            ) : (
                <div className="grid min-h-[22rem] md:grid-cols-[13.5rem_1fr]">
                    <aside className="border-b border-[#e2eaf3] md:border-r md:border-b-0">
                        <p className="px-4 py-2 text-[11px] font-medium tracking-wide text-[#6b8ead] uppercase">
                            Checklists
                        </p>
                        <div className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:px-2">
                            {usableTemplates.map((template) => {
                                const id = template.id as number;
                                const active = id === selectedId;

                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setSelectedId(id)}
                                        className={cn(
                                            'flex min-w-28 cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors md:min-w-0',
                                            active
                                                ? 'bg-[#1a2b4c] text-white'
                                                : 'text-[#1a2b4c] hover:bg-[#e8f1fa]',
                                        )}
                                    >
                                        <span className="truncate font-medium">
                                            {template.label}
                                        </span>
                                        <span
                                            className={cn(
                                                'rounded-full px-1.5 text-[10px] tabular-nums',
                                                active
                                                    ? 'bg-white/15'
                                                    : 'bg-[#e8f1fa] text-[#2e5a9e]',
                                            )}
                                        >
                                            {counts[id] ?? 0}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>
                    <div className="flex min-w-0 flex-col gap-3 px-4 py-3 sm:px-5">
                        <div>
                            <p className="text-sm font-medium text-[#1a2b4c]">
                                Tipos de vehículo
                                {selected ? ` · ${selected.label}` : ''}
                            </p>
                            <p className="text-[11px] text-[#5a7390]">
                                Solo ves tipos libres o los de este checklist.
                                Los ya asignados a otro no aparecen.
                            </p>
                        </div>
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar tipo..."
                            className="h-9 border-[#c5d5e6]"
                        />
                        {filteredTypes.length === 0 ? (
                            <p className="py-6 text-center text-sm text-[#5a7390]">
                                No hay tipos de vehículo
                                {search ? ' con esa búsqueda' : ''}.
                            </p>
                        ) : (
                            <ul className="grid gap-1 sm:grid-cols-2">
                                {filteredTypes.map((type) => {
                                    const checked =
                                        (map[type.id] ?? null) === selectedId;

                                    return (
                                        <li key={type.id}>
                                            <button
                                                type="button"
                                                disabled={!canEdit || selectedId == null}
                                                onClick={() => toggleType(type.id)}
                                                className={cn(
                                                    'flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm',
                                                    checked
                                                        ? 'border-[#1a2b4c] bg-[#e8f1fa]'
                                                        : 'border-[#e2eaf3] hover:bg-[#f8fafc]',
                                                    canEdit
                                                        ? 'cursor-pointer'
                                                        : 'cursor-default opacity-80',
                                                )}
                                            >
                                                <Checkbox
                                                    checked={checked}
                                                    disabled={!canEdit || selectedId == null}
                                                    className="pointer-events-none"
                                                />
                                                <span className="min-w-0 flex-1 truncate font-medium text-[#1a2b4c]">
                                                    {type.name}
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </AppModal>
    );
}
