import {
    CalendarRange,
    CheckCircle2,
    Layers,
    PauseCircle,
} from 'lucide-react';
import {
    ElegantFilterSelect,
    type ElegantFilterOption,
} from '@/components/shared/elegant-filter-select';
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
    const filterOptions: ElegantFilterOption[] = options.map((option) => {
        const active = option.status === 'active';

        return {
            value: String(option.id),
            label: option.name,
            description: `${active ? 'Activo' : 'Inactivo'}${
                option.date ? ` · ${formatDate(option.date)}` : ''
            }`,
            icon: active ? CheckCircle2 : PauseCircle,
            iconClassName: active
                ? 'bg-[#e8f7ef] text-[#15803d]'
                : 'bg-[#eef1f5] text-[#64748b]',
        };
    });

    return (
        <ElegantFilterSelect
            value={value ? String(value) : null}
            options={filterOptions}
            onChange={(next) => {
                onChange(next ? Number(next) : null);
            }}
            triggerIcon={CalendarRange}
            allIcon={Layers}
            allLabel="Todos los periodos"
            allDescription="Ver unidades sin filtrar"
            placeholder="Todos los periodos"
            className={cn('sm:w-[240px]', className)}
            contentClassName="min-w-[240px]"
        />
    );
}
