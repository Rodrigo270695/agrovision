import { CircleCheck, ClipboardList, FileText, Package, Plus } from 'lucide-react';
import {
    type ChecklistsStatsData,
} from '@/components/checklists/checklists-stats';
import { PageHeader } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';

type Props = {
    stats: ChecklistsStatsData;
    onCreate: () => void;
    onSendBatch?: () => void;
};

export function ChecklistsHeader({ stats, onCreate, onSendBatch }: Props) {
    const { can } = useCan();

    return (
        <PageHeader
            title="Inspecciones"
            description="Crea las inspecciones con las unidades del periodo activo. La fecha es el día de la inspección."
            stats={[
                {
                    label: 'Total',
                    value: stats.total,
                    variant: 'info',
                    icon: ClipboardList,
                },
                {
                    label: 'Borradores',
                    value: stats.draft,
                    variant: 'warning',
                    icon: FileText,
                },
                {
                    label: 'Completados',
                    value: stats.completed,
                    variant: 'success',
                    icon: CircleCheck,
                },
                {
                    label: 'En pantalla',
                    value: stats.on_screen,
                    variant: 'primary',
                    icon: ClipboardList,
                },
            ]}
            action={
                <div className="flex flex-wrap items-center gap-2">
                    {can('checklists.update') && onSendBatch ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onSendBatch}
                            className="cursor-pointer gap-2 border-[#1a2b4c] text-[#1a2b4c] hover:bg-[#e8f1fa]"
                        >
                            <Package className="size-4" />
                            <span className="hidden sm:inline">
                                Enviar paquete
                            </span>
                            <span className="sm:hidden">Paquete</span>
                        </Button>
                    ) : null}
                    {can('checklists.create') ? (
                        <Button
                            type="button"
                            onClick={onCreate}
                            className="cursor-pointer gap-2 bg-[#1a2b4c] text-white hover:bg-[#122038]"
                        >
                            <Plus className="size-4" strokeWidth={2.5} />
                            <span className="hidden sm:inline">
                                Nueva inspección
                            </span>
                            <span className="sm:hidden">Nueva</span>
                        </Button>
                    ) : null}
                </div>
            }
        />
    );
}
