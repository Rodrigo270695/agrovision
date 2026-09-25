import { format, isSameDay, isSameMonth, isSameYear } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import { CalendarIcon, Check, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    rangeLastMonth,
    rangeLastWeek,
    rangeThisMonth,
    rangeThisWeek,
    rangeThisYear,
    rangeToday,
    rangeYesterday,
} from '@/lib/date-range-presets';
import { cn } from '@/lib/utils';

type Props = {
    desde: string | null;
    hasta: string | null;
    disabled?: boolean;
    onApply: (desde: string, hasta: string) => void;
    onClear: () => void;
    triggerClassName?: string;
};

type PresetId =
    | 'today'
    | 'yesterday'
    | 'this_week'
    | 'last_week'
    | 'this_month'
    | 'last_month'
    | 'this_year';

type PresetOption = {
    id: PresetId;
    label: string;
    desde: string;
    hasta: string;
    from: Date;
    to: Date;
};

function parseDay(iso: string): Date | undefined {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        return undefined;
    }

    const [y, m, d] = iso.split('-').map(Number);

    if (!y || !m || !d) {
        return undefined;
    }

    const dt = new Date(y, m - 1, d);

    return Number.isNaN(dt.getTime()) ? undefined : dt;
}

function toIsoDate(d: Date): string {
    return format(d, 'yyyy-MM-dd');
}

function formatPresetSpan(from: Date, to: Date): string {
    return `${format(from, 'dd/MM/yyyy', { locale: esLocale })} — ${format(to, 'dd/MM/yyyy', { locale: esLocale })}`;
}

function formatTriggerLabel(from: Date, to: Date): string {
    if (isSameDay(from, to)) {
        return format(from, 'dd/MM/yyyy', { locale: esLocale });
    }

    if (isSameMonth(from, to) && isSameYear(from, to)) {
        const raw = format(from, 'MMM yyyy', { locale: esLocale });

        return raw.charAt(0).toUpperCase() + raw.slice(1);
    }

    return formatPresetSpan(from, to);
}

export function DateRangeFilter({
    desde,
    hasta,
    disabled,
    onApply,
    onClear,
    triggerClassName,
}: Props) {
    const [open, setOpen] = useState(false);
    const [customOpen, setCustomOpen] = useState(false);
    const [customDesde, setCustomDesde] = useState('');
    const [customHasta, setCustomHasta] = useState('');

    const presets = useMemo((): PresetOption[] => {
        const build = (
            id: PresetId,
            label: string,
            range: { from: Date; to: Date },
        ): PresetOption => ({
            id,
            label,
            from: range.from,
            to: range.to,
            desde: toIsoDate(range.from),
            hasta: toIsoDate(range.to),
        });

        return [
            build('today', 'Hoy', rangeToday()),
            build('yesterday', 'Ayer', rangeYesterday()),
            build('this_week', 'Esta semana', rangeThisWeek()),
            build('last_week', 'Semana pasada', rangeLastWeek()),
            build('this_month', 'Este mes', rangeThisMonth()),
            build('last_month', 'Mes pasado', rangeLastMonth()),
            build('this_year', 'Este año', rangeThisYear()),
        ];
    }, []);

    const committedFrom = desde ? parseDay(desde) : undefined;
    const committedTo = hasta ? parseDay(hasta) : undefined;
    const hasRange = Boolean(committedFrom && committedTo);

    const activePresetId = presets.find(
        (preset) => preset.desde === desde && preset.hasta === hasta,
    )?.id;

    const triggerLabel =
        committedFrom && committedTo
            ? formatTriggerLabel(committedFrom, committedTo)
            : 'Todas las fechas';

    const applyRange = (fromIso: string, toIso: string) => {
        onApply(fromIso, toIso);
        setOpen(false);
    };

    const handleClear = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        onClear();
        setOpen(false);
    };

    const handleOpenChange = (next: boolean) => {
        if (next) {
            const today = toIsoDate(new Date());
            setCustomDesde(desde ?? today);
            setCustomHasta(hasta ?? today);
            setCustomOpen(!activePresetId && hasRange);
        }

        setOpen(next);
    };

    const applyCustom = () => {
        const from = parseDay(customDesde);
        const to = parseDay(customHasta);

        if (!from || !to) {
            return;
        }

        applyRange(
            toIsoDate(from <= to ? from : to),
            toIsoDate(from <= to ? to : from),
        );
    };

    const canApplyCustom =
        /^\d{4}-\d{2}-\d{2}$/.test(customDesde) &&
        /^\d{4}-\d{2}-\d{2}$/.test(customHasta);

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        'h-10 min-w-40 cursor-pointer justify-start gap-2 rounded-lg border-[#1a2b4c] bg-[#1a2b4c] px-3 font-medium text-white shadow-sm hover:bg-[#122038] hover:text-white',
                        triggerClassName,
                    )}
                    aria-label="Filtrar por rango de fechas"
                >
                    <CalendarIcon className="size-4 shrink-0 text-white" />
                    <span className="min-w-0 flex-1 truncate text-left text-sm">
                        {triggerLabel}
                    </span>
                    {hasRange ? (
                        <span
                            role="button"
                            tabIndex={0}
                            className="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm text-white/80 hover:bg-white/15 hover:text-white"
                            aria-label="Quitar filtro de fecha"
                            onClick={handleClear}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    handleClear(event as unknown as MouseEvent);
                                }
                            }}
                        >
                            <X className="size-3.5" />
                        </span>
                    ) : null}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[min(100vw-2rem,14.5rem)] overflow-hidden rounded-xl border-[#d7e3f0] p-0 shadow-lg"
                align="start"
                sideOffset={6}
            >
                <div className="flex flex-col p-1">
                    {presets.map((preset) => {
                        const isActive = activePresetId === preset.id;

                        return (
                            <button
                                key={preset.id}
                                type="button"
                                disabled={disabled}
                                onClick={() =>
                                    applyRange(preset.desde, preset.hasta)
                                }
                                className={cn(
                                    'flex w-full cursor-pointer flex-col gap-0.5 rounded-lg px-2.5 py-1.5 text-left',
                                    isActive
                                        ? 'border border-[#b8cce0] bg-[#e8f1fa] text-[#1a2b4c]'
                                        : 'border border-transparent hover:bg-[#f8fafc]',
                                )}
                            >
                                <span
                                    className={cn(
                                        'min-w-0 text-sm',
                                        isActive ? 'font-semibold' : 'font-medium',
                                    )}
                                >
                                    {preset.label}
                                </span>
                                <span className="text-[0.65rem] leading-tight text-[#6b8ead] tabular-nums">
                                    {formatPresetSpan(preset.from, preset.to)}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="border-t border-[#e2eaf3]">
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setCustomOpen((value) => !value)}
                        className={cn(
                            'flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left',
                            customOpen || (!activePresetId && hasRange)
                                ? 'bg-[#e8f1fa]/80'
                                : 'hover:bg-[#f8fafc]',
                        )}
                    >
                        <span className="text-sm font-semibold text-[#1a2b4c]">
                            Personalizado
                        </span>
                        {customOpen || (!activePresetId && hasRange) ? (
                            <Check className="size-3.5 text-[#2e5a9e]" />
                        ) : null}
                    </button>
                    {customOpen ? (
                        <div className="space-y-3 border-t border-[#e2eaf3] bg-[#f8fafc] px-3 py-3">
                            <div className="grid grid-cols-2 gap-2.5">
                                <label className="flex flex-col gap-1">
                                    <span className="text-[0.65rem] font-semibold tracking-wide text-[#6b8ead] uppercase">
                                        Desde
                                    </span>
                                    <Input
                                        type="date"
                                        value={customDesde}
                                        disabled={disabled}
                                        onChange={(event) =>
                                            setCustomDesde(event.target.value)
                                        }
                                        className="h-9 bg-white text-sm"
                                    />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-[0.65rem] font-semibold tracking-wide text-[#6b8ead] uppercase">
                                        Hasta
                                    </span>
                                    <Input
                                        type="date"
                                        value={customHasta}
                                        disabled={disabled}
                                        onChange={(event) =>
                                            setCustomHasta(event.target.value)
                                        }
                                        className="h-9 bg-white text-sm"
                                    />
                                </label>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                disabled={disabled || !canApplyCustom}
                                className="h-9 w-full cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                                onClick={applyCustom}
                            >
                                Aplicar
                            </Button>
                        </div>
                    ) : null}
                </div>
            </PopoverContent>
        </Popover>
    );
}
