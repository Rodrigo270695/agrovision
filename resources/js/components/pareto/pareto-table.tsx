import { Pencil, Trash2 } from 'lucide-react';
import { router } from '@inertiajs/react';
import { useCallback } from 'react';
import { TablePagination } from '@/components/shared/table-pagination';
import { TableSearchFilter } from '@/components/shared/table-search-filter';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useCan } from '@/hooks/use-can';
import { cn } from '@/lib/utils';

export type ParetoItem = {
    id: number;
    template_type: 'tdp' | 'tdc';
    parent_id?: number | null;
    item_number: string;
    label: string;
    sort_order: number;
    check_type: string;
    weight: number | string;
    is_active: boolean;
    parent?: { id: number; item_number: string; label: string } | null;
};

export type ParentOption = {
    id: number;
    item_number: string;
    label: string;
    template_type: string;
};

export type ParetoPagination = {
    data: ParetoItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export type ParetoFilters = {
    search: string;
    template_type: 'tdp' | 'tdc' | 'all';
    sort: 'sort_order' | 'item_number' | 'label' | 'weight' | 'created_at';
    direction: 'asc' | 'desc';
    per_page: number;
};

export type ParetoStats = {
    total: number;
    weight_total: number;
    weight_ok: boolean;
    observation: number;
    expiry: number;
};

type Props = {
    items: ParetoPagination;
    filters: ParetoFilters;
    checkTypeOptions: { value: string; label: string }[];
    onEdit: (item: ParetoItem) => void;
    onDelete: (item: ParetoItem) => void;
};

export function ParetoTable({
    items,
    filters,
    checkTypeOptions,
    onEdit,
    onDelete,
}: Props) {
    const { can } = useCan();
    const canUpdate = can('pareto.update');
    const canDelete = can('pareto.delete');

    const visit = useCallback(
        (params: Partial<ParetoFilters> & { page?: number }) => {
            router.get(
                '/pareto',
                {
                    search: params.search ?? filters.search,
                    template_type: params.template_type ?? filters.template_type,
                    sort: params.sort ?? filters.sort,
                    direction: params.direction ?? filters.direction,
                    per_page: params.per_page ?? filters.per_page,
                    page: params.page ?? 1,
                },
                { preserveState: true, replace: true },
            );
        },
        [filters],
    );

    const typeLabel = (value: string) =>
        checkTypeOptions.find((item) => item.value === value)?.label ?? value;

    return (
        <div className="overflow-hidden rounded-2xl border border-[#d7e3f0] bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-[#e2eaf3] p-3 sm:flex-row sm:items-center">
                <TableSearchFilter
                    value={filters.search}
                    onChange={(search) => visit({ search, page: 1 })}
                    placeholder="Buscar exigencia o número..."
                    className="max-w-none flex-1"
                />
                <Select
                    value={filters.template_type}
                    onValueChange={(template_type) =>
                        visit({
                            template_type: template_type as ParetoFilters['template_type'],
                            page: 1,
                        })
                    }
                >
                    <SelectTrigger className="h-9 w-full cursor-pointer border-[#c5d5e6] bg-white sm:w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                        <SelectItem value="tdp" className="cursor-pointer">
                            TDP
                        </SelectItem>
                        <SelectItem value="tdc" className="cursor-pointer">
                            TDC
                        </SelectItem>
                        <SelectItem value="all" className="cursor-pointer">
                            Todas
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-xs">
                    <thead className="bg-[#1a2b4c] text-white">
                        <tr>
                            <th className="px-3 py-2 font-semibold">N°</th>
                            <th className="px-3 py-2 font-semibold">Exigencia</th>
                            <th className="px-3 py-2 font-semibold">Plantilla</th>
                            <th className="px-3 py-2 font-semibold">Tipo check</th>
                            <th className="px-3 py-2 text-right font-semibold">
                                Peso %
                            </th>
                            <th className="w-24 px-3 py-2" aria-label="Acciones" />
                        </tr>
                    </thead>
                    <tbody>
                        {items.data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-3 py-10 text-center text-[#6b8ead]"
                                >
                                    No hay ítems Pareto. Ejecuta el seeder o crea
                                    uno.
                                </td>
                            </tr>
                        ) : (
                            items.data.map((item, index) => (
                                <tr
                                    key={item.id}
                                    className={cn(
                                        'border-b border-[#eef2f7] last:border-0',
                                        index % 2 === 1 && 'bg-[#f8fafc]',
                                        item.parent_id && 'bg-[#f5f9fd]',
                                    )}
                                >
                                    <td className="px-3 py-1.5 font-mono text-[#1a2b4c]">
                                        {item.parent_id ? (
                                            <span className="ml-3 border-l-2 border-[#4a90e2] pl-2">
                                                {item.item_number}
                                            </span>
                                        ) : (
                                            item.item_number
                                        )}
                                    </td>
                                    <td className="px-3 py-1.5 text-[#1a2b4c]">
                                        {item.label}
                                    </td>
                                    <td className="px-3 py-1.5 uppercase text-[#5a7390]">
                                        {item.template_type}
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <span
                                            className={cn(
                                                'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                                                item.check_type === 'expiry'
                                                    ? 'bg-sky-50 text-sky-800'
                                                    : 'bg-slate-100 text-slate-700',
                                            )}
                                        >
                                            {typeLabel(item.check_type)}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5 text-right font-semibold text-[#1a2b4c]">
                                        {Number(item.weight).toFixed(2)}%
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <div className="flex justify-end gap-0.5">
                                            {canUpdate ? (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => onEdit(item)}
                                                    className="size-7 cursor-pointer text-[#2e5a9e] hover:bg-[#e8f1fa]"
                                                >
                                                    <Pencil className="size-3.5" />
                                                </Button>
                                            ) : null}
                                            {canDelete ? (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => onDelete(item)}
                                                    className="size-7 cursor-pointer text-red-500 hover:bg-red-50"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="space-y-2.5 p-3 md:hidden">
                {items.data.map((item) => (
                    <article
                        key={item.id}
                        className="rounded-xl border border-[#e2eaf3] p-3"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="font-mono text-xs text-[#6b8ead]">
                                    {item.item_number} ·{' '}
                                    {item.template_type.toUpperCase()}
                                </p>
                                <h3 className="text-sm font-medium text-[#1a2b4c]">
                                    {item.label}
                                </h3>
                                <p className="mt-1 text-xs text-[#5a7390]">
                                    {typeLabel(item.check_type)} ·{' '}
                                    {Number(item.weight).toFixed(2)}%
                                </p>
                            </div>
                            <div className="flex gap-0.5">
                                {canUpdate ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onEdit(item)}
                                        className="size-7 cursor-pointer text-[#2e5a9e]"
                                    >
                                        <Pencil className="size-3.5" />
                                    </Button>
                                ) : null}
                                {canDelete ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onDelete(item)}
                                        className="size-7 cursor-pointer text-red-500"
                                    >
                                        <Trash2 className="size-3.5" />
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    </article>
                ))}
            </div>

            <TablePagination
                meta={{
                    from: items.from,
                    to: items.to,
                    total: items.total,
                    current_page: items.current_page,
                    last_page: items.last_page,
                    per_page: items.per_page,
                }}
                onPageChange={(page) => visit({ page })}
                onPerPageChange={(per_page) => visit({ per_page, page: 1 })}
            />
        </div>
    );
}
