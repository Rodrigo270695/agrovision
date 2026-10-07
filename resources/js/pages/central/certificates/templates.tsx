import { Head, Link, router } from '@inertiajs/react';
import { Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TemplateRow = {
    id: number;
    name: string;
    course_title: string;
    expires_on: string | null;
    training: string | null;
    certificates_count: number;
};

type Props = {
    templates: TemplateRow[];
};

export default function CentralTemplates({ templates }: Props) {
    return (
        <>
            <Head title="Plantillas" />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold tracking-wide text-[#5a7390] uppercase">Certificado</p>
                        <h1 className="text-2xl font-semibold text-[#1a2b4c]">Plantilla</h1>
                        <p className="mt-1 text-sm text-[#5a7390]">
                            Diseña el certificado y descárgalo para los participantes de la capacitación amarrada.
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/plataforma/certificados/plantillas/nueva">
                            <Plus className="size-4" />
                            Nueva plantilla
                        </Link>
                    </Button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[#d7e3f0] bg-white">
                    <table className="w-full text-left text-sm">
                        <thead className="text-[#5a7390]">
                            <tr>
                                <th className="px-4 py-3 font-medium">Plantilla</th>
                                <th className="px-4 py-3 font-medium">Curso</th>
                                <th className="px-4 py-3 font-medium">Participantes</th>
                                <th className="px-4 py-3 font-medium">Vence</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {templates.map((template) => (
                                <tr key={template.id} className="border-t border-[#e6eef6]">
                                    <td className="px-4 py-3 text-[#1a2b4c]">{template.name}</td>
                                    <td className="px-4 py-3 text-[#1a2b4c]">{template.course_title}</td>
                                    <td className="px-4 py-3 text-[#1a2b4c]">{template.training ?? 'Sin amarrar'}</td>
                                    <td className="px-4 py-3 text-[#1a2b4c]">{template.expires_on ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/plataforma/certificados/plantillas/${template.id}/editar`}>
                                                    <Pencil className="size-4" />
                                                    Editar
                                                </Link>
                                            </Button>
                                            <Button variant="outline" size="sm" asChild>
                                                <a href={`/plataforma/certificados/plantillas/${template.id}/descargar`}>
                                                    <Download className="size-4" />
                                                    ZIP
                                                </a>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    if (confirm(`¿Eliminar la plantilla “${template.name}”?`)) {
                                                        router.delete(`/plataforma/certificados/plantillas/${template.id}`);
                                                    }
                                                }}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {templates.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-[#5a7390]">
                                        Todavía no hay plantillas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

CentralTemplates.layout = {
    breadcrumbs: [
        { title: 'Panel', href: '/plataforma' },
        { title: 'Certificado', href: '/plataforma/certificados/plantillas' },
        { title: 'Plantilla', href: '/plataforma/certificados/plantillas' },
    ],
};
