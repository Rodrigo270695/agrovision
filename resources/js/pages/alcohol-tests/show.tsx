import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, FileDown } from 'lucide-react';
import type { FormEvent } from 'react';
import { SignaturePad } from '@/components/checklists/signature-pad';
import type { AlcoholTestItem } from '@/components/alcohol-tests/alcohol-tests-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { dashboard } from '@/routes';
import { cn } from '@/lib/utils';

type AlcoholTestShow = AlcoholTestItem & {
    location?: string | null;
    notes?: string | null;
    coordinator_action_plan?: string | null;
    coordinator_signer_name?: string | null;
    coordinator_signature_url?: string | null;
    coordinator_signed_at?: string | null;
    coordinator_notified_at?: string | null;
    can_respond: boolean;
    creator?: { id: number; name: string } | null;
    coordinator?: { id: number; name: string } | null;
};

type PageProps = {
    test: AlcoholTestShow;
    auth: {
        user: { id: number; name: string; email: string } | null;
    };
};

function formatDateTime(value?: string | null): string {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleString('es-PE', { timeZone: 'America/Lima' });
}

export default function AlcoholTestShowPage() {
    const { test, auth } = usePage().props as unknown as PageProps;
    const form = useForm({
        coordinator_signer_name:
            test.coordinator_signer_name?.trim() ||
            auth.user?.name?.trim() ||
            '',
        coordinator_action_plan: test.coordinator_action_plan ?? '',
        signature_data_url: '' as string,
    });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!test.can_respond || form.processing) {
            return;
        }

        form.post(`/alcoholimetro/${test.id}/responder`, {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title={`Alcohómetro · ${test.driver_name}`} />
            <div className="flex flex-col gap-4 p-4">
                <div className="mx-auto w-full max-w-5xl space-y-4">
                    <div className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm sm:p-5">
                        <Link
                            href="/alcoholimetro"
                            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-[#2e5a9e] hover:underline"
                        >
                            <ArrowLeft className="size-3.5" />
                            Volver a alcohómetro
                        </Link>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h1 className="text-xl font-semibold text-[#1a2b4c]">
                                    {test.driver_name}
                                </h1>
                                <p className="text-sm text-[#5a7390]">
                                    {test.plate_number || 'Sin placa'} ·{' '}
                                    {formatDateTime(test.tested_at)} · Nivel{' '}
                                    {test.alcohol_level.toFixed(3)}%
                                </p>
                            </div>
                            <span
                                className={cn(
                                    'inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium',
                                    test.is_positive
                                        ? 'bg-red-50 text-red-800'
                                        : 'bg-emerald-50 text-emerald-800',
                                )}
                            >
                                {test.is_positive ? 'Positivo' : 'Negativo'}
                            </span>
                        </div>

                        {test.is_positive ? (
                            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                                Tolerancia 0. No permitir el ingreso al área
                                hasta disposición del coordinador.
                            </p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                asChild
                                className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                            >
                                <a
                                    href={`/alcoholimetro/${test.id}/pdf`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <FileDown className="size-4" />
                                    Descargar PDF / acta
                                </a>
                            </Button>
                        </div>

                        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-[11px] text-[#6b8ead]">
                                    DNI
                                </dt>
                                <dd className="text-[#1a2b4c]">
                                    {test.driver_dni || '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-[11px] text-[#6b8ead]">
                                    Lugar
                                </dt>
                                <dd className="text-[#1a2b4c]">
                                    {test.location || '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-[11px] text-[#6b8ead]">
                                    Registrado por
                                </dt>
                                <dd className="text-[#1a2b4c]">
                                    {test.creator?.name || '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-[11px] text-[#6b8ead]">
                                    Coordinador
                                </dt>
                                <dd className="text-[#1a2b4c]">
                                    {test.coordinator?.name || '—'}
                                </dd>
                            </div>
                            {test.notes ? (
                                <div className="sm:col-span-2">
                                    <dt className="text-[11px] text-[#6b8ead]">
                                        Notas
                                    </dt>
                                    <dd className="text-[#1a2b4c]">
                                        {test.notes}
                                    </dd>
                                </div>
                            ) : null}
                        </dl>
                    </div>

                    {test.can_respond ? (
                        <form
                            onSubmit={handleSubmit}
                            className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm sm:p-5"
                        >
                            <h2 className="text-sm font-semibold text-[#1a2b4c]">
                                Acta del coordinador
                            </h2>
                            <p className="mt-1 text-xs text-[#5a7390]">
                                Confirma las medidas (no ingreso, retiro,
                                etc.), firma el acta y descarga el PDF para
                                gerencia.
                            </p>

                            <div className="mt-4 grid gap-3">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-[#1a2b4c]">
                                        Nombre de quien firma{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        value={form.data.coordinator_signer_name}
                                        readOnly
                                        className="h-9 border-[#c5d5e6] bg-[#f8fafc] text-[#1a2b4c]"
                                    />
                                </div>

                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-[#1a2b4c]">
                                        Medidas / plan de acción{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Textarea
                                        value={form.data.coordinator_action_plan}
                                        onChange={(e) =>
                                            form.setData(
                                                'coordinator_action_plan',
                                                e.target.value,
                                            )
                                        }
                                        rows={5}
                                        className="border-[#c5d5e6]"
                                        placeholder="Ej.: No se permite el ingreso. Conductor retirado y notificado a gerencia..."
                                    />
                                    {form.errors.coordinator_action_plan ? (
                                        <p className="text-xs text-red-600">
                                            {
                                                form.errors
                                                    .coordinator_action_plan
                                            }
                                        </p>
                                    ) : null}
                                </div>

                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-[#1a2b4c]">
                                        Firma{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <SignaturePad
                                        valueUrl={
                                            form.data.signature_data_url || null
                                        }
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
                            </div>

                            <div className="mt-4 flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={form.processing}
                                    className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                                >
                                    {form.processing ? <Spinner /> : null}
                                    Firmar acta
                                </Button>
                            </div>
                        </form>
                    ) : test.coordinator_status === 'acknowledged' ? (
                        <div className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm sm:p-5">
                            <h2 className="text-sm font-semibold text-[#1a2b4c]">
                                Acta firmada
                            </h2>
                            <p className="mt-2 text-sm text-[#5a7390]">
                                {test.coordinator_action_plan}
                            </p>
                            {test.coordinator_signature_url ? (
                                <img
                                    src={test.coordinator_signature_url}
                                    alt="Firma coordinador"
                                    className="mt-3 h-16 rounded border border-[#e2eaf3] bg-white object-contain"
                                />
                            ) : null}
                            <p className="mt-2 text-xs text-[#6b8ead]">
                                Firmó {test.coordinator_signer_name} ·{' '}
                                {formatDateTime(test.coordinator_signed_at)}
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>
        </>
    );
}

AlcoholTestShowPage.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Alcohómetro', href: '/alcoholimetro' },
        { title: 'Detalle', href: '#' },
    ],
};
