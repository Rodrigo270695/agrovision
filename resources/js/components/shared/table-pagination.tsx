import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
                    <Select
                        value={String(meta.per_page || 10)}
                        onValueChange={(value) =>
                            onPerPageChange(Number(value))
                        }
                    >
                        <SelectTrigger
                            size="sm"
                            className="h-8 w-[4.5rem] cursor-pointer border-[#c5d5e6] bg-white text-[#1a2b4c] shadow-none"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                            side="top"
                            align="end"
                            position="popper"
                            className="z-[100] border-[#d7e3f0] bg-white shadow-lg"
                        >
                            {perPageOptions.map((option) => (
                                <SelectItem
                                    key={option}
                                    value={String(option)}
                                    className="cursor-pointer text-[#1a2b4c] focus:bg-[#e8f1fa] focus:text-[#1a2b4c]"
                                >
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
