import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type TablePaginationMeta = {
    from: number | null;
    to: number | null;
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
};

type Props = {
    meta: TablePaginationMeta;
    perPageOptions?: number[];
    onPageChange: (page: number) => void;
    onPerPageChange: (perPage: number) => void;
    className?: string;
};

export function TablePagination({
    meta,
    perPageOptions = [5, 10, 25, 50],
    onPageChange,
    onPerPageChange,
    className,
}: Props) {
    const from = meta.from ?? 0;
    const to = meta.to ?? 0;
    const canPrev = meta.current_page > 1;
    const canNext = meta.current_page < meta.last_page;

    return (
        <div
            className={cn(
                'flex flex-col gap-3 border-t border-[#e2eaf3] bg-[#f7fafc] px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between',
                className,
            )}
        >
            <p className="text-xs text-[#5a7390]">
                Mostrando {from} a {to} de {meta.total} registros (página{' '}
                {meta.current_page} de {Math.max(meta.last_page, 1)})
            </p>

            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-[#5a7390]">
                    <span>Mostrar:</span>
                    <select
                        value={String(meta.per_page || 10)}
                        onChange={(event) =>
                            onPerPageChange(Number(event.target.value))
                        }
                        className="h-8 cursor-pointer rounded-md border border-[#c5d5e6] bg-white px-2 text-xs text-[#1a2b4c] outline-none"
                    >
                        {perPageOptions.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={!canPrev}
                        onClick={() => onPageChange(meta.current_page - 1)}
                        className="size-8 cursor-pointer border-[#c5d5e6] text-[#1a2b4c] disabled:cursor-not-allowed"
                        aria-label="Página anterior"
                    >
                        <ChevronLeft className="size-4" />
                    </Button>

                    <span className="flex size-8 items-center justify-center rounded-md bg-[#2e5a9e] text-xs font-semibold text-white">
                        {meta.current_page}
                    </span>

                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={!canNext}
                        onClick={() => onPageChange(meta.current_page + 1)}
                        className="size-8 cursor-pointer border-[#c5d5e6] text-[#1a2b4c] disabled:cursor-not-allowed"
                        aria-label="Página siguiente"
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
