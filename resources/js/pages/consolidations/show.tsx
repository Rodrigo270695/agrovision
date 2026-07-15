import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { FormEvent } from 'react';
import { SignaturePad } from '@/components/checklists/signature-pad';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { dashboard } from '@/routes';
import { cn } from '@/lib/utils';

type ChecklistShow = {
    id: number;
    plate_number: string;
    driver_name: string | null;
    provider: string | null;
    first_result: string | null;
    second_result: string | null;
    coordinator_status: 'observed' | 'reviewed' | null;
    sent_to_coordinator_at: string | null;
    coordinator_action_plan: string | null;
    coordinator_signer_name: string | null;
    coordinator_signature_url: string | null;
    coordinator_signed_at: string | null;
    can_respond: boolean;
    period?: { id: number; name: string } | null;
    template?: { id: number; type: string; code: string; name: string } | null;
};

type PageProps = {
    checklist: ChecklistShow;
};

export default function ConsolidationShowPage() {
    const { checklist } = usePage().props as unknown as PageProps;
    const form = useForm({
        coordinator_signer_name: checklist.coordinator_signer_name ?? '',
        coordinator_action_plan: checklist.coordinator_action_plan ?? '',
        signature_data_url: '' as string,
    });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!checklist.can_respond || form.processing) {
            return;
        }

        form.post(`/consolidados/${checklist.id}/responder`, {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head
                title={`Consolidado ${checklist.plate_number}`}
            />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="mx-auto w-full max-w-5xl space-y-4">
                    <div className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm sm:p-5">
                        <Link
                            href="/consolidados"
                            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-[#2e5a9e] hover:underline"
                        >
                            <ArrowLeft className="size-3.5" />
                            Volver a consolidados
                        </Link>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h1 className="text-xl font-semibold text-[#1a2b4c]">
                                    Consolidado {checklist.plate_number}
                                </h1>
                                <p className="text-sm text-[#5a7390]">
                                    {(checklist.template?.type ?? '').toUpperCase()}{' '}
                                    · {checklist.period?.name ?? 'Periodo'} ·{' '}
                                    {checklist.driver_name || 'Sin conductor'}
                                </p>
                            </div>
                            <span
                                className={cn(
                                    'inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium',
                                    checklist.coordinator_status === 'reviewed'
                                        ? 'bg-violet-50 text-violet-800'
                                        : 'bg-amber-50 text-amber-800',
                                )}
                            >
                                {checklist.coordinator_status === 'reviewed'
                                    ? 'Revisado'
                                    : 'Observado'}
                            </span>
                        </div>
                        <div className="mt-3">
                            <Button
                                type="button"
                                variant="outline"
                                asChild
                                className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                            >
                                <a
                                    href={`/inspecciones/${checklist.id}/pdf`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Ver PDF consolidado
                                </a>
                            </Button>
                        </div>
                    </div>

                    {checklist.can_respond ? (
                        <form
                            onSubmit={handleSubmit}
                            className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm sm:p-5"
                        >
                            <h2 className="text-sm font-semibold text-[#1a2b4c]">
                                Recibido y plan de acción
                            </h2>
                            <p className="mt-1 text-xs text-[#5a7390]">
                                Firma el recibido, describe el descargo / plan de
                                acción y envía la respuesta. El consolidado
                                pasará a estado Revisado.
                            </p>

                            <div className="mt-4 grid gap-3">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-[#1a2b4c]">
                                        Nombre de quien recibe{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        value={form.data.coordinator_signer_name}
                                        onChange={(e) =>
                                            form.setData(
                                                'coordinator_signer_name',
                                                e.target.value,
                                            )
                                        }
                                        className="h-9 border-[#c5d5e6]"
                                    />
                                    {form.errors.coordinator_signer_name ? (
                                        <p className="text-xs text-red-600">
                                            {form.errors.coordinator_signer_name}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-[#1a2b4c]">
                                        Plan de acción / descargo{' '}
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
                                        placeholder="Describe el plan de acción, descargo y acuerdos..."
                                    />
                                    {form.errors.coordinator_action_plan ? (
                                        <p className="text-xs text-red-600">
                                            {form.errors.coordinator_action_plan}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-[#1a2b4c]">
                                        Firma de recibido{' '}
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

                            <div className="mt-4 flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.visit('/consolidados')}
                                    className="cursor-pointer border-[#c5d5e6]"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={
                                        form.processing ||
                                        !form.data.coordinator_signer_name.trim() ||
                                        !form.data.coordinator_action_plan.trim() ||
                                        !form.data.signature_data_url
                                    }
                                    className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038] disabled:opacity-50"
                                >
                                    {form.processing ? <Spinner /> : null}
                                    Enviar respuesta
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <div className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm sm:p-5">
                            <h2 className="text-sm font-semibold text-[#1a2b4c]">
                                Respuesta del coordinador
                            </h2>
                            <p className="mt-2 text-sm text-[#1a2b4c]">
                                <strong>Recibido por:</strong>{' '}
                                {checklist.coordinator_signer_name || '—'}
                            </p>
                            {checklist.coordinator_signed_at ? (
                                <p className="text-xs text-[#5a7390]">
                                    Firmado: {checklist.coordinator_signed_at}
                                </p>
                            ) : null}
                            <p className="mt-3 whitespace-pre-wrap text-sm text-[#1a2b4c]">
                                {checklist.coordinator_action_plan ||
                                    'Sin plan de acción.'}
                            </p>
                            {checklist.coordinator_signature_url ? (
                                <img
                                    src={checklist.coordinator_signature_url}
                                    alt="Firma"
                                    className="mt-3 max-h-24 rounded border border-[#e2eaf3] bg-white"
                                />
                            ) : null}
                            <p className="mt-3 text-xs text-violet-700">
                                Estado Revisado: ya se puede continuar con la 2da
                                inspección en Inspecciones.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

ConsolidationShowPage.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Consolidados', href: '/consolidados' },
        { title: 'Detalle', href: '#' },
    ],
};
