import { BarChart, Ring, Semaphore } from '@/components/company-reports/report-visuals';
import type { InspectionDetail, InspectorRow } from '@/components/company-reports/types';

type Props = {
    inspectors: InspectorRow[];
    details: InspectionDetail[];
    detailsTotal: number;
    goalPercent: number;
};

export function InspectionsTab({
    inspectors,
    details,
    detailsTotal,
    goalPercent,
}: Props) {
    const max = Math.max(1, ...inspectors.map((row) => row.total));

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
                            <th className="px-4 py-3">Demora promedio</th>
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
                <div className="border-b border-[#e2eaf3] px-4 py-3">
                    <h3 className="text-sm font-semibold text-[#1a2b4c]">
                        Duración de cada inspección
                    </h3>
                    <p className="text-xs text-[#5a7390]">
                        Hora de Perú. La inspección termina cuando la primera y
                        la segunda ya tienen resultado.
                        {detailsTotal > details.length
                            ? ` Se muestran ${details.length} de ${detailsTotal}.`
                            : ''}
                    </p>
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
                                            {row.first_at}
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
            </div>
        </div>
    );
}
