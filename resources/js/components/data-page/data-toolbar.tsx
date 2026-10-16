import { router } from '@inertiajs/react';
import { Loader2, Search, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { useDeferredSearch } from '@/hooks/use-deferred-search';
import { cn } from '@/lib/utils';

export type DataToolbarProps = {
    /** Valor controlado del input de búsqueda. */
    search: string;
    onSearchChange: (value: string) => void;
    placeholder?: string;
    /**
     * Espera antes de consultar. 0 entrega cada letra al padre
     * (útil si el padre ya espera por su cuenta).
     */
    debounceMs?: number;
    /** Si true, muestra spinner en el ícono mientras llega la respuesta. */
    isSearching?: boolean;
    /** Slot para chips/selects de filtros adicionales. */
    children?: ReactNode;
    className?: string;
    /** Clases del envoltorio del input de búsqueda (p. ej. `sm:max-w-none` para ancho completo). */
    searchWrapperClassName?: string;
    /** Clases extra del contenedor del slot `children` (p. ej. `sm:justify-end`). */
    filtersClassName?: string;
};

/**
 * Toolbar superior de una página de listado.
 * Combina un input de búsqueda con icono + slot opcional para filtros extra.
 *
 * - Cuando `isSearching` es `true`, el ícono se convierte en spinner para
 *   indicar al usuario que la consulta está en curso (útil con miles de filas).
 *
 * Layout: el buscador va solo en la primera fila; los selects/filtros debajo,
 * en una fila que puede hacer wrap sin desalinear el search.
 */
export function DataToolbar({
    search,
    onSearchChange,
    placeholder = 'Buscar...',
    debounceMs = 450,
    isSearching = false,
    children,
    className,
    searchWrapperClassName,
    filtersClassName,
}: DataToolbarProps) {
    const [pending, setPending] = useState(false);
    const { text, setText, flush } = useDeferredSearch(
        search,
        (value) => {
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                setPending(false);
            } else {
                setPending(true);
            }

            onSearchChange(value);
        },
        debounceMs,
    );

    useEffect(() => {
        return router.on('finish', () => setPending(false));
    }, []);

    const submit = (value: string) => {
        setText(value);
    };

    return (
        <div className={cn('flex w-full flex-col gap-3', className)}>
            <div className={cn('relative w-full sm:max-w-sm', searchWrapperClassName)}>
                {isSearching || pending ? (
                    <Loader2
                        className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 animate-spin text-primary"
                        aria-hidden="true"
                        strokeWidth={2.25}
                    />
                ) : (
                    <Search
                        className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground/90"
                        aria-hidden="true"
                        strokeWidth={2.25}
                    />
                )}
                <Input
                    type="text"
                    inputMode="search"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={text}
                    onChange={(event) => submit(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            flush();
                        }
                    }}
                    placeholder={placeholder}
                    className="h-10 pr-10 pl-10 [&::-webkit-search-cancel-button]:hidden"
                />
                {text.length > 0 && (
                    <button
                        type="button"
                        onClick={() => submit('')}
                        aria-label="Limpiar búsqueda"
                        className="absolute top-1/2 right-2.5 z-10 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <X className="size-3.5" strokeWidth={2.5} />
                    </button>
                )}
            </div>

            {children ? (
                <div
                    className={cn(
                        'flex min-w-0 w-full flex-wrap items-center gap-2 sm:gap-3',
                        filtersClassName,
                    )}
                >
                    {children}
                </div>
            ) : null}
        </div>
    );
}
