import { router } from '@inertiajs/react';
import {
    CheckCircle2,
    CheckIcon,
    ChevronDownIcon,
    CircleDashed,
    Clock3,
    FilePenLine,
    LayoutGrid,
    LoaderCircle,
    XCircle,
    type LucideIcon,
} from 'lucide-react';
import {
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export type FilterChipTone = 'default' | 'success' | 'muted' | 'warning' | 'danger' | 'info';

export type FilterChip<TValue extends string> = {
    value: TValue;
    label: string;
    /** Conteo opcional al lado de la etiqueta (ej. "Activas (13)"). */
    count?: number;
    icon?: ReactNode;
    /** Texto secundario bajo el título en el menú (típico en "Todos…"). */
    description?: string;
    /** Tinte visual (badge en menú + icono del trigger). */
    tone?: FilterChipTone;
};

export type FilterChipsProps<TValue extends string> = {
    /** Etiqueta semántica para accesibilidad. */
    ariaLabel: string;
    value: TValue;
    onChange: (value: TValue) => void;
    options: readonly FilterChip<TValue>[];
    className?: string;
    disabled?: boolean;
    /** Clases extra del botón disparador. */
    triggerClassName?: string;
};

const toneIconShell: Record<FilterChipTone, string> = {
    default: 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-200',
    success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
    muted: 'bg-stone-100 text-stone-500 dark:bg-muted dark:text-muted-foreground',
    warning: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
    danger: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300',
    info: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300',
};

const toneBadge: Record<FilterChipTone, string> = {
    default:
        'border-brand-200/90 bg-brand-50 text-brand-800 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-100',
    success:
        'border-emerald-300/90 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100',
    muted: 'border-stone-200 bg-stone-50 text-stone-600 dark:border-border dark:bg-muted dark:text-muted-foreground',
    warning:
        'border-amber-300/90 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100',
    danger:
        'border-rose-300/90 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100',
    info: 'border-sky-300/90 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100',
};

const toneTriggerIcon: Record<FilterChipTone, string> = {
    default: 'text-brand-700 dark:text-brand-200',
    success: 'text-emerald-600 dark:text-emerald-300',
    muted: 'text-stone-500 dark:text-muted-foreground',
    warning: 'text-amber-600 dark:text-amber-300',
    danger: 'text-rose-600 dark:text-rose-300',
    info: 'text-sky-600 dark:text-sky-300',
};

function inferTone(value: string, explicit?: FilterChipTone): FilterChipTone {
    if (explicit) {
        return explicit;
    }

    const v = value.toLowerCase();

    if (v === 'todas' || v === 'todos' || v === 'all' || v === '' || v === '__all__') {
        return 'default';
    }

    if (
        [
            'activa',
            'activo',
            'activas',
            'activos',
            'completada',
            'completado',
            'confirmada',
            'abierta',
            'pagada',
            'alta',
            'emitida',
        ].includes(v)
    ) {
        return 'success';
    }

    if (
        [
            'inactiva',
            'inactivo',
            'inactivas',
            'inactivos',
            'cancelada',
            'cancelado',
            'anulada',
            'cerrada',
        ].includes(v)
    ) {
        return 'muted';
    }

    if (['borrador', 'programada', 'pendiente', 'solicitado'].includes(v)) {
        return 'warning';
    }

    if (['en_proceso', 'en_curso'].includes(v)) {
        return 'info';
    }

    return 'default';
}

function isAllValue(value: string): boolean {
    return ['todas', 'todos', 'all', '', '__all__'].includes(value.toLowerCase());
}

function DefaultIcon({ value, className }: { value: string; className?: string }): ReactNode {
    const v = value.toLowerCase();
    const cls = cn('size-3.5 shrink-0', className);

    if (isAllValue(v)) {
        return <LayoutGrid className={cls} strokeWidth={2.25} />;
    }

    if (
        [
            'activa',
            'activo',
            'activas',
            'activos',
            'completada',
            'completado',
            'confirmada',
            'abierta',
            'pagada',
            'alta',
            'emitida',
        ].includes(v)
    ) {
        return <CheckCircle2 className={cls} strokeWidth={2.25} />;
    }

    if (
        [
            'inactiva',
            'inactivo',
            'inactivas',
            'inactivos',
            'cancelada',
            'cancelado',
            'anulada',
            'cerrada',
        ].includes(v)
    ) {
        return <XCircle className={cls} strokeWidth={2.25} />;
    }

    if (v === 'borrador') {
        return <FilePenLine className={cls} strokeWidth={2.25} />;
    }

    if (v === 'programada' || v === 'pendiente' || v === 'solicitado') {
        return <Clock3 className={cls} strokeWidth={2.25} />;
    }

    if (v === 'en_proceso' || v === 'en_curso') {
        return <LoaderCircle className={cls} strokeWidth={2.25} />;
    }

    return <CircleDashed className={cls} strokeWidth={2.25} />;
}

function OptionIcon({
    option,
    className,
}: {
    option: FilterChip<string>;
    className?: string;
}): ReactNode {
    if (option.icon) {
        return option.icon;
    }

    return <DefaultIcon value={option.value} className={className} />;
}

function labelWithCount(label: string, count?: number): string {
    if (typeof count !== 'number') {
        return label;
    }

    return `${label} (${count})`;
}

/**
 * Filtro de listados. No usa el select de Radix: ese bloquea el clic en toda
 * la página mientras espera la respuesta, y con internet lento se queda pegado.
 * La opción elegida se ve al instante; la consulta sale cuando el menú ya cerró.
 */
export function FilterChips<TValue extends string>({
    ariaLabel,
    value,
    onChange,
    options,
    className,
    disabled = false,
    triggerClassName,
}: FilterChipsProps<TValue>) {
    const listId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const valueRef = useRef(value);
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState<TValue | null>(null);
    const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
    const shown = pending ?? value;
    const selected =
        options.find((option) => option.value === shown) ??
        options.find((option) => option.value === value) ??
        options[0];
    const selectedTone = selected
        ? inferTone(selected.value, selected.tone)
        : 'default';

    valueRef.current = value;

    useEffect(() => {
        if (pending !== null && pending === value) {
            setPending(null);
        }
    }, [pending, value]);

    useEffect(() => {
        return router.on('finish', () => {
            requestAnimationFrame(() => {
                setPending((current) =>
                    current !== null && current !== valueRef.current
                        ? null
                        : current,
                );
            });
        });
    }, []);

    useLayoutEffect(() => {
        if (!open) {
            return;
        }

        const place = () => {
            const trigger = rootRef.current;
            const menu = menuRef.current;

            if (!trigger) {
                return;
            }

            const gap = 6;
            const edge = 8;
            const maxMenu = 320;
            const rect = trigger.getBoundingClientRect();
            const width = Math.max(rect.width, 232);
            const left = Math.max(
                edge,
                Math.min(rect.left, window.innerWidth - width - edge),
            );
            const spaceBelow = window.innerHeight - rect.bottom - gap - edge;
            const spaceAbove = rect.top - gap - edge;
            const contentHeight = menu
                ? (() => {
                      menu.style.height = 'auto';
                      menu.style.maxHeight = 'none';

                      return menu.scrollHeight;
                  })()
                : options.length * 40 + 8;
            const openUp =
                contentHeight > spaceBelow && spaceAbove > spaceBelow;
            const available = Math.max(
                48,
                openUp ? spaceAbove : spaceBelow,
            );
            const height = Math.min(contentHeight, maxMenu, available);

            setMenuStyle({
                position: 'fixed',
                top: openUp ? 'auto' : rect.bottom + gap,
                bottom: openUp
                    ? window.innerHeight - rect.top + gap
                    : 'auto',
                left,
                width,
                height,
                maxHeight: height,
                overflowY: contentHeight > height + 1 ? 'auto' : 'hidden',
                zIndex: 80,
            });
        };

        place();
        const frame = window.requestAnimationFrame(place);
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);

        const onPointerDown = (event: PointerEvent) => {
            const target = event.target;

            if (!(target instanceof Node) || rootRef.current?.contains(target)) {
                return;
            }

            if (
                target instanceof Element &&
                target.closest('[data-filter-select-menu]')
            ) {
                return;
            }

            setOpen(false);
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open, options.length]);

    const choose = (next: TValue) => {
        setOpen(false);

        if (next === value && pending === null) {
            return;
        }

        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            window.setTimeout(() => onChange(next), 0);

            return;
        }

        setPending(next);
        window.setTimeout(() => onChange(next), 0);
    };

    return (
        <div
            ref={rootRef}
            className={cn('relative w-full min-w-0 sm:w-auto', className)}
        >
            <button
                type="button"
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                disabled={disabled}
                onClick={() => setOpen((current) => !current)}
                className={cn(
                    'border-input flex h-9 w-full min-w-[11rem] cursor-pointer items-center justify-between gap-2 rounded-lg border bg-white px-2.5 text-sm shadow-xs outline-none transition-[color,border-color]',
                    'hover:border-brand-300 hover:bg-white focus-visible:border-brand-400',
                    open && 'border-brand-400',
                    'disabled:cursor-not-allowed disabled:opacity-50 dark:bg-card',
                    triggerClassName,
                )}
            >
                {selected ? (
                    <span className="flex min-w-0 items-center gap-1.5">
                        <span
                            className={cn(
                                'flex size-4 shrink-0 items-center justify-center',
                                toneTriggerIcon[selectedTone],
                            )}
                            aria-hidden
                        >
                            <OptionIcon option={selected} className="size-3.5" />
                        </span>
                        <span className="truncate font-normal text-foreground">
                            {labelWithCount(selected.label, selected.count)}
                        </span>
                    </span>
                ) : (
                    <span className="text-muted-foreground">…</span>
                )}
                <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground/70" />
            </button>

            {open
                ? createPortal(
                      <div
                          ref={menuRef}
                          id={listId}
                          role="listbox"
                          aria-label={ariaLabel}
                          data-filter-select-menu=""
                          style={menuStyle}
                          className="h-fit overflow-hidden rounded-xl border border-border/60 bg-white p-1 text-popover-foreground shadow-lg dark:bg-popover"
                      >
                          {options.map((opt) => {
                              const tone = inferTone(opt.value, opt.tone);
                              const asAll = isAllValue(opt.value);
                              const asBadge =
                                  !asAll &&
                                  tone !== 'default' &&
                                  !opt.description;
                              const checked = opt.value === shown;

                              return (
                                  <button
                                      key={opt.value}
                                      type="button"
                                      role="option"
                                      aria-selected={checked}
                                      onClick={() => choose(opt.value)}
                                      className={cn(
                                          'relative flex w-full cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 pr-7 text-left text-sm outline-hidden',
                                          'hover:bg-brand-50/70 focus-visible:bg-brand-50/70 dark:hover:bg-brand-950/30',
                                          checked &&
                                              'bg-brand-50 dark:bg-brand-950/40',
                                      )}
                                  >
                                      <span className="absolute top-1/2 right-1.5 flex size-3.5 -translate-y-1/2 items-center justify-center">
                                          {checked ? (
                                              <CheckIcon
                                                  className="size-3 text-foreground/80"
                                                  strokeWidth={2.5}
                                              />
                                          ) : null}
                                      </span>
                                      <span
                                          className={cn(
                                              'flex size-6 shrink-0 items-center justify-center rounded-md',
                                              toneIconShell[tone],
                                          )}
                                          aria-hidden
                                      >
                                          <OptionIcon
                                              option={opt}
                                              className="size-3"
                                          />
                                      </span>
                                      {asBadge ? (
                                          <span
                                              className={cn(
                                                  'inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[0.7rem] font-medium',
                                                  toneBadge[tone],
                                              )}
                                          >
                                              <OptionIcon
                                                  option={opt}
                                                  className="size-3"
                                              />
                                              <span className="truncate">
                                                  {labelWithCount(
                                                      opt.label,
                                                      opt.count,
                                                  )}
                                              </span>
                                          </span>
                                      ) : (
                                          <span className="min-w-0">
                                              <span className="block truncate text-sm font-normal text-foreground">
                                                  {labelWithCount(
                                                      opt.label,
                                                      opt.count,
                                                  )}
                                              </span>
                                              {opt.description ? (
                                                  <span className="block truncate text-[11px] text-[#6b8ead]">
                                                      {opt.description}
                                                  </span>
                                              ) : null}
                                          </span>
                                      )}
                                  </button>
                              );
                          })}
                      </div>,
                      document.body,
                  )
                : null}
        </div>
    );
}

/** Iconos sugeridos para reutilizar en opciones custom. */
export const filterChipIcons = {
    all: LayoutGrid,
    active: CheckCircle2,
    inactive: XCircle,
    draft: FilePenLine,
    scheduled: Clock3,
    progress: LoaderCircle,
} as const satisfies Record<string, LucideIcon>;
