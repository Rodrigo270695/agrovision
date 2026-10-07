import { Head, router } from '@inertiajs/react';
import { Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Training = {
    id: number;
    name: string;
    participants_count: number;
};

type Participant = {
    id: number;
    dni: string;
    full_name: string;
};

type Props = {
    trainings: Training[];
    selected: number | null;
    participants: Participant[];
};

export default function CentralParticipants({ trainings, selected, participants }: Props) {
    const [name, setName] = useState('');
    const [dnis, setDnis] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const current = trainings.find((training) => training.id === selected) ?? null;

    const select = (id: number) => {
        router.get('/plataforma/certificados/participantes', { capacitacion: id }, { preserveState: true });
    };

    const createTraining = () => {
        if (name.trim() === '') {
            return;
        }

        router.post('/plataforma/certificados/capacitaciones', { name }, {
            onSuccess: () => setName(''),
        });
    };

    const importBatch = () => {
        if (!current) {
            return;
        }

        router.post(
            `/plataforma/certificados/capacitaciones/${current.id}/participantes`,
            { dnis, file },
            {
                forceFormData: true,
                onSuccess: () => {
                    setDnis('');
                    setFile(null);
                },
            },
        );
    };

    return (
        <>
            <Head title="Participantes" />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div>
                    <p className="text-xs font-semibold tracking-wide text-[#5a7390] uppercase">Certificado</p>
                    <h1 className="text-2xl font-semibold text-[#1a2b4c]">Participantes</h1>
                    <p className="mt-1 text-sm text-[#5a7390]">
                        Cada lote queda amarrado al nombre de la capacitación. Con el DNI se consulta el nombre en API Perú.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                    <section className="rounded-2xl border border-[#d7e3f0] bg-white p-4">
                        <h2 className="text-sm font-semibold text-[#1a2b4c]">Capacitaciones</h2>
                        <div className="mt-3 grid gap-2">
                            <Label htmlFor="training-name">Nombre de la capacitación</Label>
                            <Input
                                id="training-name"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="Trabajos en altura"
                            />
                            <Button type="button" onClick={createTraining}>
                                Crear lote
                            </Button>
                        </div>
                        <ul className="mt-4 grid gap-1">
                            {trainings.map((training) => (
                                <li key={training.id}>
                                    <button
                                        type="button"
                                        onClick={() => select(training.id)}
                                        className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                                            training.id === selected
                                                ? 'bg-[#1a2b4c] text-white'
                                                : 'text-[#1a2b4c] hover:bg-[#f4f7fb]'
                                        }`}
                                    >
                                        <span>{training.name}</span>
                                        <span className="text-xs opacity-80">{training.participants_count}</span>
                                    </button>
                                </li>
                            ))}
                            {trainings.length === 0 && (
                                <li className="text-sm text-[#5a7390]">Todavía no hay capacitaciones.</li>
                            )}
                        </ul>
                    </section>

                    <section className="rounded-2xl border border-[#d7e3f0] bg-white p-4">
                        {current ? (
                            <>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-semibold text-[#1a2b4c]">{current.name}</h2>
                                        <p className="text-sm text-[#5a7390]">{participants.length} participantes</p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            if (confirm(`¿Eliminar la capacitación “${current.name}” y sus participantes?`)) {
                                                router.delete(`/plataforma/certificados/capacitaciones/${current.id}`);
                                            }
                                        }}
                                    >
                                        Eliminar lote
                                    </Button>
                                </div>

                                <div className="mt-4 grid gap-3">
                                    <Label htmlFor="dnis">DNI, uno por línea o separados por coma</Label>
                                    <textarea
                                        id="dnis"
                                        value={dnis}
                                        onChange={(event) => setDnis(event.target.value)}
                                        rows={5}
                                        className="rounded-lg border border-[#c5d5e6] px-3 py-2 text-sm text-[#1a2b4c]"
                                        placeholder={'45652349\n12345678'}
                                    />
                                    <Label htmlFor="dni-file">O sube un archivo .txt o .csv</Label>
                                    <Input
                                        id="dni-file"
                                        type="file"
                                        accept=".txt,.csv,text/plain"
                                        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                                    />
                                    <Button type="button" onClick={importBatch}>
                                        <Upload className="size-4" />
                                        Consultar y agregar
                                    </Button>
                                    <p className="text-xs text-[#5a7390]">Máximo 40 DNI por envío.</p>
                                </div>

                                <div className="mt-6 overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="text-[#5a7390]">
                                            <tr>
                                                <th className="py-2 font-medium">DNI</th>
                                                <th className="py-2 font-medium">Nombre</th>
                                                <th className="py-2" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {participants.map((person) => (
                                                <tr key={person.id} className="border-t border-[#e6eef6]">
                                                    <td className="py-2 text-[#1a2b4c]">{person.dni}</td>
                                                    <td className="py-2 text-[#1a2b4c]">{person.full_name}</td>
                                                    <td className="py-2 text-right">
                                                        <button
                                                            type="button"
                                                            aria-label="Eliminar participante"
                                                            className="cursor-pointer text-[#5a7390] hover:text-red-600"
                                                            onClick={() =>
                                                                router.delete(
                                                                    `/plataforma/certificados/participantes/${person.id}`,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {participants.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="py-6 text-[#5a7390]">
                                                        Este lote todavía no tiene participantes.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-[#5a7390]">Crea una capacitación para cargar participantes.</p>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}

CentralParticipants.layout = {
    breadcrumbs: [
        { title: 'Panel', href: '/plataforma' },
        { title: 'Certificado', href: '/plataforma/certificados/participantes' },
        { title: 'Participantes', href: '/plataforma/certificados/participantes' },
    ],
};
