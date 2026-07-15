import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, FileDown, Plus } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlcoholTestFormModal } from '@/components/alcohol-tests/alcohol-test-form-modal';
import type { UnitOption } from '@/components/alcohol-tests/alcohol-tests-table';
import { SignaturePad } from '@/components/checklists/signature-pad';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useCan } from '@/hooks/use-can';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';

type PackageInfo = {
    id: number;
    title: string;
    session_date?: string | null;
    notes?: string | null;
    creator?: { id: number; name: string } | null;
};

type TestItem = {
    id: number;
    tested_at?: string | null;
    driver_name: string;
    driver_dni?: string | null;
    plate_number?: string | null;
    alcohol_level: number;
    is_positive: boolean;
    location?: string | null;
    notes?: string | null;
    coordinator_status?: string | null;
    coordinator_action_plan?: string | null;
    coordinator_signer_name?: string | null;
    coordinator_signature_url?: string | null;
    coordinator_signed_at?: string | null;
    can_respond: boolean;
    coordinator?: { id: number; name: string } | null;
};

type Stats = {
    total: number;
    positive: number;
    pending: number;
    acknowledged: number;
};

type PageProps = {
    package: PackageInfo;
    tests: TestItem[];
    stats: Stats;
    unitOptions: UnitOption[];
    focusTestId?: number | null;
    isCoordinatorView?: boolean;
    auth: {
        user: { id: number; name: string; email: string } | null;
    };
};

function formatDate(value?: string | null): string {
    if (!value) {
        return '—';
    }

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export default function AlcoholPackageShowPage() {
    const { package: pkg, tests, stats, unitOptions, focusTestId, auth, isCoordinatorView } =
        usePage().props as unknown as PageProps;
    const { can } = useCan();
    const [testOpen, setTestOpen] = useState(false);
    const [responding, setResponding] = useState<TestItem | null>(null);
    const coordinatorView = Boolean(isCoordinatorView);

    const focusTest = useMemo(
        () =>
            focusTestId
                ? (tests.find((item) => item.id === focusTestId) ?? null)
                : null,
        [focusTestId, tests],
    );

    useEffect(() => {
        if (focusTest?.can_respond) {
            setResponding(focusTest);
        }
    }, [focusTest]);

    const form = useForm({
        coordinator_signer_name: auth.user?.name?.trim() || '',
        coordinator_action_plan: '',
        signature_data_url: '' as string,
    });

    useEffect(() => {
        if (!responding) {
            return;
        }

        form.setData({
            coordinator_signer_name:
                responding.coordinator_signer_name?.trim() ||
                auth.user?.name?.trim() ||
                '',
            coordinator_action_plan: responding.coordinator_action_plan ?? '',
            signature_data_url: '',
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [responding?.id]);

    const handleRespond = (event: FormEvent) => {
        event.preventDefault();

        if (!responding || form.processing) {
            return;
        }

        form.post(`/alcoholimetro/tests/${responding.id}/responder`, {
            preserveScroll: true,
            onSuccess: () => setResponding(null),
        });
    };

    return (
        <>
            <Head title={`${pkg.title} · Alcohómetro`} />
            <div className="flex flex-col gap-4 p-4">
                <div className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm sm:p-5">
                    <Link
                        href="/alcoholimetro"
                        className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-[#2e5a9e] hover:underline"
                    >
                        <ArrowLeft className="size-3.5" />
                        Volver a paquetes
                    </Link>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-[#1a2b4c]">
                                {pkg.title}
                            </h1>
                            <p className="mt-1 text-sm text-[#5a7390]">
                                Fecha operativo: {formatDate(pkg.session_date)}
                                {pkg.creator?.name
                                    ? ` · ${pkg.creator.name}`
                                    : ''}
                            </p>
                            {pkg.notes ? (
                                <p className="mt-2 text-xs text-[#6b8ead]">
                                    {pkg.notes}
                                </p>
                            ) : null}
                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full bg-[#eef4fb] px-2.5 py-1 text-xs font-medium text-[#1a2b4c]">
                                    {coordinatorView ? 'Tus tests' : 'Tests'}{' '}
                                    {stats.total}
                                </span>
                                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800">
                                    {coordinatorView
                                        ? `No pasaron ${stats.positive}`
                                        : `Positivos ${stats.positive}`}
                                </span>
                                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                                    Pendientes {stats.pending}
                                </span>
                            </div>
                            {coordinatorView && stats.positive > 0 ? (
                                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                                    De tus unidades,{' '}
                                    <strong>
                                        {stats.positive} conductor
                                        {stats.positive === 1 ? '' : 'es'} no
                                        pasaron
                                    </strong>{' '}
                                    el test de alcohómetro
                                    {stats.pending > 0
                                        ? ` · ${stats.pending} pendiente${stats.pending === 1 ? '' : 's'} de firmar`
                                        : ''}
                                    .
                                </p>
                            ) : null}
                            {coordinatorView && stats.positive === 0 ? (
                                <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                                    En este operativo, ninguno de tus
                                    conductores dio positivo.
                                </p>
                            ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                asChild
                                className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                            >
                                <a
                                    href={`/alcoholimetro/${pkg.id}/pdf`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <FileDown className="size-4" />
                                    PDF del paquete
                                </a>
                            </Button>
                            {can('alcoholtests.create') && !coordinatorView ? (
                                <Button
                                    type="button"
                                    onClick={() => setTestOpen(true)}
                                    className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                                >
                                    <Plus className="size-4" />
                                    Nuevo test
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[#d7e3f0] bg-white shadow-sm">
                    <div className="hidden overflow-x-auto md:block">
                        <table className="min-w-full text-left text-xs">
                            <thead className="bg-[#1a2b4c] text-white">
                                <tr>
                                    <th className="px-3 py-2 font-semibold">
                                        Conductor
                                    </th>
                                    <th className="px-3 py-2 font-semibold">
                                        Placa
                                    </th>
                                    <th className="px-3 py-2 font-semibold">
                                        Nivel %
                                    </th>
                                    <th className="px-3 py-2 font-semibold">
                                        Resultado
                                    </th>
                                    <th className="px-3 py-2 font-semibold">
                                        Acta
                                    </th>
                                    <th className="w-36 px-3 py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {tests.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-3 py-10 text-center text-[#6b8ead]"
                                        >
                                            Aún no hay tests
                                            {coordinatorView
                                                ? ' de tus unidades en este paquete.'
                                                : ' en este paquete.'}
                                        </td>
                                    </tr>
                                ) : (
                                    tests.map((item, index) => (
                                        <tr
                                            key={item.id}
                                            className={cn(
                                                'border-b border-[#eef2f7]',
                                                index % 2 === 1 &&
                                                    'bg-[#f8fafc]',
                                            )}
                                        >
                                            <td className="px-3 py-2">
                                                <div className="font-medium text-[#1a2b4c]">
                                                    {item.driver_name}
                                                </div>
                                                <div className="text-[#5a7390]">
                                                    {item.driver_dni || '—'}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-[#5a7390]">
                                                {item.plate_number || '—'}
                                            </td>
                                            <td className="px-3 py-2 font-semibold text-[#1a2b4c]">
                                                {item.alcohol_level.toFixed(3)}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span
                                                    className={cn(
                                                        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                                                        item.is_positive
                                                            ? 'bg-red-50 text-red-800'
                                                            : 'bg-emerald-50 text-emerald-800',
                                                    )}
                                                >
                                                    {item.is_positive
                                                        ? 'Positivo'
                                                        : 'Negativo'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-[#5a7390]">
                                                {!item.is_positive
                                                    ? '—'
                                                    : item.coordinator_status ===
                                                        'acknowledged'
                                                      ? 'Firmada'
                                                      : 'Pendiente'}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                        className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                                                    >
                                                        <a
                                                            href={`/alcoholimetro/tests/${item.id}/pdf`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            PDF
                                                        </a>
                                                    </Button>
                                                    {item.can_respond ? (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={() =>
                                                                setResponding(
                                                                    item,
                                                                )
                                                            }
                                                            className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                                                        >
                                                            Firmar
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
                        {tests.length === 0 ? (
                            <p className="py-8 text-center text-sm text-[#6b8ead]">
                                Aún no hay tests
                                {coordinatorView
                                    ? ' de tus unidades en este paquete.'
                                    : ' en este paquete.'}
                            </p>
                        ) : (
                            tests.map((item) => (
                                <article
                                    key={item.id}
                                    className="rounded-xl border border-[#e2eaf3] p-3.5"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="text-sm font-semibold text-[#1a2b4c]">
                                                {item.driver_name}
                                            </h3>
                                            <p className="text-xs text-[#5a7390]">
                                                {item.plate_number ||
                                                    'Sin placa'}{' '}
                                                · {item.alcohol_level.toFixed(3)}
                                                %
                                            </p>
                                        </div>
                                        <span
                                            className={cn(
                                                'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                                                item.is_positive
                                                    ? 'bg-red-50 text-red-800'
                                                    : 'bg-emerald-50 text-emerald-800',
                                            )}
                                        >
                                            {item.is_positive
                                                ? 'Positivo'
                                                : 'Negativo'}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex justify-end gap-1 border-t border-[#eef2f7] pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            asChild
                                            className="cursor-pointer border-[#c5d5e6]"
                                        >
                                            <a
                                                href={`/alcoholimetro/tests/${item.id}/pdf`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                PDF
                                            </a>
                                        </Button>
                                        {item.can_respond ? (
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={() =>
                                                    setResponding(item)
                                                }
                                                className="cursor-pointer bg-[#1a2b4c] text-white"
                                            >
                                                Firmar
                                            </Button>
                                        ) : null}
                                    </div>
                                </article>
                            ))
                        )}
                    </div>
                </div>

                {responding ? (
                    <form
                        onSubmit={handleRespond}
                        className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm sm:p-5"
                    >
                        <h2 className="text-sm font-semibold text-[#1a2b4c]">
                            Firmar acta · {responding.driver_name}
                        </h2>
                        <p className="mt-1 text-xs text-[#5a7390]">
                            Nivel {responding.alcohol_level.toFixed(3)}% —
                            tolerancia 0. Confirma medidas y firma.
                        </p>
                        <div className="mt-4 grid gap-3">
                            <div className="grid gap-1.5">
                                <Label className="text-xs text-[#1a2b4c]">
                                    Quien firma
                                </Label>
                                <Input
                                    value={form.data.coordinator_signer_name}
                                    readOnly
                                    className="h-9 border-[#c5d5e6] bg-[#f8fafc]"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs text-[#1a2b4c]">
                                    Medidas / plan de acción *
                                </Label>
                                <Textarea
                                    value={form.data.coordinator_action_plan}
                                    onChange={(e) =>
                                        form.setData(
                                            'coordinator_action_plan',
                                            e.target.value,
                                        )
                                    }
                                    rows={4}
                                    className="border-[#c5d5e6]"
                                    placeholder="No se permite el ingreso. Conductor retirado..."
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs text-[#1a2b4c]">
                                    Firma *
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
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setResponding(null)}
                                className="cursor-pointer border-[#c5d5e6]"
                            >
                                Cancelar
                            </Button>
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
                ) : null}
            </div>

            {can('alcoholtests.create') && !coordinatorView ? (
                <AlcoholTestFormModal
                    open={testOpen}
                    packageId={pkg.id}
                    unitOptions={unitOptions ?? []}
                    onClose={() => setTestOpen(false)}
                />
            ) : null}
        </>
    );
}

AlcoholPackageShowPage.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Alcohómetro', href: '/alcoholimetro' },
        { title: 'Paquete', href: '#' },
    ],
};
