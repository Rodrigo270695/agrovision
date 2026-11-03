import { Download, Package, Plus } from 'lucide-react';
import type { ChecklistsStatsData } from '@/components/checklists/checklists-stats';
import {
    PlatformHero,
    PlatformToolbar,
} from '@/components/platform';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';

type Props = {
    stats: ChecklistsStatsData;
    onExport: () => void;
    onCreate: () => void;
    onSendBatch?: () => void;
};

export function ChecklistsHeader({
    stats,
    onExport,
    onCreate,
    onSendBatch,
}: Props) {
    const { can } = useCan();

    return (
        <div className="flex flex-col gap-3">
            <PlatformHero
                title="Inspecciones"
                description="Crea las inspecciones con las unidades del periodo activo. La fecha es el día de la inspección."
                stats={[
                    { label: 'Total', value: stats.total, tone: 'navy' },
                    { label: 'Borradores', value: stats.draft, tone: 'amber' },
                    {
                        label: 'Completados',
                        value: stats.completed,
                        tone: 'emerald',
                    },
                    {
                        label: 'En pantalla',
                        value: stats.on_screen,
                        tone: 'sky',
                    },
                ]}
            />

            <PlatformToolbar>
                {can('checklists.view') ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onExport}
                        className="cursor-pointer gap-1.5 rounded-xl border-slate-200 text-brand-800 hover:bg-slate-50"
                    >
                        <Download className="size-3.5" />
                        <span className="hidden sm:inline">Exportar</span>
                        <span className="sm:hidden">Excel</span>
                    </Button>
                ) : null}
                {can('checklists.update') && onSendBatch ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onSendBatch}
                        className="cursor-pointer gap-1.5 rounded-xl border-slate-200 text-brand-800 hover:bg-slate-50"
                    >
                        <Package className="size-3.5" />
                        <span className="hidden sm:inline">Enviar paquete</span>
                        <span className="sm:hidden">Paquete</span>
                    </Button>
                ) : null}
                {can('checklists.create') ? (
                    <Button
                        type="button"
                        size="sm"
                        onClick={onCreate}
                        className="cursor-pointer gap-1.5 rounded-xl bg-brand-500 text-white hover:bg-brand-600"
                    >
                        <Plus className="size-3.5" strokeWidth={2.5} />
                        <span className="hidden sm:inline">
                            Nueva inspección
                        </span>
                        <span className="sm:hidden">Nueva</span>
                    </Button>
                ) : null}
            </PlatformToolbar>
        </div>
    );
}
