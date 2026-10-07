import { BarChart, Ring, Semaphore } from '@/components/company-reports/report-visuals';
import type { InductionRow } from '@/components/company-reports/types';

type Props = {
    rows: InductionRow[];
    attendancePercent: number;
    signedPercent: number;
};

export function InductionsTab({
    rows,
    attendancePercent,
    signedPercent,
}: Props) {
    const max = Math.max(1, ...rows.map((row) => row.cited));

    return (
        <div className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-[220px_220px_1fr]">
                <div className="flex items-center justify-center rounded-2xl border border-[#d7e3f0] bg-white p-4">
                    <Ring percent={attendancePercent} label="Llegaron de los citados" />
                </div>
                <div className="flex items-center justify-center rounded-2xl border border-[#d7e3f0] bg-white p-4">
                    <Ring
                        percent={signedPercent}
                        label="Firmaron y pusieron huella"
                    />
                </div>
                <div className="rounded-2xl border border-[#d7e3f0] bg-white p-4">
                    <h3 className="mb-3 text-sm font-semibold text-[#1a2b4c]">
                        Citados por capacitación
                    </h3>
                    <BarChart
                        rows={rows.map((row) => ({
                            label: row.title,
                            value: row.cited,
                            max,
                            tone: row.tone,
                        }))}
                    />
                </div>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-[#d7e3f0] bg-white">
                <table className="w-full min-w-[860px] text-sm">
                    <thead className="bg-[#f7fafc] text-left text-xs tracking-wide text-[#5a7390] uppercase">
                        <tr>
                            <th className="px-4 py-3">Capacitación</th>
                            <th className="px-4 py-3">Responsable</th>
                            <th className="px-4 py-3">Citados</th>
                            <th className="px-4 py-3">Llegaron</th>
                            <th className="px-4 py-3">Firma y huella</th>
                            <th className="px-4 py-3">No asistieron</th>
                            <th className="px-4 py-3">Semáforo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-6 text-[#5a7390]">
                                    No hay capacitaciones en este periodo.
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => (
                                <tr key={row.id} className="border-t border-[#e2eaf3]">
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-[#1a2b4c]">
                                            {row.title}
                                        </p>
                                        <p className="text-xs text-[#5a7390]">
                                            {row.when} · {row.status}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3">{row.facilitator}</td>
                                    <td className="px-4 py-3 tabular-nums">{row.cited}</td>
                                    <td className="px-4 py-3 tabular-nums">
                                        {row.arrived}
                                    </td>
                                    <td className="px-4 py-3 tabular-nums">{row.signed}</td>
                                    <td className="px-4 py-3 tabular-nums">{row.absent}</td>
                                    <td className="px-4 py-3">
                                        <Semaphore tone={row.tone} />
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
