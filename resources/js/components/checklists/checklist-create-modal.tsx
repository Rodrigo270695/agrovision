import { router } from '@inertiajs/react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { ChecklistFormData } from '@/components/checklists/checklist-edit-form';
import type { OfflineCatalogTemplate } from '@/lib/offline/db';
import { isBrowserOnline } from '@/lib/offline/ids';
import { cn } from '@/lib/utils';

export type ChecklistTemplateOption = {
    id: number;
    type: string;
    code: string;
    name: string;
};

export type ActiveUnitOption = {
    id: number;
    period_id: number;
    correlative: string;
    plate_number?: string | null;
    driver_name?: string | null;
    provider?: string | null;
    category?: string | null;
    period?: {
        id: number;
        name: string;
        status?: string;
    } | null;
};

type PlateRow = {
    unit_id: number;
    plate: string;
    driver: string | null;
    vehicle_type: string | null;
    template_type: 'tdp' | 'tdc' | string;
    status: 'new' | 'exists';
};

type CoordinatorGroup = {
    id: number;
    name: string;
    plates: PlateRow[];
};

type DayPreview = {
    date: string;
    coordinators: CoordinatorGroup[];
    dates?: string[];
};

type Props = {
    open: boolean;
    templates: ChecklistTemplateOption[];
    activeUnits: ActiveUnitOption[];
    catalog?: OfflineCatalogTemplate[];
    onClose: () => void;
    onCreatedOffline?: (draft: ChecklistFormData) => void;
};

function todayInput(): string {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

    return local.toISOString().slice(0, 10);
}

export function ChecklistCreateModal({
    open,
    onClose,
}: Props) {
    const [date, setDate] = useState(todayInput);
    const [preview, setPreview] = useState<DayPreview | null>(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [coordinatorId, setCoordinatorId] = useState('');
    const [selected, setSelected] = useState<number[]>([]);

    useEffect(() => {
        if (!open) {
            return;
        }

        setDate(todayInput());
        setCoordinatorId('');
        setSelected([]);
        setPreview(null);
    }, [open]);

    useEffect(() => {
        if (!open || date === '') {
            return;
        }

        const controller = new AbortController();
        setLoading(true);
        setError(null);

        void fetch(`/inspecciones/dia?date=${date}`, {
            credentials: 'same-origin',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then(async (response) => {
                const payload = (await response.json().catch(() => null)) as
                    | DayPreview
                    | { message?: string }
                    | null;

                if (!response.ok || !payload || !('coordinators' in payload)) {
                    throw new Error(
                        (payload as { message?: string } | null)?.message ||
                            'No se pudo cargar ese día.',
                    );
                }

                setPreview(payload);
                const first = payload.coordinators[0];
                setCoordinatorId(first ? String(first.id) : '');
                setSelected(
                    first
                        ? first.plates
                              .filter((plate) => plate.status !== 'exists')
                              .map((plate) => plate.unit_id)
                        : [],
                );
            })
            .catch((reason: unknown) => {
                if (reason instanceof DOMException && reason.name === 'AbortError') {
                    return;
                }

                setPreview(null);
                setError(
                    reason instanceof Error
                        ? reason.message
                        : 'No se pudo cargar ese día.',
                );
            })
            .finally(() => setLoading(false));

        return () => controller.abort();
    }, [open, date]);

    const coordinator = useMemo(
        () =>
            preview?.coordinators.find(
                (item) => String(item.id) === coordinatorId,
            ) ?? null,
        [preview, coordinatorId],
    );

    const chooseCoordinator = (value: string) => {
        setCoordinatorId(value);
        const next = preview?.coordinators.find(
            (item) => String(item.id) === value,
        );
        setSelected(
            next
                ? next.plates
                      .filter((plate) => plate.status !== 'exists')
                      .map((plate) => plate.unit_id)
                : [],
        );
    };

    const togglePlate = (unitId: number) => {
        setSelected((current) =>
            current.includes(unitId)
                ? current.filter((id) => id !== unitId)
                : [...current, unitId],
        );
    };

    const handleClose = () => {
        if (sending) {
            return;
        }

        onClose();
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!isBrowserOnline()) {
            toast.error('Armar el paquete del día necesita conexión.');

            return;
        }

        if (!coordinator || selected.length === 0 || sending) {
            return;
        }

        setSending(true);
        router.post(
            '/inspecciones/dia',
            {
                date,
                coordinator_id: coordinator.id,
                unit_ids: selected,
            },
            {
                preserveScroll: true,
                onFinish: () => setSending(false),
                onSuccess: () => onClose(),
            },
        );
    };

    return (
        <AppModal
            open={open}
            onClose={handleClose}
            title="Paquete del día"
            description="La fecha agrupa las inspecciones. Eliges el coordinador y, de sus unidades de ese día, las placas."
            className="sm:max-w-xl"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={sending}
                        className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c] hover:bg-white"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="checklist-create-form"
                        disabled={selected.length === 0 || sending || loading}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {sending ? <Spinner /> : null}
                        Crear {selected.length || ''} inspecciones
                    </Button>
                </>
            }
        >
            <form
                id="checklist-create-form"
                onSubmit={handleSubmit}
                className="space-y-3"
            >
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">
                            Fecha <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            type="date"
                            value={date}
                            onChange={(event) => setDate(event.target.value)}
                            className="h-10 border-[#c5d5e6]"
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">
                            Coordinador <span className="text-red-500">*</span>
                        </Label>
                        <select
                            value={coordinatorId}
                            onChange={(event) =>
                                chooseCoordinator(event.target.value)
                            }
                            disabled={loading || (preview?.coordinators.length ?? 0) === 0}
                            className="h-10 w-full cursor-pointer rounded-md border border-[#c5d5e6] bg-white px-3 text-sm text-[#1a2b4c] outline-none focus:border-[#2e5a9e]"
                        >
                            {preview?.coordinators.length ? (
                                preview.coordinators.map((item) => (
                                    <option key={item.id} value={String(item.id)}>
                                        {item.name} ({item.plates.length})
                                    </option>
                                ))
                            ) : (
                                <option value="">Sin coordinadores</option>
                            )}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <p className="text-xs text-[#5a7390]">Cargando unidades del día…</p>
                ) : null}
                {error ? <p className="text-xs text-red-600">{error}</p> : null}

                {coordinator && !loading && coordinator.plates.length === 0 ? (
                    <div className="rounded-lg bg-[#f8fafc] px-3 py-2 text-xs text-[#5a7390]">
                        <p>
                            {coordinator.name} no tiene unidades el {date.split('-').reverse().join('/')}.
                        </p>
                        {(preview?.dates ?? []).filter((item) => item !== date).length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {(preview?.dates ?? [])
                                    .filter((item) => item !== date)
                                    .map((item) => (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => setDate(item)}
                                            className="cursor-pointer rounded-full bg-[#e8f1fa] px-2 py-0.5 font-medium text-[#1a2b4c]"
                                        >
                                            {item.split('-').reverse().join('/')}
                                        </button>
                                    ))}
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {coordinator ? (
                    <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                        {coordinator.plates.map((plate) => {
                            const checked = selected.includes(plate.unit_id);
                            const locked = plate.status === 'exists';

                            return (
                                <label
                                    key={plate.unit_id}
                                    className={cn(
                                        'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2',
                                        locked
                                            ? 'border-[#e2eaf3] bg-[#f8fafc] text-[#6b8ead]'
                                            : 'border-[#d7e3f0] bg-white text-[#1a2b4c]',
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        checked={locked || checked}
                                        disabled={locked}
                                        onChange={() => togglePlate(plate.unit_id)}
                                        className="size-4 accent-[#1a2b4c]"
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold">
                                            {plate.plate}
                                        </span>
                                        <span className="block truncate text-[11px] text-[#5a7390]">
                                            {plate.driver || 'Sin conductor'}
                                            {plate.vehicle_type
                                                ? ` · ${plate.vehicle_type}`
                                                : ''}
                                        </span>
                                    </span>
                                    <span
                                        className={cn(
                                            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                            plate.template_type === 'tdc'
                                                ? 'bg-amber-50 text-amber-800'
                                                : 'bg-[#e8f1fa] text-[#1a2b4c]',
                                        )}
                                    >
                                        {plate.template_type.toUpperCase()}
                                    </span>
                                    {locked ? (
                                        <span className="shrink-0 text-[10px] font-medium text-emerald-700">
                                            En el paquete
                                        </span>
                                    ) : null}
                                </label>
                            );
                        })}
                    </div>
                ) : null}

                <p className="text-[11px] text-[#5a7390]">
                    Camioneta abre TDC. El resto abre TDP. El coordinador firma
                    después, cuando envíes el paquete.
                </p>
            </form>
        </AppModal>
    );
}
