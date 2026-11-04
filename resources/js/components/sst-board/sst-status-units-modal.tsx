import { Download } from 'lucide-react';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type SstStatusKey = 'pendiente' | 'baja' | 'ok' | 'falta';

export type SstStatusUnit = {
    id: number;
    correlative?: string | null;
    plate_number?: string | null;
    driver_name?: string | null;
    driver_dni?: string | null;
    provider?: string | null;
    vehicle_type?: string | null;
    sede?: string | null;
    garita?: string | null;
    unit_status?: string | null;
    item_status: string;
    coordinator?: string | null;
    period_name?: string | null;
    activity_date?: string | null;
};

const STATUS_META: Record<
    SstStatusKey,
    { label: string; accent: string; chip: string }
> = {
    pendiente: {
        label: 'Pendiente',
        accent: 'text-amber-800',
        chip: 'bg-amber-100 text-amber-900',
    },
    baja: {
        label: 'Baja',
        accent: 'text-slate-700',
        chip: 'bg-slate-200 text-slate-800',
    },
    ok: {
        label: 'OK',
        accent: 'text-emerald-800',
        chip: 'bg-emerald-100 text-emerald-900',
    },
    falta: {
        label: 'Falta',
        accent: 'text-red-800',
        chip: 'bg-red-100 text-red-900',
    },
};

type Props = {
    open: boolean;
    status: SstStatusKey | null;
    itemLabel: string;
    units: SstStatusUnit[];
    excelHref: string | null;
    onClose: () => void;
};

function formatDate(value?: string | null): string {
    if (!value) {
        return '—';
    }

    const date = new Date(`${value}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export function SstStatusUnitsModal({
    open,
    status,
    itemLabel,
    units,
    excelHref,
    onClose,
}: Props) {
    const meta = status ? STATUS_META[status] : null;

    return (
        <AppModal
            open={open && status !== null}
            onClose={onClose}
            title={meta ? `Unidades · ${meta.label}` : 'Unidades'}
            description={`${itemLabel} — listado transparente de las ${units.length} unidad${units.length === 1 ? '' : 'es'} con este resultado en el rango.`}
            className="border-white/40 bg-white/85 shadow-xl backdrop-blur-xl sm:max-w-3xl"
            bodyClassName="bg-transparent"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="cursor-pointer border-brand-300/80 bg-white/70 text-brand-700 backdrop-blur"
                    >
                        Cerrar
                    </Button>
                    {excelHref ? (
                        <Button
                            type="button"
                            asChild
                            className="cursor-pointer bg-brand-700 text-white hover:bg-brand-800"
                        >
                            <a href={excelHref}>
                                <Download className="size-4" />
                                Descargar Excel
                            </a>
                        </Button>
                    ) : null}
                </>
            }
        >
            {meta ? (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className={cn(
                                'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
                                meta.chip,
                            )}
                        >
                            {meta.label}
                        </span>
                        <span className={cn('text-sm font-semibold tabular-nums', meta.accent)}>
                            {units.length} unidad{units.length === 1 ? '' : 'es'}
                        </span>
                    </div>

                    {units.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-brand-200/80 bg-white/50 px-4 py-10 text-center text-sm text-muted-foreground backdrop-blur-sm">
                            No hay unidades en este estado para el rango
                            seleccionado.
                        </p>
                    ) : (
                        <div className="max-h-[min(50vh,22rem)] overflow-auto rounded-xl border border-brand-200/70 bg-white/55 backdrop-blur-sm">
                            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                                <thead className="sticky top-0 z-10 bg-white/90 backdrop-blur-md">
                                    <tr className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        <th className="border-b border-brand-200/70 px-3 py-2">
                                            Placa
                                        </th>
                                        <th className="border-b border-brand-200/70 px-3 py-2">
                                            Conductor
                                        </th>
                                        <th className="border-b border-brand-200/70 px-3 py-2">
                                            Proveedor
                                        </th>
                                        <th className="border-b border-brand-200/70 px-3 py-2">
                                            Unidad
                                        </th>
                                        <th className="border-b border-brand-200/70 px-3 py-2">
                                            Actividad
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {units.map((unit) => (
                                        <tr
                                            key={`${unit.id}-${unit.plate_number}`}
                                            className="border-b border-brand-100/80 last:border-0 hover:bg-white/70"
                                        >
                                            <td className="px-3 py-2.5 align-top">
                                                <p className="font-semibold text-brand-800">
                                                    {unit.plate_number || 'Sin placa'}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {unit.correlative || '—'}
                                                </p>
                                            </td>
                                            <td className="px-3 py-2.5 align-top">
                                                <p className="text-brand-800">
                                                    {unit.driver_name || '—'}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {unit.driver_dni
                                                        ? `DNI ${unit.driver_dni}`
                                                        : 'Sin DNI'}
                                                </p>
                                            </td>
                                            <td className="px-3 py-2.5 align-top text-xs text-brand-800">
                                                <p className="line-clamp-2">
                                                    {unit.provider || '—'}
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                    {[unit.vehicle_type, unit.sede]
                                                        .filter(Boolean)
                                                        .join(' · ') || '—'}
                                                </p>
                                            </td>
                                            <td className="px-3 py-2.5 align-top">
                                                <span
                                                    className={cn(
                                                        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                                                        unit.unit_status === 'Activo'
                                                            ? 'bg-emerald-50 text-emerald-800'
                                                            : 'bg-slate-100 text-slate-700',
                                                    )}
                                                >
                                                    {unit.unit_status || '—'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 align-top text-xs text-muted-foreground">
                                                {formatDate(unit.activity_date)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : null}
        </AppModal>
    );
}
