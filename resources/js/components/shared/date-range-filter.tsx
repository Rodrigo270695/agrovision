import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    isWithinInterval,
    startOfDay,
    startOfMonth,
    startOfWeek,
} from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import { CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    rangeLast7Days,
    rangeLastMonth,
    rangeLastWeek,
    rangeThisMonth,
    rangeThisWeek,
    rangeThisYear,
    rangeToday,
    rangeTomorrow,
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
    align?: 'start' | 'center' | 'end';
};

type PresetId =
    | 'today'
    | 'tomorrow'
    | 'yesterday'
    | 'last_7'
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
};

const WEEKDAYS = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'];

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

function formatDay(d: Date): string {
    return format(d, 'dd/MM/yyyy', { locale: esLocale });
}

function monthTitle(d: Date): string {
    const raw = format(d, 'MMMM yyyy', { locale: esLocale });

    return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function useSheetLayout(): boolean {
    const [sheet, setSheet] = useState(false);

    useEffect(() => {
        const query = window.matchMedia('(max-width: 1023px), (max-height: 760px)');
        const update = () => setSheet(query.matches);
        update();
        query.addEventListener('change', update);

        return () => query.removeEventListener('change', update);
    }, []);

    return sheet;
}

function MonthGrid({
    month,
    from,
    to,
    onPick,
}: {
    month: Date;
    from?: Date;
    to?: Date;
    onPick: (day: Date) => void;
}) {
    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
    });
    const today = startOfDay(new Date());
    const range =
        from && to
            ? { start: from <= to ? from : to, end: from <= to ? to : from }
            : null;

    return (
        <div className="w-[15.5rem]">
            <p className="mb-2 text-center text-sm font-semibold text-[#1a2b4c] capitalize">
                {monthTitle(month)}
            </p>
            <div className="grid grid-cols-7 gap-y-0.5 text-center">
                {WEEKDAYS.map((day) => (
                    <span key={day} className="py-1 text-[0.65rem] font-semibold tracking-wide text-[#8aa0b8]">
                        {day}
                    </span>
                ))}
                {days.map((day) => {
                    const inMonth = isSameMonth(day, month);
                    const isStart = from ? isSameDay(day, from) : false;
                    const isEnd = to ? isSameDay(day, to) : false;
                    const inRange = range ? isWithinInterval(day, range) : false;
                    const single = from && to ? isSameDay(from, to) : false;
                    const endpoint = isStart || isEnd;

                    return (
                        <div
                            key={format(day, 'yyyy-MM-dd')}
                            className={cn(
                                'flex h-8 items-center justify-center',
                                inRange && inMonth && !single && 'bg-[#d9e6f5]',
                                isStart && inRange && 'rounded-l-full',
                                isEnd && inRange && 'rounded-r-full',
                            )}
                        >
                            <button
                                type="button"
                                onClick={() => onPick(startOfDay(day))}
                                className={cn(
                                    'flex size-8 cursor-pointer items-center justify-center rounded-full text-sm',
                                    !inMonth && 'text-[#c5d0dc]',
                                    inMonth && !endpoint && 'text-[#1a2b4c] hover:bg-[#eef3f8]',
                                    endpoint && 'bg-[#1a2b4c] font-semibold text-white',
                                    isSameDay(day, today) && !endpoint && 'ring-1 ring-[#1a2b4c]/40',
                                )}
                            >
                                {format(day, 'd')}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function RangePanel({
    presets,
    activePresetId,
    draftFrom,
    draftTo,
    viewMonth,
    onViewMonth,
    onPick,
    onPreset,
    onApply,
    onClear,
    compact,
}: {
    presets: PresetOption[];
    activePresetId?: PresetId;
    draftFrom?: Date;
    draftTo?: Date;
    viewMonth: Date;
    onViewMonth: (month: Date) => void;
    onPick: (day: Date) => void;
    onPreset: (preset: PresetOption) => void;
    onApply: () => void;
    onClear: () => void;
    compact: boolean;
}) {
    const summary =
        draftFrom && draftTo
            ? `${formatDay(draftFrom <= draftTo ? draftFrom : draftTo)} — ${formatDay(draftFrom <= draftTo ? draftTo : draftFrom)}`
            : 'Elige el inicio y el fin';

    return (
        <div className={cn('flex bg-white', compact ? 'flex-col' : 'flex-row')}>
            <div className="min-w-0 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={() => onViewMonth(addMonths(viewMonth, -1))}
                        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#1a2b4c] hover:bg-[#eef3f8]"
                        aria-label="Mes anterior"
                    >
                        <ChevronLeft className="size-4" />
                    </button>
                    <p className="truncate rounded-lg border border-[#d7e3f0] bg-[#f8fafc] px-3 py-1.5 text-xs font-medium text-[#1a2b4c] tabular-nums">
                        {summary}
                    </p>
                    <button
                        type="button"
                        onClick={() => onViewMonth(addMonths(viewMonth, 1))}
                        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#1a2b4c] hover:bg-[#eef3f8]"
                        aria-label="Mes siguiente"
                    >
                        <ChevronRight className="size-4" />
                    </button>
                </div>
                <div className={cn('gap-4', compact ? 'flex justify-center' : 'flex')}>
                    <MonthGrid month={viewMonth} from={draftFrom} to={draftTo} onPick={onPick} />
                    {compact ? null : (
                        <MonthGrid month={addMonths(viewMonth, 1)} from={draftFrom} to={draftTo} onPick={onPick} />
                    )}
                </div>
                <div className="mt-3 flex items-center justify-end gap-2 border-t border-[#e2eaf3] pt-3">
                    <Button type="button" variant="outline" onClick={onClear} className="h-8 cursor-pointer border-[#c5d5e6] text-[#1a2b4c]">
                        Limpiar
                    </Button>
                    <Button
                        type="button"
                        disabled={!draftFrom || !draftTo}
                        onClick={onApply}
                        className="h-8 cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                    >
                        Aplicar
                    </Button>
                </div>
            </div>
            <div
                className={cn(
                    'border-[#e2eaf3] bg-[#f7f9fc] p-2',
                    compact
                        ? 'grid max-h-40 grid-cols-2 gap-1 overflow-y-auto border-t'
                        : 'flex w-40 shrink-0 flex-col gap-1 overflow-y-auto border-l',
                )}
            >
                {presets.map((preset) => {
                    const active = preset.id === activePresetId;

                    return (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => onPreset(preset)}
                            className={cn(
                                'cursor-pointer rounded-lg px-2.5 py-1.5 text-left text-sm',
                                active
                                    ? 'bg-[#1a2b4c] font-semibold text-white'
                                    : 'bg-white text-[#1a2b4c] hover:bg-[#e8eef5]',
                            )}
                        >
                            {preset.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function DateRangeFilter({
    desde,
    hasta,
    disabled,
    onApply,
    onClear,
    triggerClassName,
    align = 'end',
}: Props) {
    const sheet = useSheetLayout();
    const [open, setOpen] = useState(false);
    const [draftFrom, setDraftFrom] = useState<Date | undefined>();
    const [draftTo, setDraftTo] = useState<Date | undefined>();
    const [pickingEnd, setPickingEnd] = useState(false);
    const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));

    const presets = useMemo((): PresetOption[] => {
        const build = (id: PresetId, label: string, range: { from: Date; to: Date }): PresetOption => ({
            id,
            label,
            desde: toIsoDate(range.from),
            hasta: toIsoDate(range.to),
        });

        return [
            build('today', 'Hoy', rangeToday()),
            build('yesterday', 'Ayer', rangeYesterday()),
            build('tomorrow', 'Mañana', rangeTomorrow()),
            build('last_7', 'Últimos 7 días', rangeLast7Days()),
            build('this_week', 'Esta semana', rangeThisWeek()),
            build('last_week', 'Semana pasada', rangeLastWeek()),
            build('this_month', 'Este mes', rangeThisMonth()),
            build('last_month', 'Mes anterior', rangeLastMonth()),
            build('this_year', 'Este año', rangeThisYear()),
        ];
    }, []);

    const committedFrom = desde ? parseDay(desde) : undefined;
    const committedTo = hasta ? parseDay(hasta) : undefined;
    const hasRange = Boolean(committedFrom && committedTo);
    const activePresetId = presets.find((preset) => preset.desde === desde && preset.hasta === hasta)?.id;
    const triggerLabel =
        committedFrom && committedTo
            ? isSameDay(committedFrom, committedTo)
                ? formatDay(committedFrom)
                : `${formatDay(committedFrom)} — ${formatDay(committedTo)}`
            : 'Todas las fechas';

    const openPanel = () => {
        const from = committedFrom ?? startOfDay(new Date());
        const to = committedTo ?? from;
        setDraftFrom(committedFrom);
        setDraftTo(committedTo);
        setPickingEnd(false);
        setViewMonth(startOfMonth(from <= to ? from : to));
        setOpen(true);
    };

    const applyRange = (fromIso: string, toIso: string) => {
        onApply(fromIso, toIso);
        setOpen(false);
    };

    const applyDraft = () => {
        if (!draftFrom || !draftTo) {
            return;
        }

        const start = draftFrom <= draftTo ? draftFrom : draftTo;
        const end = draftFrom <= draftTo ? draftTo : draftFrom;
        applyRange(toIsoDate(start), toIsoDate(end));
    };

    const pickDay = (day: Date) => {
        if (!pickingEnd || !draftFrom) {
            setDraftFrom(day);
            setDraftTo(day);
            setPickingEnd(true);
            setViewMonth(startOfMonth(day));

            return;
        }

        setDraftTo(day);
        setPickingEnd(false);
    };

    const applyPreset = (preset: PresetOption) => {
        const from = parseDay(preset.desde);
        const to = parseDay(preset.hasta);

        if (from) {
            setViewMonth(startOfMonth(from));
            setDraftFrom(from);
            setDraftTo(to);
        }

        applyRange(preset.desde, preset.hasta);
    };

    const handleClear = (event?: MouseEvent) => {
        event?.preventDefault();
        event?.stopPropagation();
        onClear();
        setOpen(false);
    };

    const panel = (
        <RangePanel
            presets={presets}
            activePresetId={activePresetId}
            draftFrom={draftFrom}
            draftTo={draftTo}
            viewMonth={viewMonth}
            onViewMonth={setViewMonth}
            onPick={pickDay}
            onPreset={applyPreset}
            onApply={applyDraft}
            onClear={() => handleClear()}
            compact={sheet}
        />
    );

    const trigger = (
        <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
                'h-10 max-w-full min-w-40 cursor-pointer justify-start gap-2 rounded-lg border-[#1a2b4c] bg-[#1a2b4c] px-3 font-medium text-white shadow-sm hover:bg-[#122038] hover:text-white',
                triggerClassName,
            )}
            aria-label="Filtrar por rango de fechas"
            onClick={sheet ? () => (open ? setOpen(false) : openPanel()) : undefined}
        >
            <CalendarIcon className="size-4 shrink-0 text-white" />
            <span className="min-w-0 flex-1 truncate text-left text-sm">{triggerLabel}</span>
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
                            handleClear();
                        }
                    }}
                >
                    <X className="size-3.5" />
                </span>
            ) : null}
        </Button>
    );

    if (sheet) {
        return (
            <>
                {trigger}
                {open
                    ? createPortal(
                          <div className="fixed inset-0 z-[200] flex items-end justify-center bg-[#0b1729]/45 p-3 sm:items-center">
                              <button
                                  type="button"
                                  aria-label="Cerrar filtro de fechas"
                                  className="absolute inset-0 cursor-default"
                                  onClick={() => setOpen(false)}
                              />
                              <div className="relative z-10 max-h-[min(36rem,calc(100dvh-1.5rem))] w-full max-w-md overflow-auto rounded-2xl border border-[#d7e3f0] shadow-xl">
                                  {panel}
                              </div>
                          </div>,
                          document.body,
                      )
                    : null}
            </>
        );
    }

    return (
        <Popover
            open={open}
            onOpenChange={(next) => {
                if (next) {
                    openPanel();

                    return;
                }

                setOpen(false);
            }}
        >
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent
                align={align}
                side="bottom"
                sideOffset={8}
                collisionPadding={16}
                className="w-auto max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border-[#d7e3f0] p-0 shadow-xl"
            >
                {panel}
            </PopoverContent>
        </Popover>
    );
}
