import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Props = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    debounceMs?: number;
};

export function TableSearchFilter({
    value,
    onChange,
    placeholder = 'Buscar…',
    className,
    debounceMs = 350,
}: Props) {
    const [local, setLocal] = useState(value);

    useEffect(() => {
        setLocal(value);
    }, [value]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            if (local !== value) {
                onChange(local);
            }
        }, debounceMs);

        return () => window.clearTimeout(timer);
    }, [local, value, onChange, debounceMs]);

    return (
        <div className={cn('relative w-full max-w-sm', className)}>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#6b8ead]" />
            <Input
                type="search"
                value={local}
                onChange={(event) => setLocal(event.target.value)}
                placeholder={placeholder}
                className="h-10 border-[#c5d5e6] bg-white pl-9 text-sm text-[#1a2b4c] placeholder:text-[#94a3b8] focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/35"
                aria-label={placeholder}
            />
        </div>
    );
}
