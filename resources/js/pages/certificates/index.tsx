import { Head, Link, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
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
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-[#1a2b4c]">
                            Plantillas de certificados
                        </h1>
                        <p className="mt-1 text-sm text-[#5a7390]">
                            Cada plantilla está ligada a una inducción. El
                            fondo, los textos y la firma se arman aquí. El QR
                            comprueba que esa persona recibió el certificado.
                        </p>
                    </div>
                    <Button
                        type="button"
                        asChild
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                    >
                        <Link href="/certificados/plantillas/nueva">
                            <Plus className="size-4" />
                            Nueva plantilla
                        </Link>
                    </Button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[#d7e3f0] bg-white shadow-sm">
                    {templates.length === 0 ? (
                        <p className="px-4 py-10 text-center text-sm text-[#5a7390]">
                            Todavía no hay plantillas.
                        </p>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#f8fafc] text-xs uppercase tracking-wide text-[#6b8ead]">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Plantilla</th>
                                    <th className="px-4 py-3 font-semibold">Inducción</th>
                                    <th className="px-4 py-3 font-semibold">Firma</th>
                                    <th className="px-4 py-3 font-semibold">Emitidos</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {templates.map((template) => (
                                    <tr key={template.id} className="border-t border-[#e2eaf3]">
                                        <td className="px-4 py-3 font-medium text-[#1a2b4c]">
                                            {template.name}
                                        </td>
                                        <td className="px-4 py-3 text-[#3d5166]">
                                            {template.induction_title || '—'}
                                            {template.session_on ? (
                                                <span className="block text-xs text-[#6b8ead]">
                                                    {template.session_on}
                                                </span>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3 text-[#3d5166]">
                                            {template.issuer_name}
                                        </td>
                                        <td className="px-4 py-3 text-[#3d5166]">
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
                                                className="cursor-pointer text-sm font-medium text-[#2e5a9e] hover:underline"
                                            >
                                                Editar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
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
