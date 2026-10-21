import { LayoutGrid, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type SstBoardRingOption = {
    key: string;
    label: string;
};

const storageKey = (template: string) =>
    `agrovision:sst-board:items:${template}`;

function loadSelection(
    template: string,
    allKeys: string[],
): Set<string> | null {
    if (typeof window === 'undefined' || allKeys.length === 0) {
        return null;
    }

    try {
        const raw = localStorage.getItem(storageKey(template));
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) {
            return null;
        }

        if (parsed.length === 0) {
            return new Set();
        }

        const valid = parsed
            .map((key) => String(key))
            .filter((key) => allKeys.includes(key));

        if (valid.length === 0) {
            return null;
        }

        if (valid.length === allKeys.length) {
            return null;
        }

        return new Set(valid);
    } catch {
        return null;
    }
}

function saveSelection(
    template: string,
    keys: Set<string>,
    allKeys: string[],
): void {
    if (typeof window === 'undefined') {
        return;
    }

    if (keys.size === allKeys.length) {
        localStorage.removeItem(storageKey(template));

        return;
    }

    localStorage.setItem(
        storageKey(template),
        JSON.stringify(keys.size === 0 ? [] : [...keys].sort()),
    );
}

type Props = {
    template: string;
    items: SstBoardRingOption[];
    onChange: (keys: Set<string> | null) => void;
};

export function SstBoardItemPicker({ template, items, onChange }: Props) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const allKeys = useMemo(() => items.map((item) => item.key), [items]);
    const [selected, setSelected] = useState<Set<string>>(() => {
        const stored = loadSelection(template, allKeys);

        return stored ?? new Set(allKeys);
    });

    useEffect(() => {
        const stored = loadSelection(template, allKeys);
        const next =
            stored === null ? new Set(allKeys) : new Set(stored);
        setSelected(next);
        onChange(stored);
        setSearch('');
        // eslint-disable-next-line react-hooks/exhaustive-deps -- onChange estable desde el padre
    }, [template, allKeys.join('|')]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) {
            return items;
        }

        return items.filter((item) =>
            item.label.toLowerCase().includes(term),
        );
    }, [items, search]);

    const visibleCount =
        selected.size === allKeys.length ? allKeys.length : selected.size;
    const isFiltered = selected.size < allKeys.length;

    const applySelection = (next: Set<string>) => {
        const normalized =
            next.size === 0
                ? new Set<string>()
                : next.size === allKeys.length
                  ? new Set(allKeys)
                  : next;

        setSelected(normalized);
        const forParent =
            normalized.size === allKeys.length ? null : normalized;
        onChange(forParent);
        saveSelection(template, normalized, allKeys);
    };

    const toggle = (key: string, checked: boolean) => {
        const next = new Set(selected);
        if (checked) {
            next.add(key);
        } else {
            next.delete(key);
        }
        applySelection(next);
    };

    return (
        <div className="w-full sm:w-auto">
            <p className="mb-1 text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase">
                Ítems a mostrar
            </p>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        className={cn(
                            'h-10 w-full cursor-pointer justify-start gap-2 border-[#c5d5e6] bg-white px-3 text-xs font-medium text-[#1a2b4c] sm:min-w-[14rem]',
                            isFiltered && 'border-[#1a2b4c]/40 bg-[#f4f8fc]',
                        )}
                    >
                        <LayoutGrid className="size-4 shrink-0 opacity-70" />
                        <span className="truncate">
                            {isFiltered
                                ? `${visibleCount} de ${allKeys.length} ítems`
                                : 'Todos los ítems'}
                        </span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    align="start"
                    className="w-[min(100vw-2rem,22rem)] border-[#d7e3f0] p-0"
                >
                    <div className="border-b border-[#e8eef5] p-3">
                        <p className="text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase">
                            Personalizar tablero
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#5a7390]">
                            La selección se guarda por plantilla (
                            {template.toUpperCase()}).
                        </p>
                        <div className="relative mt-2">
                            <Search
                                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#6b8ead]"
                                aria-hidden
                            />
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Buscar ítem…"
                                className="h-9 pl-8 text-xs"
                            />
                        </div>
                        <div className="mt-2 flex gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 flex-1 cursor-pointer text-xs"
                                onClick={() =>
                                    applySelection(new Set(allKeys))
                                }
                            >
                                Marcar todos
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 flex-1 cursor-pointer text-xs"
                                onClick={() => applySelection(new Set())}
                            >
                                Quitar todos
                            </Button>
                        </div>
                    </div>
                    <ul className="max-h-64 overflow-y-auto p-2">
                        {filtered.length === 0 ? (
                            <li className="px-2 py-4 text-center text-xs text-[#5a7390]">
                                Sin coincidencias.
                            </li>
                        ) : (
                            filtered.map((item) => {
                                const checked = selected.has(item.key);

                                return (
                                    <li key={item.key}>
                                        <label
                                            className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-[#f4f8fc]"
                                        >
                                            <Checkbox
                                                checked={checked}
                                                onCheckedChange={(value) =>
                                                    toggle(
                                                        item.key,
                                                        value === true,
                                                    )
                                                }
                                                className="mt-0.5"
                                            />
                                            <span className="text-xs leading-snug text-[#1a2b4c]">
                                                {item.label}
                                            </span>
                                        </label>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </PopoverContent>
            </Popover>
        </div>
    );
}
