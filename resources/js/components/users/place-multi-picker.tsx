import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type PlaceOption = {
    id: number;
    name: string;
    site_name?: string | null;
};

type Props = {
    places: PlaceOption[];
    value: string[];
    onChange: (value: string[]) => void;
    disabled?: boolean;
};

const checkClassName =
    'size-3.5 shrink-0 border-[#9bb4ce] data-[state=checked]:border-[#2e5a9e] data-[state=checked]:bg-[#2e5a9e] data-[state=checked]:text-white';

export function PlaceMultiPicker({
    places,
    value,
    onChange,
    disabled = false,
}: Props) {
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();

        if (!term) {
            return places;
        }

        return places.filter((place) => {
            const site = (place.site_name ?? '').toLowerCase();

            return (
                place.name.toLowerCase().includes(term) || site.includes(term)
            );
        });
    }, [places, query]);

    const groups = useMemo(() => {
        const grouped = new Map<string, PlaceOption[]>();

        filtered.forEach((place) => {
            const site = place.site_name?.trim() || 'Sin sede';
            const current = grouped.get(site) ?? [];
            current.push(place);
            grouped.set(site, current);
        });

        return [...grouped.entries()];
    }, [filtered]);

    const toggle = (id: string, checked: boolean) => {
        onChange(
            checked ? [...value, id] : value.filter((current) => current !== id),
        );
    };

    return (
        <div className="overflow-hidden rounded-md border border-[#c5d5e6] bg-white">
            <div className="relative border-b border-[#e2eaf3]">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#6b8ead]" />
                <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar lugar..."
                    disabled={disabled}
                    className="h-8 border-0 bg-transparent pl-8 text-xs shadow-none focus-visible:ring-0"
                />
            </div>
            <div className="max-h-52 overflow-y-auto p-1">
                {places.length === 0 ? (
                    <p className="px-2 py-3 text-center text-xs text-[#6b8ead]">
                        No hay lugares activos. Créalos en Lugares.
                    </p>
                ) : filtered.length === 0 ? (
                    <p className="px-2 py-3 text-center text-xs text-[#6b8ead]">
                        Sin coincidencias
                    </p>
                ) : (
                    groups.map(([siteName, sitePlaces]) => (
                        <div key={siteName} className="mb-1">
                            <p className="px-2 pt-1.5 pb-0.5 text-[10px] font-semibold tracking-wide text-[#2e5a9e] uppercase">
                                {siteName}
                            </p>
                            {sitePlaces.map((place) => {
                                const id = String(place.id);
                                const checked = value.includes(id);

                                return (
                                    <label
                                        key={place.id}
                                        className={cn(
                                            'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[#1a2b4c] hover:bg-[#f8fafc]',
                                            checked && 'bg-[#e8f1fa]/70',
                                            disabled &&
                                                'pointer-events-none opacity-60',
                                        )}
                                    >
                                        <Checkbox
                                            checked={checked}
                                            disabled={disabled}
                                            onCheckedChange={(next) =>
                                                toggle(id, next === true)
                                            }
                                            className={checkClassName}
                                        />
                                        <span>{place.name}</span>
                                    </label>
                                );
                            })}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
