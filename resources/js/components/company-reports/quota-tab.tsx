import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { BarChart, Ring, Semaphore } from '@/components/company-reports/report-visuals';
import type { QuotaRow } from '@/components/company-reports/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
    rows: QuotaRow[];
    baseUrl: string;
    goalPercent: number;
};

export function QuotaTab({ rows, baseUrl, goalPercent }: Props) {
    const [draft, setDraft] = useState(rows);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setDraft(rows);
    }, [rows]);

    const max = Math.max(
        1,
        ...draft.map((row) => Math.max(row.today, row.daily_quota ?? 0)),
    );

    const save = () => {
        setSaving(true);
        router.put(
            `${baseUrl}/cuotas`,
            {
                quotas: draft.map((row) => ({
                    user_id: row.user_id,
                    daily_quota:
                        row.daily_quota === null ? null : Number(row.daily_quota),
                })),
            },
            {
                preserveScroll: true,
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <div className="flex items-center justify-center rounded-2xl border border-[#d7e3f0] bg-white p-4">
                <Ring percent={goalPercent} label="Inspectores en la meta de hoy" />
            </div>
            <div className="rounded-2xl border border-[#d7e3f0] bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-[#1a2b4c]">
                    Inspecciones de hoy frente a la cuota
                </h3>
                <BarChart
                    rows={draft.map((row) => ({
                        label: row.name,
                        value: row.today,
                        max,
                        tone: row.tone,
                    }))}
                />
            </div>
            <div className="overflow-x-auto rounded-2xl border border-[#d7e3f0] bg-white lg:col-span-2">
                <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-[#f7fafc] text-left text-xs tracking-wide text-[#5a7390] uppercase">
                        <tr>
                            <th className="px-4 py-3">Inspector</th>
                            <th className="px-4 py-3">Cuota por día</th>
                            <th className="px-4 py-3">Hoy</th>
                            <th className="px-4 py-3">En el periodo</th>
                            <th className="px-4 py-3">Días en meta</th>
                            <th className="px-4 py-3">Semáforo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {draft.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-4 py-6 text-[#5a7390]"
                                >
                                    No hay inspectores en esta empresa.
                                </td>
                            </tr>
                        ) : (
                            draft.map((row, index) => (
                                <tr key={row.user_id} className="border-t border-[#e2eaf3]">
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-[#1a2b4c]">
                                            {row.name}
                                        </p>
                                        <p className="text-xs text-[#5a7390]">
                                            {row.email}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Input
                                            type="number"
                                            min={1}
                                            max={500}
                                            value={row.daily_quota ?? ''}
                                            placeholder="20"
                                            className="h-9 w-24"
                                            onChange={(event) => {
                                                const next = event.target.value;
                                                setDraft((current) =>
                                                    current.map((item, itemIndex) =>
                                                        itemIndex === index
                                                            ? {
                                                                  ...item,
                                                                  daily_quota:
                                                                      next === ''
                                                                          ? null
                                                                          : Number(next),
                                                              }
                                                            : item,
                                                    ),
                                                );
                                            }}
                                        />
                                    </td>
                                    <td className="px-4 py-3 tabular-nums">
                                        {row.today}
                                    </td>
                                    <td className="px-4 py-3 tabular-nums">
                                        {row.period}
                                    </td>
                                    <td className="px-4 py-3 tabular-nums">
                                        {row.days_met}/{row.days_with_work}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Semaphore tone={row.tone} />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <div className="flex justify-end border-t border-[#e2eaf3] px-4 py-3">
                    <Button
                        type="button"
                        disabled={saving || draft.length === 0}
                        onClick={save}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                    >
                        Guardar cuotas
                    </Button>
                </div>
            </div>
        </div>
    );
}
