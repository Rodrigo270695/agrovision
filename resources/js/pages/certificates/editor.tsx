import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FormEvent, PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { CertificatePreviewModal } from '@/components/certificates/certificate-preview-modal';
import { SearchableCombobox } from '@/components/shared/searchable-combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboard } from '@/routes';

type Block = {
    id: string;
    text: string;
    x: number;
    y: number;
    w: number;
    size: number;
    align: 'left' | 'center' | 'right';
    weight: 'normal' | 'bold';
    font: string;
    color: string;
};

type Box = { x: number; y: number; w?: number; size?: number };

type Variable = { key: string; label: string };

type CustomVariable = { key: string; label: string; value: string };

type Attendee = {
    id: number;
    name: string;
    dni: string | null;
    email: string | null;
    status: string;
    status_label: string;
    certificate_id: number | null;
    code: string | null;
};

type Issued = {
    id: number;
    code: string;
    name: string;
    dni: string | null;
    issued_on: string | null;
    expires_on: string | null;
    verify_url: string;
};

type FontOption = { id: string; label: string; family: string; url: string | null };

type PageProps = {
    template: {
        id: number;
        induction_id: number;
        name: string;
        issuer_name: string;
        issuer_title: string | null;
        validity_months: number;
        background_url: string | null;
        signature_url: string | null;
    } | null;
    layout: { blocks: Block[]; qr: Box; signature: Box };
    custom_variables: CustomVariable[];
    variables: Variable[];
    inductions: { id: number; title: string; session_on: string | null }[];
    attendees: Attendee[];
    issued: Issued[];
    sample: Record<string, string>;
    fonts: FontOption[];
};

function fill(text: string, sample: Record<string, string>): string {
    return text.replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g, (_, key: string) => sample[key] ?? '');
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function fontFamily(fonts: FontOption[], font?: string): string {
    return fonts.find((item) => item.id === font)?.family ?? fonts[0]?.family ?? 'Arial, Helvetica, sans-serif';
}

function FontPicker({
    fonts,
    value,
    onChange,
}: {
    fonts: FontOption[];
    value: string;
    onChange: (id: string) => void;
}) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [box, setBox] = useState({ top: 0, left: 0, width: 280, maxHeight: 320 });
    const current = fonts.find((item) => item.id === value) ?? fonts[0];

    useLayoutEffect(() => {
        if (!open || !buttonRef.current) {
            return;
        }

        const place = () => {
            if (!buttonRef.current) {
                return;
            }

            const rect = buttonRef.current.getBoundingClientRect();
            const width = Math.max(rect.width, 280);
            const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
            const gap = 4;
            const margin = 8;
            const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
            const spaceAbove = rect.top - gap - margin;
            const openBelow = spaceBelow >= 180 || spaceBelow >= spaceAbove;
            const maxHeight = Math.max(140, Math.min(320, openBelow ? spaceBelow : spaceAbove));
            const top = openBelow ? rect.bottom + gap : Math.max(margin, rect.top - gap - maxHeight);

            setBox({ top, left, width, maxHeight });
        };

        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);

        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [open]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const close = (event: MouseEvent) => {
            const target = event.target as Node;
            if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
                return;
            }
            setOpen(false);
        };

        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    if (!current) {
        return null;
    }

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((currentOpen) => !currentOpen)}
                className="flex h-9 w-full cursor-pointer items-center justify-between rounded-lg border border-[#c5d5e6] bg-white px-2 text-left text-sm text-[#1a2b4c]"
                style={{ fontFamily: current.family }}
            >
                <span className="truncate">{current.label}</span>
                <span className="text-[#6b8ead]">▾</span>
            </button>
            {open
                ? createPortal(
                      <div
                          ref={menuRef}
                          className="overflow-auto rounded-lg border border-[#c5d5e6] bg-white py-1 shadow-lg"
                          style={{ position: 'fixed', top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight, zIndex: 200 }}
                      >
                          {fonts.map((font) => (
                              <button
                                  key={font.id}
                                  type="button"
                                  onClick={() => {
                                      onChange(font.id);
                                      setOpen(false);
                                  }}
                                  className="block w-full cursor-pointer px-3 py-2 text-left text-lg leading-tight text-[#1a2b4c] hover:bg-[#e8f0fb]"
                                  style={{
                                      fontFamily: font.family,
                                      background: font.id === value ? '#dbe7f8' : undefined,
                                  }}
                              >
                                  {font.label}
                              </button>
                          ))}
                      </div>,
                      document.body,
                  )
                : null}
        </>
    );
}

export default function CertificateEditor({
    template,
    layout,
    custom_variables: initialCustom,
    variables,
    inductions,
    attendees,
    issued,
    sample,
    fonts,
}: PageProps) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const [canvasWidth, setCanvasWidth] = useState(900);
    const [blocks, setBlocks] = useState<Block[]>(
        layout.blocks.map((block) => ({
            ...block,
            font: fonts.some((item) => item.id === block.font) ? block.font : 'sans',
        })),
    );
    const [qr, setQr] = useState({ x: layout.qr.x, y: layout.qr.y, size: layout.qr.size ?? 12 });
    const [signatureBox, setSignatureBox] = useState({
        x: layout.signature.x,
        y: layout.signature.y,
        w: layout.signature.w ?? 24,
    });
    const [customs, setCustoms] = useState<CustomVariable[]>(initialCustom);
    const [customDraft, setCustomDraft] = useState({ key: '', label: '', value: '' });
    const [selected, setSelected] = useState<string | null>(blocks[0]?.id ?? null);
    const [sendingCertificates, setSendingCertificates] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewAttendeeId, setPreviewAttendeeId] = useState<number | null>(null);
    const [backgroundPreview, setBackgroundPreview] = useState<string | null>(template?.background_url ?? null);
    const [signaturePreview, setSignaturePreview] = useState<string | null>(template?.signature_url ?? null);

    const form = useForm({
        induction_id: template?.induction_id ? String(template.induction_id) : '',
        name: template?.name ?? '',
        issuer_name: template?.issuer_name ?? '',
        issuer_title: template?.issuer_title ?? '',
        validity_months: template?.validity_months ?? 12,
        background: null as File | null,
        signature: null as File | null,
    });

    useEffect(() => {
        const styleId = 'certificate-font-faces';
        const rules = fonts
            .filter((font) => font.url)
            .map((font) => {
                const face = font.family.split(',')[0].trim();

                return `@font-face{font-family:${face};src:url('${font.url}') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}@font-face{font-family:${face};src:url('${font.url}') format('truetype');font-weight:bold;font-style:normal;font-display:swap;}`;
            })
            .join('');
        let style = document.getElementById(styleId) as HTMLStyleElement | null;

        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }

        style.textContent = rules;
    }, [fonts]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const update = () => setCanvasWidth(canvas.clientWidth);
        update();
        const observer = new ResizeObserver(update);
        observer.observe(canvas);

        return () => observer.disconnect();
    }, []);

    const selectedBlock = blocks.find((block) => block.id === selected) ?? null;

    const patchBlock = (id: string, patch: Partial<Block>) => {
        setBlocks((current) => current.map((block) => (block.id === id ? { ...block, ...patch } : block)));
    };

    const drag = (
        event: ReactPointerEvent,
        origin: { x: number; y: number },
        apply: (x: number, y: number) => void,
    ) => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        const rect = canvas.getBoundingClientRect();
        const startX = event.clientX;
        const startY = event.clientY;

        const move = (ev: PointerEvent) => {
            apply(
                clamp(origin.x + ((ev.clientX - startX) / rect.width) * 100, 0, 92),
                clamp(origin.y + ((ev.clientY - startY) / rect.height) * 100, 0, 92),
            );
        };
        const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };

        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

    const addBlock = (text: string) => {
        const id = `b${Date.now()}`;
        const block: Block = {
            id,
            text,
            x: 10,
            y: clamp(18 + blocks.length * 6, 8, 70),
            w: 80,
            size: 16,
            align: 'center',
            weight: 'normal',
            font: 'serif',
            color: '#1a1a1a',
        };
        setBlocks((current) => [...current, block]);
        setSelected(id);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => {
            const next: Record<string, unknown> = {
                ...data,
                layout: JSON.stringify({ blocks, qr, signature: signatureBox }),
                custom_variables: JSON.stringify(customs),
            };

            if (!(data.background instanceof File)) {
                delete next.background;
            }

            if (!(data.signature instanceof File)) {
                delete next.signature;
            }

            return next;
        });

        const options = { forceFormData: true, preserveScroll: true };

        if (template) {
            form.put(`/certificados/plantillas/${template.id}`, options);
        } else {
            form.post('/certificados/plantillas', options);
        }
    };

    const emit = (ids: number[]) => {
        if (!template || ids.length === 0) {
            return;
        }

        router.post(`/certificados/plantillas/${template.id}/emitir`, { attendee_ids: ids }, { preserveScroll: true });
    };

    const sendCertificates = () => {
        if (!template || sendingCertificates) {
            return;
        }

        setSendingCertificates(true);
        router.post(`/certificados/plantillas/${template.id}/enviar`, {}, {
            preserveScroll: true,
            onFinish: () => setSendingCertificates(false),
        });
    };

    const attendedIds = attendees.filter((attendee) => attendee.status === 'attended' && !attendee.certificate_id).map((attendee) => attendee.id);
    const previewValues = {
        ...sample,
        firmante: form.data.issuer_name || sample.firmante,
        cargo: form.data.issuer_title || sample.cargo,
        ...Object.fromEntries(customs.map((item) => [item.key, item.value])),
    };

    return (
        <>
            <Head title={template ? template.name : 'Nueva plantilla'} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
            <form onSubmit={submit} className="flex w-full flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <Link href="/certificados" className="text-xs font-medium text-[#2e5a9e] hover:underline">
                            Volver a plantillas
                        </Link>
                        <h1 className="mt-1 text-xl font-semibold text-[#1a2b4c]">
                            {template ? 'Editar plantilla' : 'Nueva plantilla'}
                        </h1>
                    </div>
                    <Button type="submit" disabled={form.processing} className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]">
                        Guardar plantilla
                    </Button>
                </div>

                <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="space-y-4">
                        <section className="space-y-3 rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm">
                            <div className="grid gap-1.5">
                                <Label className="text-xs text-[#1a2b4c]">Inducción</Label>
                                <SearchableCombobox
                                    value={form.data.induction_id || null}
                                    options={inductions.map((induction) => ({
                                        value: String(induction.id),
                                        label: induction.title,
                                        description: induction.session_on ?? undefined,
                                    }))}
                                    onChange={(value) => form.setData('induction_id', value ?? '')}
                                    placeholder="Buscar inducción"
                                    emptyMessage="No hay inducciones"
                                    menuMinWidth={420}
                                />
                                {form.errors.induction_id ? <p className="text-xs text-red-600">{form.errors.induction_id}</p> : null}
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs text-[#1a2b4c]">Nombre de la plantilla</Label>
                                <Input value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} className="h-10 border-[#c5d5e6]" />
                                {form.errors.name ? <p className="text-xs text-red-600">{form.errors.name}</p> : null}
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs text-[#1a2b4c]">Vigencia (meses)</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={120}
                                    value={form.data.validity_months}
                                    onChange={(event) => form.setData('validity_months', Number(event.target.value))}
                                    className="h-10 border-[#c5d5e6]"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs text-[#1a2b4c]">Fondo del certificado</Label>
                                <Input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(event) => {
                                        const file = event.target.files?.[0] ?? null;
                                        form.setData('background', file);
                                        setBackgroundPreview(file ? URL.createObjectURL(file) : template?.background_url ?? null);
                                    }}
                                    className="h-10 border-[#c5d5e6]"
                                />
                            </div>
                        </section>

                        <section className="space-y-3 rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm">
                            <h2 className="text-sm font-semibold text-[#1a2b4c]">Quien firma</h2>
                            <div className="grid gap-1.5">
                                <Label className="text-xs text-[#1a2b4c]">Nombre</Label>
                                <Input value={form.data.issuer_name} onChange={(event) => form.setData('issuer_name', event.target.value)} className="h-10 border-[#c5d5e6]" />
                                {form.errors.issuer_name ? <p className="text-xs text-red-600">{form.errors.issuer_name}</p> : null}
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs text-[#1a2b4c]">Cargo</Label>
                                <Input value={form.data.issuer_title} onChange={(event) => form.setData('issuer_title', event.target.value)} className="h-10 border-[#c5d5e6]" />
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs text-[#1a2b4c]">Firma</Label>
                                <Input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(event) => {
                                        const file = event.target.files?.[0] ?? null;
                                        form.setData('signature', file);
                                        setSignaturePreview(file ? URL.createObjectURL(file) : template?.signature_url ?? null);
                                    }}
                                    className="h-10 border-[#c5d5e6]"
                                />
                            </div>
                        </section>

                        <section className="space-y-3 rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm">
                            <h2 className="text-sm font-semibold text-[#1a2b4c]">Variables</h2>
                            <p className="text-xs text-[#5a7390]">
                                Se llenan con los datos de la inducción y de cada participante. Pulsa una para ponerla en el certificado.
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {variables.map((variable) => (
                                    <button
                                        key={variable.key}
                                        type="button"
                                        onClick={() => addBlock(`{{${variable.key}}}`)}
                                        className="cursor-pointer rounded-full border border-[#c5d5e6] px-2 py-1 text-[11px] text-[#1a2b4c] hover:bg-[#e8f1fa]"
                                        title={variable.label}
                                    >
                                        {variable.label}
                                    </button>
                                ))}
                            </div>
                            <div className="grid gap-2 border-t border-[#e2eaf3] pt-3">
                                <p className="text-xs font-medium text-[#1a2b4c]">Variable propia</p>
                                <Input
                                    placeholder="clave, ej. resolucion"
                                    value={customDraft.key}
                                    onChange={(event) => setCustomDraft((current) => ({ ...current, key: event.target.value }))}
                                    className="h-9 border-[#c5d5e6]"
                                />
                                <Input
                                    placeholder="Nombre visible"
                                    value={customDraft.label}
                                    onChange={(event) => setCustomDraft((current) => ({ ...current, label: event.target.value }))}
                                    className="h-9 border-[#c5d5e6]"
                                />
                                <Input
                                    placeholder="Texto que se imprime"
                                    value={customDraft.value}
                                    onChange={(event) => setCustomDraft((current) => ({ ...current, value: event.target.value }))}
                                    className="h-9 border-[#c5d5e6]"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="cursor-pointer border-[#c5d5e6]"
                                    onClick={() => {
                                        const key = customDraft.key.toLowerCase().replace(/[^a-z0-9_]/g, '');
                                        if (!/^[a-z][a-z0-9_]{0,30}$/.test(key)) {
                                            return;
                                        }
                                        setCustoms((current) => [
                                            ...current.filter((item) => item.key !== key),
                                            { key, label: customDraft.label || key, value: customDraft.value },
                                        ]);
                                        setCustomDraft({ key: '', label: '', value: '' });
                                        addBlock(`{{${key}}}`);
                                    }}
                                >
                                    Crear e insertar
                                </Button>
                            </div>
                        </section>

                        {selectedBlock ? (
                            <section className="space-y-2 rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm">
                                <h2 className="text-sm font-semibold text-[#1a2b4c]">Texto seleccionado</h2>
                                <textarea
                                    value={selectedBlock.text}
                                    onChange={(event) => patchBlock(selectedBlock.id, { text: event.target.value })}
                                    rows={4}
                                    className="w-full rounded-lg border border-[#c5d5e6] p-2 text-sm"
                                />
                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-[#1a2b4c]">Tamaño</Label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => patchBlock(selectedBlock.id, { size: clamp(selectedBlock.size - 2, 8, 96) })}
                                            className="h-9 w-9 cursor-pointer rounded-lg border border-[#c5d5e6] text-lg text-[#1a2b4c]"
                                        >
                                            −
                                        </button>
                                        <Input
                                            type="number"
                                            min={8}
                                            max={96}
                                            value={selectedBlock.size}
                                            onChange={(event) => patchBlock(selectedBlock.id, { size: clamp(Number(event.target.value) || 8, 8, 96) })}
                                            className="h-9 border-[#c5d5e6]"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => patchBlock(selectedBlock.id, { size: clamp(selectedBlock.size + 2, 8, 96) })}
                                            className="h-9 w-9 cursor-pointer rounded-lg border border-[#c5d5e6] text-lg text-[#1a2b4c]"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="grid gap-1.5">
                                        <Label className="text-xs text-[#1a2b4c]">Fuente</Label>
                                        <FontPicker
                                            fonts={fonts}
                                            value={selectedBlock.font}
                                            onChange={(font) => patchBlock(selectedBlock.id, { font })}
                                        />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label className="text-xs text-[#1a2b4c]">Alineación</Label>
                                        <select
                                            value={selectedBlock.align}
                                            onChange={(event) => patchBlock(selectedBlock.id, { align: event.target.value as Block['align'] })}
                                            className="h-9 rounded-lg border border-[#c5d5e6] bg-white px-2 text-sm"
                                        >
                                            <option value="left">Izquierda</option>
                                            <option value="center">Centro</option>
                                            <option value="right">Derecha</option>
                                        </select>
                                    </div>
                                </div>
                                <label className="flex items-center gap-2 text-xs text-[#1a2b4c]">
                                    <input
                                        type="checkbox"
                                        checked={selectedBlock.weight === 'bold'}
                                        onChange={(event) => patchBlock(selectedBlock.id, { weight: event.target.checked ? 'bold' : 'normal' })}
                                    />
                                    Negrita
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setBlocks((current) => current.filter((block) => block.id !== selectedBlock.id));
                                        setSelected(null);
                                    }}
                                    className="cursor-pointer text-xs font-medium text-red-600"
                                >
                                    Quitar este texto
                                </button>
                            </section>
                        ) : null}
                    </div>

                    <div className="rounded-2xl border border-[#d7e3f0] bg-[#eef3f8] p-3 shadow-sm">
                        <p className="mb-2 text-xs text-[#5a7390]">Arrastra los textos, la firma y el QR. La vista usa un participante de muestra.</p>
                        <div
                            ref={canvasRef}
                            className="relative aspect-[297/210] w-full overflow-hidden rounded-lg border border-[#d7e3f0] bg-white"
                            onPointerDown={() => setSelected(null)}
                        >
                            {backgroundPreview ? (
                                <img src={backgroundPreview} alt="" className="absolute inset-0 h-full w-full object-cover" />
                            ) : null}
                            {blocks.map((block) => (
                                <div
                                    key={block.id}
                                    onPointerDown={(event) => {
                                        setSelected(block.id);
                                        drag(event, block, (x, y) => patchBlock(block.id, { x, y }));
                                    }}
                                    className="absolute cursor-move whitespace-pre-wrap leading-tight"
                                    style={{
                                        left: `${block.x}%`,
                                        top: `${block.y}%`,
                                        width: `${block.w}%`,
                                        textAlign: block.align,
                                        fontSize: `${Math.max(8, (block.size * canvasWidth) / 842)}px`,
                                        fontFamily: fontFamily(fonts, block.font),
                                        fontWeight: block.weight,
                                        color: block.color,
                                        outline: selected === block.id ? '1px dashed #2e5a9e' : undefined,
                                    }}
                                >
                                    {fill(block.text, previewValues)}
                                </div>
                            ))}
                            <div
                                onPointerDown={(event) => {
                                    setSelected('signature');
                                    drag(event, signatureBox, (x, y) => setSignatureBox((current) => ({ ...current, x, y })));
                                }}
                                className="absolute cursor-move"
                                style={{
                                    left: `${signatureBox.x}%`,
                                    top: `${signatureBox.y}%`,
                                    width: `${signatureBox.w}%`,
                                    outline: selected === 'signature' ? '1px dashed #2e5a9e' : undefined,
                                }}
                            >
                                {signaturePreview ? (
                                    <img src={signaturePreview} alt="Firma" className="h-10 w-full object-contain" />
                                ) : (
                                    <p className="text-center text-[10px] text-[#6b8ead]">Firma</p>
                                )}
                            </div>
                            <div
                                onPointerDown={(event) => {
                                    setSelected('qr');
                                    drag(event, qr, (x, y) => setQr((current) => ({ ...current, x, y })));
                                }}
                                className="absolute flex cursor-move items-center justify-center border border-[#1a2b4c] bg-white text-[10px] font-semibold text-[#1a2b4c]"
                                style={{
                                    left: `${qr.x}%`,
                                    top: `${qr.y}%`,
                                    width: `${qr.size}%`,
                                    aspectRatio: '1',
                                    outline: selected === 'qr' ? '1px dashed #2e5a9e' : undefined,
                                }}
                            >
                                QR
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            {template ? (
                <section className="w-full rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-[#1a2b4c]">Emitir certificados</h2>
                            <p className="text-xs text-[#5a7390]">Quienes asistieron y firmaron reciben el PDF en el correo de su unidad. El QR abre la verificación de esa persona.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setPreviewAttendeeId(attendees[0]?.id ?? null);
                                    setPreviewOpen(true);
                                }}
                                className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                            >
                                Previsualizar
                            </Button>
                            <Button
                                type="button"
                                disabled={attendedIds.length === 0}
                                onClick={() => emit(attendedIds)}
                                className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                            >
                                Emitir a quienes asistieron
                            </Button>
                            <Button
                                type="button"
                                disabled={sendingCertificates || attendees.length === 0}
                                onClick={sendCertificates}
                                className="cursor-pointer bg-[#2e5a9e] text-white hover:bg-[#1a2b4c]"
                            >
                                {sendingCertificates ? 'Enviando…' : 'Enviar a los conductores'}
                            </Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs uppercase text-[#6b8ead]">
                                <tr>
                                    <th className="py-2 pr-3">Participante</th>
                                    <th className="py-2 pr-3">DNI</th>
                                    <th className="py-2 pr-3">Correo</th>
                                    <th className="py-2 pr-3">Estado</th>
                                    <th className="py-2 pr-3">Certificado</th>
                                    <th className="py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {attendees.map((attendee) => (
                                    <tr key={attendee.id} className="border-t border-[#e2eaf3]">
                                        <td className="py-2 pr-3">{attendee.name}</td>
                                        <td className="py-2 pr-3">{attendee.dni || '—'}</td>
                                        <td className="py-2 pr-3">{attendee.email || 'Sin correo'}</td>
                                        <td className="py-2 pr-3">{attendee.status_label}</td>
                                        <td className="py-2 pr-3">{attendee.code || '—'}</td>
                                        <td className="py-2 text-right">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPreviewAttendeeId(attendee.id);
                                                    setPreviewOpen(true);
                                                }}
                                                className="mr-3 cursor-pointer font-medium text-[#2e5a9e] hover:underline"
                                            >
                                                Vista previa
                                            </button>
                                            {attendee.certificate_id ? (
                                                <a href={`/certificados/${attendee.certificate_id}/pdf`} target="_blank" rel="noopener noreferrer" className="font-medium text-[#2e5a9e] hover:underline">
                                                    PDF
                                                </a>
                                            ) : (
                                                <button type="button" onClick={() => emit([attendee.id])} className="cursor-pointer font-medium text-[#2e5a9e] hover:underline">
                                                    Emitir
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {issued.length > 0 ? (
                        <ul className="mt-3 space-y-1 text-xs text-[#5a7390]">
                            {issued.map((item) => (
                                <li key={item.id}>
                                    {item.code} · {item.name} · vence {item.expires_on} ·{' '}
                                    <a href={item.verify_url} target="_blank" rel="noopener noreferrer" className="text-[#2e5a9e] hover:underline">
                                        Verificar
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </section>
            ) : null}
            {template ? (
                <CertificatePreviewModal
                    open={previewOpen}
                    onClose={() => setPreviewOpen(false)}
                    templateId={template.id}
                    attendees={attendees.map((attendee) => ({ id: attendee.id, name: attendee.name }))}
                    attendeeId={previewAttendeeId}
                />
            ) : null}
            </div>
        </>
    );
}

CertificateEditor.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Certificados', href: '/certificados' },
        { title: 'Plantilla', href: '/certificados' },
    ],
};
