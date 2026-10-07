import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Ring } from '@/components/company-reports/report-visuals';
import type { ReportSummary } from '@/components/company-reports/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
    summary: ReportSummary;
    baseUrl: string;
    dateFrom: string | null;
    dateTo: string | null;
};

export function ConsolidatedTab({
    summary,
    baseUrl,
    dateFrom,
    dateTo,
}: Props) {
    const form = useForm({ email: '' });
    const params = new URLSearchParams();

    if (dateFrom) {
        params.set('date_from', dateFrom);
    }

    if (dateTo) {
        params.set('date_to', dateTo);
    }

    const pdfHref = `${baseUrl}/pdf${params.toString() ? `?${params.toString()}` : ''}`;

    const send = (event: FormEvent) => {
        event.preventDefault();
        const query = params.toString();

        form.post(`${baseUrl}/correo${query ? `?${query}` : ''}`, {
            preserveScroll: true,
            onSuccess: () => form.reset('email'),
        });
    };

    return (
        <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-center justify-center rounded-2xl border border-[#d7e3f0] bg-white p-4">
                    <Ring
                        percent={summary.today_goal_percent}
                        label="Inspectores en la meta de hoy"
                    />
                </div>
                <div className="flex items-center justify-center rounded-2xl border border-[#d7e3f0] bg-white p-4">
                    <Ring
                        percent={summary.attendance_percent}
                        label="Asistencia a capacitaciones"
                    />
                </div>
                <div className="flex items-center justify-center rounded-2xl border border-[#d7e3f0] bg-white p-4">
                    <Ring
                        percent={summary.signed_percent}
                        label="Firma y huella sobre citados"
                    />
                </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    ['Inspecciones', String(summary.inspections)],
                    [
                        'Demora promedio',
                        summary.avg_minutes === null
                            ? '—'
                            : `${summary.avg_minutes} min`,
                    ],
                    ['Capacitaciones', String(summary.sessions)],
                    ['No asistieron', String(summary.absent)],
                ].map(([label, value]) => (
                    <div
                        key={label}
                        className="rounded-2xl border border-[#d7e3f0] bg-white px-4 py-3"
                    >
                        <p className="text-xs text-[#5a7390]">{label}</p>
                        <p className="mt-1 text-xl font-semibold text-[#1a2b4c]">
                            {value}
                        </p>
                    </div>
                ))}
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-[#d7e3f0] bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
                <form onSubmit={send} className="flex flex-1 flex-col gap-2 sm:max-w-md">
                    <label className="text-xs font-medium text-[#1a2b4c]" htmlFor="report-email">
                        Enviar el consolidado por correo
                    </label>
                    <div className="flex gap-2">
                        <Input
                            id="report-email"
                            type="email"
                            required
                            value={form.data.email}
                            placeholder="correo@empresa.com"
                            onChange={(event) => form.setData('email', event.target.value)}
                        />
                        <Button
                            type="submit"
                            disabled={form.processing}
                            className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                        >
                            Enviar
                        </Button>
                    </div>
                    {form.errors.email ? (
                        <p className="text-xs text-red-600">{form.errors.email}</p>
                    ) : null}
                </form>
                <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="cursor-pointer border-[#c5d5e6]"
                >
                    <a href={pdfHref}>Descargar PDF</a>
                </Button>
            </div>
        </div>
    );
}
