import { cn } from '@/lib/utils';

export type ReportView = 'week' | 'month' | 'year';

type Option = {
    value: string;
    label: string;
};

type Props = {
    view: ReportView;
    value: string;
    options: Option[];
    onChange: (next: { view: ReportView; week: string }) => void;
    selectClassName?: string;
    compact?: boolean;
};

const VIEWS: { id: ReportView; label: string }[] = [
    { id: 'week', label: 'Semanal' },
    { id: 'month', label: 'Mensual' },
    { id: 'year', label: 'Anual' },
];

function caption(view: ReportView): string {
    if (view === 'month') {
        return 'Mes';
    }

    if (view === 'year') {
        return 'Año';
    }

    return 'Semana';
}

export function ReportPeriodFilter({
    view,
    value,
    options,
    onChange,
    selectClassName,
    compact = false,
}: Props) {
    const periodButtons = (
        <div className={cn(compact ? 'flex gap-1' : 'mt-1 grid grid-cols-3 gap-1')}>
            {VIEWS.map((item) => (
                <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                        if (item.id !== view) {
                            onChange({ view: item.id, week: '' });
                        }
                    }}
                    className={cn(
                        'cursor-pointer rounded-lg text-[11px] font-semibold',
                        compact ? 'h-10 px-3' : 'px-1 py-1.5',
                        view === item.id
                            ? 'bg-[#1a2b4c] text-white'
                            : 'border border-[#c5d5e6] text-[#1a2b4c]',
                    )}
                >
                    {item.label}
                </button>
            ))}
        </div>
    );

    const periodSelect = (
        <label className="block min-w-0 text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase">
            {caption(view)}
            <select
                value={value}
                onChange={(event) =>
                    onChange({ view, week: event.target.value })
                }
                className={cn(
                    'mt-1 h-10 w-full cursor-pointer rounded-lg border border-[#c5d5e6] bg-white px-2 text-xs font-medium text-[#1a2b4c] normal-case',
                    selectClassName,
                )}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );

    if (compact) {
        return (
            <div className="flex flex-wrap items-end gap-3">
                <div>
                    <p className="text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase">
                        Periodo
                    </p>
                    <div className="mt-1">{periodButtons}</div>
                </div>
                <div className="w-full sm:w-56">{periodSelect}</div>
            </div>
        );
    }

    return (
        <div className="mt-4">
            <p className="text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase">
                Periodo
            </p>
            {periodButtons}
            <div className="mt-2">{periodSelect}</div>
        </div>
    );
}
