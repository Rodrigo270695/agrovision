import { Head, router } from '@inertiajs/react';
import { ChevronDown, Trash2, Upload, Users } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

const TONES = [
    { bar: 'bg-[#12355b]', soft: 'bg-[#e7eef6]', text: 'text-[#12355b]', chip: 'bg-[#12355b]' },
    { bar: 'bg-[#0f766e]', soft: 'bg-[#e6f6f3]', text: 'text-[#0f766e]', chip: 'bg-[#0f766e]' },
    { bar: 'bg-[#1d4ed8]', soft: 'bg-[#e8efff]', text: 'text-[#1d4ed8]', chip: 'bg-[#1d4ed8]' },
    { bar: 'bg-[#a16207]', soft: 'bg-[#fbf3e4]', text: 'text-[#a16207]', chip: 'bg-[#a16207]' },
    { bar: 'bg-[#9f1239]', soft: 'bg-[#fde8ee]', text: 'text-[#9f1239]', chip: 'bg-[#9f1239]' },
];

function tone(index: number) {
    return TONES[index % TONES.length];
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '•';
}

export default function CentralParticipants({ trainings, selected, participants }: Props) {
    const [name, setName] = useState('');
    const [dnis, setDnis] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [importOpen, setImportOpen] = useState(participants.length === 0);
    const current = trainings.find((training) => training.id === selected) ?? null;
    const currentIndex = Math.max(0, trainings.findIndex((training) => training.id === selected));
    const currentTone = tone(currentIndex);

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
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold tracking-wide text-[#0f766e] uppercase">Certificado</p>
                        <h1 className="text-2xl font-semibold text-[#12355b]">Participantes</h1>
                        <p className="mt-1 max-w-xl text-sm text-[#5a7390]">
                            Cada lote queda amarrado a una capacitación. Con el DNI, API Perú completa el nombre.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Stat label="Capacitaciones" value={trainings.length} className="bg-[#e7eef6] text-[#12355b]" />
                        <Stat label="En este lote" value={participants.length} className="bg-[#e6f6f3] text-[#0f766e]" />
                    </div>
                </div>

                <div className="grid items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
                    <section className="overflow-hidden rounded-2xl border border-[#d7e3f0] bg-white">
                        <div className="border-b border-[#e6eef6] bg-[#f7fafc] px-4 py-3">
                            <h2 className="text-sm font-semibold text-[#12355b]">Capacitaciones</h2>
                        </div>
                        <div className="grid gap-2 p-4">
                            <Label htmlFor="training-name">Nueva capacitación</Label>
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
                        <ul className="grid gap-2 px-4 pb-4">
                            {trainings.map((training, index) => {
                                const paint = tone(index);
                                const active = training.id === selected;

                                return (
                                    <li key={training.id}>
                                        <button
                                            type="button"
                                            onClick={() => select(training.id)}
                                            className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left ${
                                                active ? 'border-transparent shadow-sm' : 'border-[#e6eef6] bg-white'
                                            } ${active ? paint.soft : ''}`}
                                        >
                                            <span className={`h-9 w-1.5 rounded-full ${paint.bar}`} />
                                            <span className="min-w-0 flex-1">
                                                <span className={`block truncate text-sm font-medium ${paint.text}`}>{training.name}</span>
                                                <span className="text-xs text-[#5a7390]">{training.participants_count} participantes</span>
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                            {trainings.length === 0 && (
                                <li className="rounded-xl bg-[#f7fafc] px-3 py-6 text-center text-sm text-[#5a7390]">
                                    Crea la primera capacitación.
                                </li>
                            )}
                        </ul>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-[#d7e3f0] bg-white">
                        {current ? (
                            <>
                                <div className={`flex items-start justify-between gap-3 px-5 py-4 ${currentTone.soft}`}>
                                    <div>
                                        <p className={`text-xs font-semibold tracking-wide uppercase ${currentTone.text}`}>Lote activo</p>
                                        <h2 className="text-xl font-semibold text-[#12355b]">{current.name}</h2>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="bg-white"
                                        onClick={() => {
                                            if (confirm(`¿Eliminar la capacitación “${current.name}” y sus participantes?`)) {
                                                router.delete(`/plataforma/certificados/capacitaciones/${current.id}`);
                                            }
                                        }}
                                    >
                                        Eliminar lote
                                    </Button>
                                </div>

                                <div className="p-4">
                                    <Collapsible open={importOpen} onOpenChange={setImportOpen} className="rounded-xl border border-[#d7e3f0]">
                                        <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left">
                                            <span>
                                                <span className="block text-sm font-semibold text-[#12355b]">Subir lote de DNI</span>
                                                <span className="block text-xs text-[#5a7390]">Pega los números o sube un archivo. Máximo 40 por envío.</span>
                                            </span>
                                            <ChevronDown className={`size-4 text-[#5a7390] transition ${importOpen ? 'rotate-180' : ''}`} />
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="grid gap-3 border-t border-[#e6eef6] px-4 py-4">
                                            <Label htmlFor="dnis">DNI, uno por línea o separados por coma</Label>
                                            <textarea
                                                id="dnis"
                                                value={dnis}
                                                onChange={(event) => setDnis(event.target.value)}
                                                rows={5}
                                                className="rounded-lg border border-[#c5d5e6] px-3 py-2 text-sm text-[#12355b]"
                                                placeholder={'45652349\n12345678'}
                                            />
                                            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#c5d5e6] bg-[#f8fafc] px-3 py-2">
                                                <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#e7eef6] text-[#12355b]">
                                                    <Upload className="size-4" />
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block text-sm font-medium text-[#12355b]">Archivo .txt o .csv</span>
                                                    <span className="block truncate text-xs text-[#5a7390]">{file?.name ?? 'Ningún archivo elegido'}</span>
                                                </span>
                                                <input
                                                    type="file"
                                                    accept=".txt,.csv,text/plain"
                                                    className="sr-only"
                                                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                                                />
                                            </label>
                                            <Button type="button" onClick={importBatch} className="bg-[#0f766e] hover:bg-[#0d655e]">
                                                Consultar y agregar
                                            </Button>
                                        </CollapsibleContent>
                                    </Collapsible>

                                    <ul className="mt-4 grid gap-2">
                                        {participants.map((person, index) => {
                                            const paint = tone(index);

                                            return (
                                                <li
                                                    key={person.id}
                                                    className="flex items-center gap-3 rounded-xl border border-[#e6eef6] px-3 py-2.5"
                                                >
                                                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-semibold text-white ${paint.chip}`}>
                                                        {initials(person.full_name)}
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-sm font-medium text-[#12355b]">{person.full_name}</span>
                                                        <span className={`text-xs font-medium ${paint.text}`}>DNI {person.dni}</span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        aria-label="Eliminar participante"
                                                        className="cursor-pointer rounded-lg p-2 text-[#5a7390] hover:bg-[#fde8ee] hover:text-[#9f1239]"
                                                        onClick={() =>
                                                            router.delete(`/plataforma/certificados/participantes/${person.id}`)
                                                        }
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                </li>
                                            );
                                        })}
                                        {participants.length === 0 && (
                                            <li className="flex flex-col items-center gap-2 rounded-xl bg-[#f7fafc] px-4 py-10 text-center">
                                                <Users className="size-6 text-[#0f766e]" />
                                                <p className="text-sm text-[#5a7390]">Este lote todavía no tiene participantes.</p>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </>
                        ) : (
                            <p className="px-5 py-10 text-sm text-[#5a7390]">Crea una capacitación para cargar participantes.</p>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}

function Stat({ label, value, className }: { label: string; value: number; className: string }) {
    return (
        <div className={`rounded-xl px-4 py-2 ${className}`}>
            <p className="text-xs font-medium opacity-80">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
        </div>
    );
}

CentralParticipants.layout = {
    breadcrumbs: [
        { title: 'Panel', href: '/plataforma' },
        { title: 'Certificado', href: '/plataforma/certificados/participantes' },
        { title: 'Participantes', href: '/plataforma/certificados/participantes' },
    ],
};
