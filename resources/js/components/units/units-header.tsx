import { Download, FileSpreadsheet, Plus } from 'lucide-react';
import { UnitsStats, type UnitsStatsData } from '@/components/units/units-stats';
import type { UnitsFilters } from '@/components/units/units-table';
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
        <div className="rounded-2xl border border-[#d7e3f0] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                    <div>
                        <h1 className="font-display inline-block border-b-2 border-[#4a90e2] pb-1 text-2xl font-semibold text-[#1a2b4c]">
                            Unidades
                        </h1>
                        <p className="mt-2 text-sm text-[#5a7390]">
                            Gestión de unidades de transporte y servicio.
                        </p>
                    </div>
                    <UnitsStats stats={stats} />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {can('units.view') ? (
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                            className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c] hover:bg-[#e8f1fa]"
                        >
                            <a href={exportUrl}>
                                <Download className="size-4" />
                                Descargar Excel
                            </a>
                        </Button>
                    ) : null}

                    {can('units.create') ? (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onImport}
                                className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c] hover:bg-[#e8f1fa]"
                            >
                                <FileSpreadsheet className="size-4" />
                                Importar Excel
                            </Button>
                            <Button
                                type="button"
                                onClick={onCreate}
                                className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                            >
                                <Plus className="size-4" />
                                Nueva unidad
                            </Button>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
