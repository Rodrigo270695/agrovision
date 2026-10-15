import { CheckCircle2, Layers, PauseCircle } from 'lucide-react';
import {
    FilterChips,
    type FilterChip,
} from '@/components/data-page/filter-chips';
import { cn } from '@/lib/utils';

export type PeriodFilterOption = {
    id: number;
    name: string;
    status?: string;
    date?: string;
};

type Props = {
    value?: number | null;
    options: PeriodFilterOption[];
    onChange: (periodId: number | null) => void;
    className?: string;
};

function formatDate(value?: string | null): string {
    if (!value) {
        return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date
        .toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
        .replace('.', '');
}

export function PeriodFilterSelect({
    value,
    options,
    onChange,
    className,
}: Props) {
    const filterOptions: FilterChip<string>[] = [
        {
            value: 'all',
            label: 'Todos los periodos',
            description: 'Ver unidades sin filtrar',
            icon: <Layers className="size-3.5" />,
            tone: 'default',
        },
        ...options.map((option) => {
            const active = option.status === 'active';

            return {
                value: String(option.id),
                label: option.name,
                description: `${active ? 'Activo' : 'Inactivo'}${
                    option.date ? ` · ${formatDate(option.date)}` : ''
                }`,
                icon: active ? (
                    <CheckCircle2 className="size-3.5" />
                ) : (
                    <PauseCircle className="size-3.5" />
                ),
                tone: active ? ('success' as const) : ('muted' as const),
            };
        }),
    ];

    return (
        <FilterChips
            ariaLabel="Filtrar por periodo"
            value={value ? String(value) : 'all'}
            onChange={(next) => onChange(next === 'all' ? null : Number(next))}
            options={filterOptions}
            triggerClassName={cn('h-10', className)}
            className="sm:w-[240px]"
        />
    );
}
