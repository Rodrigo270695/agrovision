import { Plus } from 'lucide-react';
import {
    InductionsStats,
    type InductionStatsData,
} from '@/components/inductions/inductions-stats';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';

type Props = {
    stats: InductionStatsData;
    onCreate: () => void;
};

export function InductionsHeader({ stats, onCreate }: Props) {
    const { can } = useCan();

    return (
        <div className="rounded-2xl border border-[#d7e3f0] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                    <div>
                        <h1 className="font-display inline-block border-b-2 border-[#4a90e2] pb-1 text-2xl font-semibold text-[#1a2b4c]">
                            Configuración de inducción
                        </h1>
                        <p className="mt-2 text-sm text-[#5a7390]">
                            Programa charlas/inducciones, jala conductores desde
                            unidades y controla la asistencia.
                        </p>
                    </div>
                    <InductionsStats stats={stats} />
                </div>

                {can('inductions.create') ? (
                    <Button
                        type="button"
                        onClick={onCreate}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                    >
                        <Plus className="size-4" />
                        Nueva inducción
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
