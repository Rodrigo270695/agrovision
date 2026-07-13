import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ClipboardCheck,
    Plus,
    RefreshCw,
    Search,
    Truck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';

type Template = {
    id: string;
    code: string;
    short_code: string;
    name: string;
};

type InspectionCard = {
    id: string;
    plate: string;
    driver: string | null;
    company: string | null;
    location: string | null;
    status: string;
    type: string | null;
    code: string | null;
    first_result: string | null;
    second_result: string | null;
    first_at: string | null;
    created_at: string | null;
    can_reinspect: boolean;
};

type Paginated<T> = {
    data: T[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    total: number;
};

type Props = {
    templates: Template[];
    inspections: Paginated<InspectionCard>;
    pendingReinspections: InspectionCard[];
    filters: {
        q: string;
        type: string;
        estado: string;
        resultado: string;
    };
};

function formatDate(value: string | null): string {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleString('es-PE', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function ResultPill({ value }: { value: string | null }) {
    if (!value) {
        return (
            <span className="text-xs text-neutral-400">Sin resultado</span>
        );
    }

    const approved = value === 'aprobado';

    return (
        <Badge
            className={cn(
                'border-0 capitalize',
                approved
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800',
            )}
        >
            {value}
        </Badge>
    );
}

function InspectionListCard({ item }: { item: InspectionCard }) {
    return (
        <article className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="font-mono text-xl font-bold tracking-wide text-[#1f4d34]">
                        {item.plate}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                        {item.driver ?? 'Sin conductor'} ·{' '}
                        {item.company ?? 'Sin empresa'}
                    </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                    {item.type ?? 'SST'}
                </Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                    <p className="text-xs text-neutral-500">1ra inspección</p>
                    <div className="mt-1">
                        <ResultPill value={item.first_result} />
                    </div>
                    <p className="mt-1 text-xs text-neutral-400">
                        {formatDate(item.first_at)}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-neutral-500">2da inspección</p>
                    <div className="mt-1">
                        {item.can_reinspect ? (
                            <Badge className="border-0 bg-amber-100 text-amber-900">
                                Pendiente
                            </Badge>
                        ) : (
                            <ResultPill value={item.second_result} />
                        )}
                    </div>
                </div>
            </div>

            {item.can_reinspect ? (
                <Button asChild className="mt-4 h-11 w-full bg-[#1f4d34] hover:bg-[#163828]">
                    <Link href={`/inspecciones/${item.id}/reinspeccion`}>
                        <RefreshCw className="size-4" />
                        Continuar 2da inspección
                    </Link>
                </Button>
            ) : (
                <p className="mt-4 text-xs text-neutral-500">
                    Estado: <span className="capitalize">{item.status.replaceAll('_', ' ')}</span>
                </p>
            )}
        </article>
    );
}

export default function InspectionsIndex({
    templates,
    inspections,
    pendingReinspections,
    filters,
}: Props) {
    const { flash } = usePage<{ flash?: { success?: string } }>().props;
    const [q, setQ] = useState(filters.q);
    const [type, setType] = useState(filters.type);
    const [estado, setEstado] = useState(filters.estado);
    const [resultado, setResultado] = useState(filters.resultado);
    const [booted, setBooted] = useState(false);

    useEffect(() => {
        setBooted(true);
    }, []);

    useEffect(() => {
        if (!booted) {
            return;
        }

        const timeout = setTimeout(() => {
            router.get(
                '/inspecciones',
                {
                    q: q || undefined,
                    type: type || undefined,
                    estado: estado || undefined,
                    resultado: resultado || undefined,
                },
                {
                    preserveState: true,
                    replace: true,
                    preserveScroll: true,
                },
            );
        }, 350);

        return () => clearTimeout(timeout);
    }, [q, type, estado, resultado, booted]);

    return (
        <>
            <Head title="Checklists SST" />

            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 p-4 pb-24 md:p-6">
                {flash?.success ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {flash.success}
                    </div>
                ) : null}

                <header className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                        Checklists SST
                    </h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Busca por placa, conductor o empresa. La 1ra inspección
                        se guarda primero; si sale desaprobada, retómalo luego
                        para la 2da.
                    </p>
                </header>

                <section className="sticky top-0 z-10 -mx-4 space-y-3 border-b border-neutral-200/80 bg-[#f8faf7]/px-4 py-3 backdrop-blur md:static md:mx-0 md:rounded-2xl md:border md:bg-white md:p-4 dark:border-neutral-800 dark:bg-neutral-950">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
                        <Input
                            value={q}
                            onChange={(e) => setQ(e.target.value.toUpperCase())}
                            placeholder="Buscar placa, conductor, empresa..."
                            className="h-12 rounded-xl border-neutral-300 bg-white pl-10 text-base font-medium tracking-wide"
                            inputMode="search"
                            autoComplete="off"
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {[
                            { value: '', label: 'Todos' },
                            { value: 'TDP', label: 'TDP' },
                            { value: 'TDC', label: 'TDC' },
                        ].map((option) => (
                            <button
                                key={option.value || 'all'}
                                type="button"
                                onClick={() => setType(option.value)}
                                className={cn(
                                    'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium',
                                    type === option.value
                                        ? 'bg-[#1f4d34] text-white'
                                        : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300',
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() =>
                                setEstado(
                                    estado === 'pendiente_reinspeccion'
                                        ? ''
                                        : 'pendiente_reinspeccion',
                                )
                            }
                            className={cn(
                                'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium',
                                estado === 'pendiente_reinspeccion'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900',
                            )}
                        >
                            Pendientes 2da
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                setResultado(
                                    resultado === 'desaprobado'
                                        ? ''
                                        : 'desaprobado',
                                )
                            }
                            className={cn(
                                'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium',
                                resultado === 'desaprobado'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900',
                            )}
                        >
                            Desaprobados
                        </button>
                    </div>
                </section>

                <section className="grid gap-3 sm:grid-cols-2">
                    {templates.map((template) => {
                        const isTdp = template.short_code === 'TDP';

                        return (
                            <Link
                                key={template.id}
                                href={`/inspecciones/${template.short_code.toLowerCase()}/nueva`}
                                className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition active:scale-[0.99] dark:border-neutral-800 dark:bg-neutral-950"
                            >
                                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#1f4d34] text-white">
                                    {isTdp ? (
                                        <Truck className="size-5" />
                                    ) : (
                                        <ClipboardCheck className="size-5" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold">
                                        Nueva {template.short_code}
                                    </p>
                                    <p className="truncate text-sm text-neutral-500">
                                        1ra inspección · {template.code}
                                    </p>
                                </div>
                                <Plus className="size-5 text-[#1f4d34]" />
                            </Link>
                        );
                    })}
                </section>

                {pendingReinspections.length > 0 && !filters.q ? (
                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold tracking-wide text-amber-800 uppercase">
                                Listas para 2da inspección
                            </h2>
                            <span className="text-xs text-amber-700">
                                {pendingReinspections.length}
                            </span>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            {pendingReinspections.map((item) => (
                                <InspectionListCard key={item.id} item={item} />
                            ))}
                        </div>
                    </section>
                ) : null}

                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold tracking-wide text-neutral-600 uppercase">
                            {filters.q
                                ? `Resultados para “${filters.q}”`
                                : 'Historial'}
                        </h2>
                        <span className="text-xs text-neutral-500">
                            {inspections.total} registro
                            {inspections.total === 1 ? '' : 's'}
                        </span>
                    </div>

                    {inspections.data.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
                            <p className="font-medium">Sin resultados</p>
                            <p className="mt-1 text-sm text-neutral-500">
                                Prueba otra placa o crea una nueva 1ra
                                inspección.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {inspections.data.map((item) => (
                                <InspectionListCard key={item.id} item={item} />
                            ))}
                        </div>
                    )}

                    {inspections.links.length > 3 ? (
                        <div className="flex flex-wrap justify-center gap-2 pt-2">
                            {inspections.links.map((link, index) => (
                                <Button
                                    key={`${link.label}-${index}`}
                                    type="button"
                                    size="sm"
                                    variant={link.active ? 'default' : 'outline'}
                                    disabled={!link.url}
                                    className={cn(
                                        link.active && 'bg-[#1f4d34]',
                                    )}
                                    onClick={() =>
                                        link.url &&
                                        router.visit(link.url, {
                                            preserveScroll: true,
                                            preserveState: true,
                                        })
                                    }
                                    dangerouslySetInnerHTML={{
                                        __html: link.label,
                                    }}
                                />
                            ))}
                        </div>
                    ) : null}
                </section>
            </div>
        </>
    );
}

InspectionsIndex.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Checklists SST', href: '/inspecciones' },
    ],
};
