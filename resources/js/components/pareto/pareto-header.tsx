import { Plus, Scale } from 'lucide-react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { cn } from '@/lib/utils';
import type { ParetoStats } from '@/components/pareto/pareto-table';

type Props = {
    stats: ParetoStats;
    templateType: string;
    onCreate: () => void;
};

export function ParetoHeader({ stats, templateType, onCreate }: Props) {
    const { can } = useCan();

    const redistribute = () => {
        if (!can('pareto.update') || templateType === 'all') {
            return;
        }

        router.post(
            '/pareto/redistribuir',
            { template_type: templateType },
            { preserveScroll: true },
        );
    };

    return (
        <div className="rounded-2xl border border-[#d7e3f0] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                    <div>
                        <h1 className="font-display inline-block border-b-2 border-[#4a90e2] pb-1 text-2xl font-semibold text-[#1a2b4c]">
                            Pareto
                        </h1>
                        <p className="mt-2 text-sm text-[#5a7390]">
                            Exigencias de inspección con peso. La suma de pesos
                            activos debe ser 100%.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="inline-flex rounded-full bg-[#eef4fb] px-2.5 py-1 text-xs font-medium text-[#1a2b4c]">
                            Ítems {stats.total}
                        </span>
                        <span
                            className={cn(
                                'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                                stats.weight_ok
                                    ? 'bg-emerald-50 text-emerald-800'
                                    : 'bg-amber-50 text-amber-800',
                            )}
                        >
                            Peso total {stats.weight_total}%
                            {stats.weight_ok ? ' ✓' : ' (debe ser 100%)'}
                        </span>
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            Observación {stats.observation}
                        </span>
                        <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800">
                            Vencimiento {stats.expiry}
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {can('pareto.update') && templateType !== 'all' ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={redistribute}
                            className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                            title="Divide 100% en partes iguales"
                        >
                            <Scale className="size-4" />
                            Redistribuir pesos
                        </Button>
                    ) : null}
                    {can('pareto.create') ? (
                        <Button
                            type="button"
                            onClick={onCreate}
                            className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                        >
                            <Plus className="size-4" />
                            Nuevo ítem
                        </Button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
