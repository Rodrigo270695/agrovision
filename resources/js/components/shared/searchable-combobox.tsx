import { Check, ChevronsUpDown, X } from 'lucide-react';
import {
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
} from 'react';
import { cn } from '@/lib/utils';

export type SearchableComboboxOption = {
    value: string;
    label: string;
    description?: string;
    keywords?: string;
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
    id?: string;
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
    id,
}: Props) {
    const listId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [highlight, setHighlight] = useState(0);

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

    useEffect(() => {
        if (!open) {
            return;
        }

        setHighlight(0);
    }, [open, query]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;

            if (rootRef.current?.contains(target)) {
                return;
            }

            setOpen(false);
            setQuery('');
        };

        document.addEventListener('mousedown', onPointerDown);

        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [open]);

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
                filtered.length === 0
                    ? 0
                    : Math.min(prev + 1, filtered.length - 1),
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
            const option = filtered[highlight];

            if (option) {
                selectOption(option);
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
                    'flex h-10 w-full items-center gap-1.5 rounded-md border border-[#c5d5e6] bg-white px-2.5 shadow-none transition',
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

            {open ? (
                <div
                    ref={listRef}
                    id={listId}
                    role="listbox"
                    // data-scroll-lock-scrollable: permite scroll dentro de Radix Dialog
                    data-scroll-lock-scrollable=""
                    className="mt-1 max-h-48 overflow-y-auto overscroll-contain rounded-lg border border-[#d7e3f0] bg-white py-1 shadow-md"
                >
                    {filtered.length === 0 ? (
                        <p className="px-3 py-3 text-center text-sm text-[#6b8ead]">
                            {emptyMessage}
                        </p>
                    ) : (
                        filtered.map((option, index) => {
                            const isSelected = option.value === value;
                            const isActive = index === highlight;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    role="option"
                                    data-index={index}
                                    aria-selected={isSelected}
                                    className={cn(
                                        'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition',
                                        isActive
                                            ? 'bg-[#e8f1fa] text-[#1a2b4c]'
                                            : 'text-[#1a2b4c] hover:bg-[#f8fafc]',
                                    )}
                                    onMouseEnter={() => setHighlight(index)}
                                    onMouseDown={(event) => {
                                        // Evita que el input pierda foco antes del click
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
                            );
                        })
                    )}
                </div>
            ) : null}
        </div>
    );
}
