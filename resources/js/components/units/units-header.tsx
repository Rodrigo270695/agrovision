import { Download, FileSpreadsheet, Plus } from 'lucide-react';
import {
    PlatformHero,
    PlatformToolbar,
} from '@/components/platform';
import type { UnitsFilters } from '@/components/units/units-table';
import type { UnitsStatsData } from '@/components/units/units-stats';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';

type Props = {
    stats: UnitsStatsData;
    filters: UnitsFilters;
    onCreate: () => void;
    onImport: () => void;
};

function buildExportUrl(filters: UnitsFilters): string {
    const params = new URLSearchParams();

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.period_id) {
        params.set('period_id', String(filters.period_id));
    }

    if (filters.all_dates) {
        params.set('all_dates', '1');
    }

    if (filters.date_from) {
        params.set('date_from', filters.date_from);
    }

    if (filters.date_to) {
        params.set('date_to', filters.date_to);
    }

    if (filters.sort) {
        params.set('sort', filters.sort);
    }

    if (filters.direction) {
        params.set('direction', filters.direction);
    }

    const query = params.toString();

    return query ? `/unidades/exportar?${query}` : '/unidades/exportar';
}

export function UnitsHeader({ stats, filters, onCreate, onImport }: Props) {
    const { can } = useCan();
    const exportUrl = buildExportUrl(filters);

    return (
        <div className="flex flex-col gap-3">
            <PlatformHero
                title="Unidades"
                description="Cada placa es una unidad. Si al importar ya no viene, queda inactiva. Historial guarda cada fecha."
                stats={[
                    { label: 'Unidades', value: stats.units, tone: 'navy' },
                    {
                        label: 'Proveedores',
                        value: stats.providers,
                        tone: 'sky',
                    },
                    {
                        label: 'Sin placa',
                        value: stats.without_plate,
                        tone: 'amber',
                    },
                    {
                        label: 'Movimientos',
                        value: stats.movements ?? 0,
                        tone: 'emerald',
                    },
                ]}
            />

            <PlatformToolbar>
                {can('units.view') ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        asChild
                        className="cursor-pointer gap-1.5 rounded-xl border-slate-200 text-[#0f1f3a] hover:bg-slate-50"
                    >
                        <a href={exportUrl}>
                            <Download className="size-3.5" />
                            <span className="hidden sm:inline">
                                Descargar Excel
                            </span>
                            <span className="sm:hidden">Excel</span>
                        </a>
                    </Button>
                ) : null}

                {can('units.create') ? (
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onImport}
                            className="cursor-pointer gap-1.5 rounded-xl border-slate-200 text-[#0f1f3a] hover:bg-slate-50"
                        >
                            <FileSpreadsheet className="size-3.5" />
                            <span className="hidden sm:inline">
                                Importar Excel
                            </span>
                            <span className="sm:hidden">Importar</span>
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={onCreate}
                            className="cursor-pointer gap-1.5 rounded-xl bg-[#1e4d8c] text-white hover:bg-[#163a6b]"
                        >
                            <Plus className="size-3.5" strokeWidth={2.5} />
                            <span className="hidden sm:inline">
                                Nueva unidad
                            </span>
                            <span className="sm:hidden">Nueva</span>
                        </Button>
                    </>
                ) : null}
            </PlatformToolbar>
        </div>
    );
}
