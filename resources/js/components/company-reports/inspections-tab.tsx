import { router } from '@inertiajs/react';
import { DataPagination } from '@/components/data-page/data-pagination';
import { BarChart, Ring, Semaphore } from '@/components/company-reports/report-visuals';
import type {
    DetailFilters,
    DetailMeta,
    InspectionDetail,
    InspectorRow,
} from '@/components/company-reports/types';

type Props = {
    inspectors: InspectorRow[];
    details: InspectionDetail[];
    detailsMeta: DetailMeta;
    detailFilters: DetailFilters;
    baseUrl: string;
    dateFrom: string | null;
    dateTo: string | null;
    goalPercent: number;
};

export function InspectionsTab({
    inspectors,
    details,
    detailsMeta,
    detailFilters,
    baseUrl,
    dateFrom,
    dateTo,
    goalPercent,
}: Props) {
    const max = Math.max(1, ...inspectors.map((row) => row.total));
    const visit = (extra: Record<string, string | number | null>) => {
        router.get(
            baseUrl,
            {
                date_from: dateFrom ?? undefined,
                date_to: dateTo ?? undefined,
                inspector_id: detailFilters.inspector_id ?? undefined,
                detail_status: detailFilters.status,
                detail_per_page: detailFilters.per_page,
                detail_page: 1,
                ...extra,
            },
            { preserveScroll: true, preserveState: true },
        );
    };

    return (
        <div className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                <div className="flex items-center justify-center rounded-2xl border border-[#d7e3f0] bg-white p-4">
                    <Ring
                        percent={goalPercent}
                        label="Días en que se cumplió la meta"
                    />
                </div>
                <div className="rounded-2xl border border-[#d7e3f0] bg-white p-4">
                    <h3 className="mb-3 text-sm font-semibold text-[#1a2b4c]">
                        Inspecciones por inspector
                    </h3>
                    <BarChart
                        rows={inspectors.map((row) => ({
                            label: row.name,
                            value: row.total,
                            max,
                            tone: row.tone,
                        }))}
                    />
                </div>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-[#d7e3f0] bg-white">
                <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-[#f7fafc] text-left text-xs tracking-wide text-[#5a7390] uppercase">
                        <tr>
                            <th className="px-4 py-3">Inspector</th>
                            <th className="px-4 py-3">Inspecciones</th>
                            <th className="px-4 py-3">Cuota diaria</th>
                            <th className="px-4 py-3">Días en meta</th>
                            <th className="px-4 py-3">Demora 1ra</th>
                            <th className="px-4 py-3">Semáforo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inspectors.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-6 text-[#5a7390]">
                                    No hay inspecciones en este periodo.
                                </td>
                            </tr>
                        ) : (
                            inspectors.map((row) => (
                                <tr
                                    key={row.user_id}
                                    className="border-t border-[#e2eaf3]"
                                >
                                    <td className="px-4 py-3 font-medium text-[#1a2b4c]">
                                        {row.name}
                                    </td>
                                    <td className="px-4 py-3 tabular-nums">{row.total}</td>
                                    <td className="px-4 py-3 tabular-nums">
                                        {row.quota ?? '—'}
                                    </td>
                                    <td className="px-4 py-3 tabular-nums">
                                        {row.days_met}/{row.days_with_work}
                                    </td>
                                    <td className="px-4 py-3 tabular-nums">
                                        {row.avg_minutes === null
                                            ? '—'
                                            : `${row.avg_minutes} min`}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Semaphore tone={row.tone} />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-[#d7e3f0] bg-white">
                <div className="flex flex-col gap-3 border-b border-[#e2eaf3] px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-[#1a2b4c]">
                            Duración de cada inspección
                        </h3>
                        <p className="text-xs text-[#5a7390]">
                            La 1ra cierra al aprobar o desaprobar. La inspección
                            completa cierra cuando también existe la 2da.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <select
                            value={detailFilters.inspector_id ?? ''}
                            onChange={(event) =>
                                visit({
                                    inspector_id: event.target.value
                                        ? Number(event.target.value)
                                        : null,
                                })
                            }
                            className="h-9 rounded-lg border border-[#c5d5e6] bg-white px-2 text-sm text-[#1a2b4c]"
                        >
                            <option value="">Todos los inspectores</option>
                            {inspectors.map((row) => (
                                <option key={row.user_id} value={row.user_id}>
                                    {row.name}
                                </option>
                            ))}
                        </select>
                        <select
                            value={detailFilters.status}
                            onChange={(event) =>
                                visit({ detail_status: event.target.value })
                            }
                            className="h-9 rounded-lg border border-[#c5d5e6] bg-white px-2 text-sm text-[#1a2b4c]"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="open">1ra pendiente</option>
                            <option value="first">1ra cerrada, sin 2da</option>
                            <option value="done">Terminadas</option>
                        </select>
                    </div>
                </div>
                <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-[#f7fafc] text-left text-xs tracking-wide text-[#5a7390] uppercase">
                        <tr>
                            <th className="px-4 py-3">Placa</th>
                            <th className="px-4 py-3">Inspector</th>
                            <th className="px-4 py-3">1ra inspección</th>
                            <th className="px-4 py-3">2da inspección</th>
                            <th className="px-4 py-3">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {details.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-6 text-[#5a7390]">
                                    No hay inspecciones en este periodo.
                                </td>
                            </tr>
                        ) : (
                            details.map((row) => (
                                <tr key={row.id} className="border-t border-[#e2eaf3]">
                                    <td className="px-4 py-3 font-medium text-[#1a2b4c]">
                                        {row.plate}
                                    </td>
                                    <td className="px-4 py-3">{row.inspector}</td>
                                    <td className="px-4 py-3">
                                        <p className="tabular-nums text-[#1a2b4c]">
                                            Empezó {row.first_at}
                                        </p>
                                        <p className="tabular-nums text-[#1a2b4c]">
                                            Terminó {row.first_finished}
                                        </p>
                                        <p className="text-xs text-[#5a7390]">
                                            Duró {row.first_duration}
                                        </p>
                                        <p
                                            className={
                                                row.first_tone === 'ok'
                                                    ? 'text-xs font-semibold text-emerald-700'
                                                    : row.first_tone === 'bad'
                                                      ? 'text-xs font-semibold text-red-700'
                                                      : 'text-xs font-semibold text-amber-700'
                                            }
                                        >
                                            {row.first_result}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="tabular-nums text-[#1a2b4c]">
                                            {row.second_at}
                                        </p>
                                        <p
                                            className={
                                                row.second_tone === 'ok'
                                                    ? 'text-xs font-semibold text-emerald-700'
                                                    : row.second_tone === 'bad'
                                                      ? 'text-xs font-semibold text-red-700'
                                                      : 'text-xs font-semibold text-amber-700'
                                            }
                                        >
                                            {row.second_result}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={
                                                row.status_tone === 'ok'
                                                    ? 'text-xs font-semibold text-emerald-700'
                                                    : 'text-xs font-semibold text-amber-700'
                                            }
                                        >
                                            {row.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <DataPagination
                    meta={{
                        data: details,
                        ...detailsMeta,
                        first_page_url: null,
                        last_page_url: null,
                        next_page_url: null,
                        prev_page_url: null,
                        links: [],
                    }}
                    pageQueryKey="detail_page"
                    perPageOptions={[15, 25, 50, 100]}
                    preservedQuery={{
                        date_from: dateFrom,
                        date_to: dateTo,
                        inspector_id: detailFilters.inspector_id,
                        detail_status:
                            detailFilters.status === 'all'
                                ? undefined
                                : detailFilters.status,
                        detail_per_page: detailFilters.per_page,
                    }}
                    onPerPageChange={(perPage) =>
                        visit({ detail_per_page: perPage, detail_page: 1 })
                    }
                />
            </div>
        </div>
    );
}
