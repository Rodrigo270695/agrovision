import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDeferredSearch } from '@/hooks/use-deferred-search';
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
    debounceMs = 450,
}: Props) {
    const { text, setText, flush } = useDeferredSearch(
        value,
        onChange,
        debounceMs,
    );

    return (
        <div className={cn('relative w-full max-w-sm', className)}>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                type="text"
                inputMode="search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        flush();
                    }
                }}
                placeholder={placeholder}
                className="h-10 border-brand-300 bg-white pl-9 text-sm text-brand-700 placeholder:text-[#94a3b8] focus-visible:border-brand-500 focus-visible:ring-brand-400/35"
                aria-label={placeholder}
            />
        </div>
    );
}
