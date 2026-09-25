import {
    Building2,
    Bus,
    Download,
    FileSpreadsheet,
    Plus,
    TriangleAlert,
} from 'lucide-react';
import { PageHeader } from '@/components/data-page';
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
        <PageHeader
            title="Unidades"
            description="Gestión de unidades de transporte y servicio."
            stats={[
                {
                    label: 'Unidades',
                    value: stats.units,
                    variant: 'info',
                    icon: Bus,
                },
                {
                    label: 'Proveedores',
                    value: stats.providers,
                    variant: 'primary',
                    icon: Building2,
                },
                {
                    label: 'Sin placa',
                    value: stats.without_plate,
                    variant: 'warning',
                    icon: TriangleAlert,
                },
                {
                    label: 'En pantalla',
                    value: stats.on_screen,
                    variant: 'success',
                    icon: Bus,
                },
            ]}
            action={
                <div className="flex flex-wrap items-center gap-2">
                    {can('units.view') ? (
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                            className="cursor-pointer gap-2 border-[#c5d5e6] text-[#1a2b4c] hover:bg-[#e8f1fa]"
                        >
                            <a href={exportUrl}>
                                <Download className="size-4" />
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
                                onClick={onImport}
                                className="cursor-pointer gap-2 border-[#c5d5e6] text-[#1a2b4c] hover:bg-[#e8f1fa]"
                            >
                                <FileSpreadsheet className="size-4" />
                                <span className="hidden sm:inline">
                                    Importar Excel
                                </span>
                                <span className="sm:hidden">Importar</span>
                            </Button>
                            <Button
                                type="button"
                                onClick={onCreate}
                                className="cursor-pointer gap-2 bg-[#1a2b4c] text-white hover:bg-[#122038]"
                            >
                                <Plus className="size-4" strokeWidth={2.5} />
                                <span className="hidden sm:inline">
                                    Nueva unidad
                                </span>
                                <span className="sm:hidden">Nueva</span>
                            </Button>
                        </>
                    ) : null}
                </div>
            }
        />
    );
}
