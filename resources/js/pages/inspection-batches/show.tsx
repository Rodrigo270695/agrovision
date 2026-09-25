import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Download, FileDown } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { SignaturePad } from '@/components/checklists/signature-pad';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';
import { cn } from '@/lib/utils';

type ItemRow = {
    number: string | null;
    label: string;
    value: 'yes' | 'no' | null;
};

type ChecklistRow = {
    id: number;
    plate_number: string;
    driver_name: string | null;
    provider: string | null;
    first_result: string | null;
    second_result: string | null;
    reviewed_pass: '1ra' | '2da';
    ok: number;
    fail: number;
    conforme: boolean;
    items: ItemRow[];
};

type BatchShow = {
    id: number;
    inspected_on: string;
    status: 'sent' | 'signed';
    coordinator_name: string | null;
    signed_at: string | null;
    signer_name: string | null;
    signature_url: string | null;
    can_sign: boolean;
    total: number;
    conformes: number;
    faltantes: number;
};

type PageProps = {
    batch: BatchShow;
    checklists: ChecklistRow[];
};

function formatDay(value: string): string {
    const [year, month, day] = value.slice(0, 10).split('-');

    return day && month && year ? `${day}/${month}/${year}` : value;
}

export default function InspectionBatchShowPage() {
    const { batch, checklists } = usePage().props as unknown as PageProps;
    const [openId, setOpenId] = useState<number | null>(null);
    const form = useForm({ signature_data_url: '' });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!batch.can_sign || form.processing) {
            return;
        }

        form.post(`/paquetes-inspeccion/${batch.id}/firmar`, {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title={`Paquete ${formatDay(batch.inspected_on)}`} />
            <div className="flex flex-col gap-4 p-4">
                <div className="mx-auto w-full max-w-5xl space-y-4">
                    <div className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm sm:p-5">
                        <Link
                            href="/paquetes-inspeccion"
                            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-[#2e5a9e] hover:underline"
                        >
                            <ArrowLeft className="size-3.5" />
                            Volver a paquetes
                        </Link>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h1 className="text-xl font-semibold text-[#1a2b4c]">
                                    Paquete del {formatDay(batch.inspected_on)}
                                </h1>
                                <p className="text-sm text-[#5a7390]">
                                    {batch.coordinator_name || 'Sin coordinador'} ·{' '}
                                    {batch.total} inspecciones
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                                    {batch.conformes} conformes
                                </span>
                                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                                    {batch.faltantes} con faltantes
                                </span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    asChild
                                    className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                                >
                                    <a href={`/paquetes-inspeccion/${batch.id}/excel`}>
                                        <Download className="size-4" />
                                        Excel
                                    </a>
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    asChild
                                    className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                                >
                                    <a
                                        href={`/paquetes-inspeccion/${batch.id}/pdf`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <FileDown className="size-4" />
                                        PDF
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {checklists.map((row) => {
                            const open = openId === row.id;
                            const missing = row.items.filter(
                                (item) => item.value === 'no',
                            );

                            return (
                                <article
                                    key={row.id}
                                    className="rounded-2xl border border-[#d7e3f0] bg-white p-3 shadow-sm sm:p-4"
                                >
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-[#1a2b4c]">
                                                {row.plate_number || 'Sin placa'}
                                            </p>
                                            <p className="text-xs text-[#5a7390]">
                                                {row.driver_name || 'Sin conductor'}
                                                {row.provider
                                                    ? ` · ${row.provider}`
                                                    : ''}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                                                {row.ok} OK
                                            </span>
                                            <span
                                                className={cn(
                                                    'rounded-md px-2 py-0.5 text-xs font-semibold',
                                                    row.fail > 0
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-[#eef3f8] text-[#6b8ead]',
                                                )}
                                            >
                                                {row.fail} NO
                                            </span>
                                            <span
                                                className={cn(
                                                    'rounded-full px-2.5 py-1 text-xs font-semibold',
                                                    row.conforme
                                                        ? 'bg-emerald-50 text-emerald-800'
                                                        : 'bg-red-50 text-red-700',
                                                )}
                                            >
                                                {row.conforme
                                                    ? `Conforme ${row.reviewed_pass}`
                                                    : `Falta algo · ${row.reviewed_pass}`}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setOpenId(open ? null : row.id)
                                                }
                                                className="cursor-pointer text-xs font-medium text-[#2e5a9e] hover:underline"
                                            >
                                                {open ? 'Ocultar' : 'Ver ítems'}
                                            </button>
                                        </div>
                                    </div>
                                    {!open && missing.length > 0 ? (
                                        <p className="mt-2 text-xs text-red-700">
                                            Falta:{' '}
                                            {missing
                                                .map((item) =>
                                                    item.number
                                                        ? `${item.number}. ${item.label}`
                                                        : item.label,
                                                )
                                                .join(' · ')}
                                        </p>
                                    ) : null}
                                    {open ? (
                                        <ul className="mt-3 grid gap-1">
                                            {row.items.map((item, index) => (
                                                <li
                                                    key={`${row.id}-${index}`}
                                                    className="flex items-start justify-between gap-3 rounded-lg bg-[#f8fafc] px-2.5 py-1.5 text-xs"
                                                >
                                                    <span className="text-[#1a2b4c]">
                                                        {item.number
                                                            ? `${item.number}. `
                                                            : ''}
                                                        {item.label}
                                                    </span>
                                                    <span
                                                        className={cn(
                                                            'shrink-0 font-semibold',
                                                            item.value === 'yes' &&
                                                                'text-emerald-700',
                                                            item.value === 'no' &&
                                                                'text-red-700',
                                                            !item.value &&
                                                                'text-[#6b8ead]',
                                                        )}
                                                    >
                                                        {item.value === 'yes'
                                                            ? 'OK'
                                                            : item.value === 'no'
                                                              ? 'NO'
                                                              : '—'}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </article>
                            );
                        })}
                    </div>

                    {batch.can_sign ? (
                        <form
                            onSubmit={handleSubmit}
                            className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm sm:p-5"
                        >
                            <h2 className="text-sm font-semibold text-[#1a2b4c]">
                                Firma masiva
                            </h2>
                            <p className="mt-1 text-xs text-[#5a7390]">
                                Una firma se aplica a las {batch.total}{' '}
                                inspecciones de este paquete. No hace falta
                                firmar una por una.
                            </p>
                            <div className="mt-3 grid gap-1.5">
                                <Label className="text-xs text-[#1a2b4c]">
                                    Firma del coordinador
                                </Label>
                                <SignaturePad
                                    valueUrl={form.data.signature_data_url || null}
                                    onChange={(dataUrl) =>
                                        form.setData(
                                            'signature_data_url',
                                            dataUrl ?? '',
                                        )
                                    }
                                />
                                {form.errors.signature_data_url ? (
                                    <p className="text-xs text-red-600">
                                        {form.errors.signature_data_url}
                                    </p>
                                ) : null}
                            </div>
                            <div className="mt-4 flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={
                                        form.processing ||
                                        form.data.signature_data_url === ''
                                    }
                                    className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                                >
                                    {form.processing ? <Spinner /> : null}
                                    Firmar las {batch.total}
                                </Button>
                            </div>
                        </form>
                    ) : batch.status === 'signed' ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                            <p className="font-semibold">
                                Firmado por {batch.signer_name || 'el coordinador'}
                            </p>
                            <p className="mt-1 text-xs">
                                Esta firma cubre las {batch.total} inspecciones
                                del {formatDay(batch.inspected_on)}.
                            </p>
                            {batch.signature_url ? (
                                <img
                                    src={batch.signature_url}
                                    alt="Firma masiva"
                                    className="mt-3 h-16 rounded-md bg-white p-1"
                                />
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>
        </>
    );
}

InspectionBatchShowPage.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Paquetes', href: '/paquetes-inspeccion' },
        { title: 'Detalle', href: '/paquetes-inspeccion' },
    ],
};
