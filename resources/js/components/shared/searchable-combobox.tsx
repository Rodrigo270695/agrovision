import { Check, ChevronsUpDown, Pencil, Plus, Trash2, X } from 'lucide-react';
import {
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export type SearchableComboboxOption = {
    value: string;
    label: string;
    description?: string;
    keywords?: string;
    deletable?: boolean;
};

type Props = {
    value: string | null;
    options: SearchableComboboxOption[];
    onChange: (value: string | null) => void;
    placeholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    allowClear?: boolean;
    className?: string;
    menuMinWidth?: number;
    id?: string;
    compact?: boolean;
    onCreate?: (name: string) => void;
    creating?: boolean;
    onRename?: (value: string, name: string) => void;
    renaming?: boolean;
    onDelete?: (value: string) => void;
    deleting?: boolean;
};

function normalize(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

/**
 * Combo con búsqueda. La lista se renderiza DENTRO del árbol del modal
 * (sin portal a body) para evitar el bloqueo de pointer-events/scroll
 * que aplica Radix Dialog + RemoveScroll a nodos fuera del diálogo.
 */
export function SearchableCombobox({
    value,
    options,
    onChange,
    placeholder = 'Buscar...',
    emptyMessage = 'Sin resultados',
    disabled = false,
    allowClear = true,
    className,
    menuMinWidth,
    id,
    compact = false,
    onCreate,
    creating = false,
    onRename,
    renaming = false,
    onDelete,
    deleting = false,
}: Props) {
    const listId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [highlight, setHighlight] = useState(0);
    const [renameValue, setRenameValue] = useState<string | null>(null);
    const [renameDraft, setRenameDraft] = useState('');

    const selected = useMemo(
        () => options.find((option) => option.value === value) ?? null,
        [options, value],
    );

    const filtered = useMemo(() => {
        const needle = normalize(query);

        if (!needle) {
            return options;
        }

        return options.filter((option) => {
            const haystack = normalize(
                [
                    option.label,
                    option.description ?? '',
                    option.keywords ?? '',
                ].join(' '),
            );

            return haystack.includes(needle);
        });
    }, [options, query]);

    const createName = query.trim();
    const canCreate = Boolean(
        onCreate &&
            createName !== '' &&
            !options.some(
                (option) =>
                    normalize(option.label) === normalize(createName) ||
                    normalize(option.value) === normalize(createName),
            ),
    );
    const itemCount = filtered.length + (canCreate ? 1 : 0);

    useEffect(() => {
        if (!open) {
            return;
        }

        setHighlight(0);
    }, [open, query]);

    useLayoutEffect(() => {
        if (!open) {
            return;
        }

        const updatePanel = () => {
            const trigger = rootRef.current;
            const list = listRef.current;

            if (!trigger || !list) {
                return;
            }

            const rect = trigger.getBoundingClientRect();
            const gap = 4;
            const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
            const spaceAbove = rect.top - gap - 8;
            const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
            const available = Math.max(openUp ? spaceAbove : spaceBelow, 0);
            const limit = Math.min(240, available);

            if (openUp) {
                list.style.top = 'auto';
                list.style.bottom = `${window.innerHeight - rect.top + gap}px`;
            } else {
                list.style.bottom = 'auto';
                list.style.top = `${rect.bottom + gap}px`;
            }

            list.style.height = 'auto';
            list.style.maxHeight = 'none';
            const contentHeight = list.scrollHeight;
            const height = Math.min(contentHeight, limit);

            const width = Math.max(rect.width, menuMinWidth ?? 0);
            const maxLeft = Math.max(8, window.innerWidth - width - 8);

            list.style.left = `${Math.min(rect.left, maxLeft)}px`;
            list.style.width = `${width}px`;
            list.style.height = `${height}px`;
            list.style.maxHeight = `${height}px`;
            list.style.overflowY = contentHeight > height + 1 ? 'auto' : 'hidden';
        };

        updatePanel();

        const onWheel = (event: WheelEvent) => {
            const current = listRef.current;
            const target = event.target;

            if (
                !current ||
                !(target instanceof Node) ||
                !current.contains(target)
            ) {
                return;
            }

            const maxScroll = current.scrollHeight - current.clientHeight;

            if (maxScroll <= 0) {
                return;
            }

            const delta =
                event.deltaMode === 1
                    ? event.deltaY * 16
                    : event.deltaMode === 2
                      ? event.deltaY * current.clientHeight
                      : event.deltaY;
            const next = Math.min(
                maxScroll,
                Math.max(0, current.scrollTop + delta),
            );

            event.preventDefault();
            event.stopPropagation();
            current.scrollTop = next;
        };

        const onTouchMove = (event: TouchEvent) => {
            const current = listRef.current;
            const target = event.target;

            if (
                current &&
                target instanceof Node &&
                current.contains(target)
            ) {
                event.stopPropagation();
            }
        };

        const onWindowScroll = (event: Event) => {
            if (event.target === listRef.current) {
                return;
            }

            updatePanel();
        };

        window.addEventListener('wheel', onWheel, {
            capture: true,
            passive: false,
        });
        window.addEventListener('touchmove', onTouchMove, {
            capture: true,
            passive: false,
        });

        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;

            if (
                rootRef.current?.contains(target) ||
                listRef.current?.contains(target)
            ) {
                return;
            }

            setOpen(false);
            setQuery('');
        };

        document.addEventListener('mousedown', onPointerDown);
        window.addEventListener('resize', updatePanel);
        window.addEventListener('scroll', onWindowScroll, true);

        return () => {
            window.removeEventListener('wheel', onWheel, true);
            window.removeEventListener('touchmove', onTouchMove, true);
            document.removeEventListener('mousedown', onPointerDown);
            window.removeEventListener('resize', updatePanel);
            window.removeEventListener('scroll', onWindowScroll, true);
        };
    }, [open, menuMinWidth, itemCount, renameValue]);

    useEffect(() => {
        if (!open || !listRef.current) {
            return;
        }

        const active = listRef.current.querySelector<HTMLElement>(
            `[data-index="${highlight}"]`,
        );

        active?.scrollIntoView({ block: 'nearest' });
    }, [highlight, open]);

    const selectOption = (option: SearchableComboboxOption) => {
        onChange(option.value);
        setOpen(false);
        setQuery('');
    };

    const clear = () => {
        onChange(null);
        setQuery('');
        setOpen(true);
        inputRef.current?.focus();
    };

    const createCurrent = () => {
        if (!onCreate || creating || createName === '') {
            return;
        }

        onCreate(createName);
        setOpen(false);
        setQuery('');
    };

    const startRename = (option: SearchableComboboxOption) => {
        setRenameValue(option.value);
        setRenameDraft(option.label);
    };

    const commitRename = () => {
        if (!onRename || !renameValue || renaming) {
            return;
        }

        const next = renameDraft.trim();
        const current = options.find((option) => option.value === renameValue);

        if (next === '' || (current && normalize(current.label) === normalize(next))) {
            setRenameValue(null);
            setRenameDraft('');

            return;
        }

        onRename(renameValue, next);
        setRenameValue(null);
        setRenameDraft('');
    };

    const openMenu = () => {
        if (disabled) {
            return;
        }

        setOpen(true);
        setQuery('');
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
            event.preventDefault();
            openMenu();

            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlight((prev) =>
                itemCount === 0 ? 0 : Math.min(prev + 1, itemCount - 1),
            );

            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlight((prev) => Math.max(prev - 1, 0));

            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();

            if (canCreate && highlight === filtered.length) {
                createCurrent();

                return;
            }

            const option = filtered[highlight];

            if (option) {
                selectOption(option);
            } else if (canCreate) {
                createCurrent();
            }

            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false);
            setQuery('');
            inputRef.current?.blur();
        }
    };

    const displayValue = open ? query : (selected?.label ?? '');

    return (
        <div ref={rootRef} className={cn('relative', className)}>
            <div
                className={cn(
                    'flex w-full items-center gap-1.5 rounded-md border border-[#c5d5e6] bg-white px-2.5 shadow-none transition',
                    compact ? 'h-9' : 'h-10',
                    'focus-within:border-[#2e5a9e] focus-within:ring-[3px] focus-within:ring-[#4a90e2]/35',
                    disabled && 'opacity-50',
                    open && 'border-[#2e5a9e] ring-[3px] ring-[#4a90e2]/35',
                )}
            >
                <input
                    ref={inputRef}
                    id={id}
                    type="text"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    disabled={disabled}
                    value={displayValue}
                    placeholder={placeholder}
                    onFocus={openMenu}
                    onClick={openMenu}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setOpen(true);
                        setHighlight(0);
                    }}
                    onKeyDown={onKeyDown}
                    className="min-w-0 flex-1 bg-transparent text-sm text-[#1a2b4c] outline-none placeholder:text-[#6b8ead] disabled:cursor-not-allowed"
                    autoComplete="off"
                    spellCheck={false}
                />
                {allowClear && selected && !disabled ? (
                    <button
                        type="button"
                        aria-label="Limpiar"
                        className="rounded p-0.5 text-[#6b8ead] hover:bg-[#eef1f5] hover:text-[#1a2b4c]"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={clear}
                    >
                        <X className="size-3.5" />
                    </button>
                ) : null}
                <button
                    type="button"
                    tabIndex={-1}
                    aria-label="Abrir lista"
                    disabled={disabled}
                    className="rounded p-0.5 text-[#6b8ead] hover:bg-[#eef1f5] disabled:cursor-not-allowed"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                        if (open) {
                            setOpen(false);
                            setQuery('');

                            return;
                        }

                        openMenu();
                        inputRef.current?.focus();
                    }}
                >
                    <ChevronsUpDown className="size-4" />
                </button>
            </div>

            {open && typeof document !== 'undefined'
                ? createPortal(
                <div
                    ref={listRef}
                    id={listId}
                    role="listbox"
                    data-portal-dropdown=""
                    data-scroll-lock-scrollable=""
                    className="fixed z-[200] overflow-y-auto overscroll-contain rounded-lg border border-[#d7e3f0] bg-white py-1 shadow-lg"
                >
                    {filtered.length === 0 && !canCreate ? (
                        <p className="px-3 py-3 text-center text-sm text-[#6b8ead]">
                            {emptyMessage}
                        </p>
                    ) : (
                        filtered.map((option, index) => {
                            const isSelected = option.value === value;
                            const isActive = index === highlight;
                            const isRenaming = renameValue === option.value;

                            if (isRenaming) {
                                return (
                                    <div
                                        key={option.value}
                                        className="flex items-center gap-2 px-3 py-1.5"
                                    >
                                        <Pencil className="size-3.5 shrink-0 text-[#2e5a9e]" />
                                        <input
                                            autoFocus
                                            value={renameDraft}
                                            disabled={renaming}
                                            aria-label="Nuevo nombre de la plantilla"
                                            className="h-8 min-w-0 flex-1 rounded-md border border-[#c5d5e6] px-2 text-sm text-[#1a2b4c] outline-none focus:border-[#2e5a9e]"
                                            onChange={(event) =>
                                                setRenameDraft(event.target.value)
                                            }
                                            onMouseDown={(event) =>
                                                event.stopPropagation()
                                            }
                                            onKeyDown={(event) => {
                                                event.stopPropagation();

                                                if (event.key === 'Enter') {
                                                    event.preventDefault();
                                                    commitRename();
                                                }

                                                if (event.key === 'Escape') {
                                                    event.preventDefault();
                                                    setRenameValue(null);
                                                    setRenameDraft('');
                                                }
                                            }}
                                        />
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={option.value}
                                    data-index={index}
                                    className={cn(
                                        'flex w-full items-center gap-1 pr-2 text-sm transition',
                                        isActive
                                            ? 'bg-[#e8f1fa] text-[#1a2b4c]'
                                            : 'text-[#1a2b4c] hover:bg-[#f8fafc]',
                                    )}
                                    onMouseEnter={() => setHighlight(index)}
                                >
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-3 py-2 text-left"
                                        onMouseDown={(event) => {
                                            event.preventDefault();
                                            selectOption(option);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                'size-3.5 shrink-0',
                                                isSelected
                                                    ? 'text-[#2e5a9e] opacity-100'
                                                    : 'opacity-0',
                                            )}
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-medium leading-tight">
                                                {option.label}
                                            </span>
                                            {option.description ? (
                                                <span className="mt-0.5 block truncate text-xs leading-tight text-[#5a7390]">
                                                    {option.description}
                                                </span>
                                            ) : null}
                                        </span>
                                    </button>
                                    {onRename ? (
                                        <button
                                            type="button"
                                            aria-label={`Editar ${option.label}`}
                                            disabled={renaming}
                                            className="rounded p-1 text-[#6b8ead] hover:bg-white hover:text-[#1a2b4c] disabled:opacity-50"
                                            onMouseDown={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                startRename(option);
                                            }}
                                        >
                                            <Pencil className="size-3.5" />
                                        </button>
                                    ) : null}
                                    {onDelete && option.deletable ? (
                                        <button
                                            type="button"
                                            aria-label={`Eliminar ${option.label}`}
                                            disabled={deleting}
                                            className="rounded p-1 text-[#6b8ead] hover:bg-white hover:text-red-600 disabled:opacity-50"
                                            onMouseDown={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                onDelete(option.value);
                                            }}
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    ) : null}
                                </div>
                            );
                        })
                    )}
                    {canCreate ? (
                        <button
                            type="button"
                            data-index={filtered.length}
                            className={cn(
                                'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition',
                                highlight === filtered.length
                                    ? 'bg-[#e8f1fa] text-[#1a2b4c]'
                                    : 'text-[#1a2b4c] hover:bg-[#f8fafc]',
                            )}
                            onMouseEnter={() => setHighlight(filtered.length)}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                createCurrent();
                            }}
                        >
                            <Plus className="size-3.5 shrink-0 text-[#2e5a9e]" />
                            <span className="min-w-0 flex-1 truncate font-medium">
                                {creating
                                    ? 'Creando...'
                                    : `Crear "${createName}"`}
                            </span>
                        </button>
                    ) : null}
                </div>,
                document.body,
            )
                : null}
        </div>
    );
}
