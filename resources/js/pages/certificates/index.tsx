import { Head, Link, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import {
    PlatformContentPanel,
    PlatformHero,
    PlatformPageShell,
    PlatformToolbar,
} from '@/components/platform';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';

type TemplateRow = {
    id: number;
    name: string;
    issuer_name: string;
    induction_title: string | null;
    session_on: string | null;
    certificates_count: number;
};

type PageProps = {
    templates: TemplateRow[];
};

export default function CertificatesIndex({ templates }: PageProps) {
    return (
        <>
            <Head title="Certificados" />
            <PlatformPageShell>
                <PlatformHero
                    eyebrow="Certificados · Emisión"
                    title="Plantillas de certificados"
                    description="Cada plantilla está ligada a una inducción. El fondo, los textos y la firma se arman aquí. El QR comprueba que esa persona recibió el certificado."
                    stats={[
                        {
                            label: 'Plantillas',
                            value: templates.length,
                            tone: 'navy',
                        },
                        {
                            label: 'Emitidos',
                            value: templates.reduce(
                                (sum, item) => sum + item.certificates_count,
                                0,
                            ),
                            tone: 'emerald',
                        },
                    ]}
                />

                <PlatformToolbar>
                    <Button
                        type="button"
                        size="sm"
                        asChild
                        className="cursor-pointer gap-1.5 rounded-xl bg-brand-500 text-white hover:bg-brand-600"
                    >
                        <Link href="/certificados/plantillas/nueva">
                            <Plus className="size-3.5" />
                            Nueva plantilla
                        </Link>
                    </Button>
                </PlatformToolbar>

                <PlatformContentPanel>
                    {templates.length === 0 ? (
                        <p className="px-4 py-10 text-center text-sm text-slate-500">
                            Todavía no hay plantillas.
                        </p>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">
                                        Plantilla
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Inducción
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Firma
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Emitidos
                                    </th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {templates.map((template) => (
                                    <tr
                                        key={template.id}
                                        className="border-t border-slate-100"
                                    >
                                        <td className="px-4 py-3 font-medium text-brand-800">
                                            {template.name}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {template.induction_title || '—'}
                                            {template.session_on ? (
                                                <span className="block text-xs text-slate-400">
                                                    {template.session_on}
                                                </span>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {template.issuer_name}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {template.certificates_count}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.visit(
                                                        `/certificados/plantillas/${template.id}`,
                                                    )
                                                }
                                                className="cursor-pointer text-sm font-medium text-brand-500 hover:underline"
                                            >
                                                Editar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </PlatformContentPanel>
            </PlatformPageShell>
        </>
    );
}

CertificatesIndex.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Certificados', href: '/certificados' },
        { title: 'Plantillas', href: '/certificados' },
    ],
};
