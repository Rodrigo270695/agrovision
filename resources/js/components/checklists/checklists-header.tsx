import { CircleCheck, ClipboardList, FileText, Plus } from 'lucide-react';
import {
    type ChecklistsStatsData,
} from '@/components/checklists/checklists-stats';
import { PageHeader } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';

type Props = {
    stats: ChecklistsStatsData;
    onCreate: () => void;
};

export function ChecklistsHeader({ stats, onCreate }: Props) {
    const { can } = useCan();

    return (
        <PageHeader
            title="Inspecciones"
            description="Checklists TDP/TDC amarrados a la placa de unidades del periodo activo."
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
                can('checklists.create') ? (
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
                ) : null
            }
        />
    );
}
