import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { cn } from '@/lib/utils';

type Stats = {
    total: number;
    positive: number;
    pending: number;
    acknowledged: number;
};

type Props = {
    stats: Stats;
    onCreate: () => void;
};

export function AlcoholTestsHeader({ stats, onCreate }: Props) {
    const { can } = useCan();

    return (
        <div className="rounded-2xl border border-[#d7e3f0] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                    <div>
                        <h1 className="font-display inline-block border-b-2 border-[#4a90e2] pb-1 text-2xl font-semibold text-[#1a2b4c]">
                            Alcohómetro
                        </h1>
                        <p className="mt-2 text-sm text-[#5a7390]">
                            Control de ingreso con tolerancia 0. Positivos
                            alertan al coordinador de la unidad y no se borran.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#eef4fb] px-2.5 py-1 text-xs font-medium text-[#1a2b4c]">
                            Total {stats.total}
                        </span>
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800">
                            Positivos {stats.positive}
                        </span>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                            Pendientes {stats.pending}
                        </span>
                        <span
                            className={cn(
                                'rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800',
                            )}
                        >
                            Firmados {stats.acknowledged}
                        </span>
                    </div>
                </div>

                {can('alcoholtests.create') ? (
                    <Button
                        type="button"
                        onClick={onCreate}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                    >
                        <Plus className="size-4" />
                        Nuevo test
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
