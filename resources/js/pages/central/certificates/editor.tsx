import { Head, Link, router } from '@inertiajs/react';
import { ChevronDown, Download, Eye, Save } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const TEXT_COLORS = [
    { name: 'Marino', value: '#12355b' },
    { name: 'Verde', value: '#0f766e' },
    { name: 'Azul', value: '#1d4ed8' },
    { name: 'Dorado', value: '#a16207' },
    { name: 'Granate', value: '#9f1239' },
    { name: 'Negro', value: '#1a1a1a' },
    { name: 'Gris', value: '#475569' },
    { name: 'Blanco', value: '#ffffff' },
];

type Block = {
    id: string;
    text: string;
    x: number;
    y: number;
    w: number;
    size: number;
    align: 'left' | 'center' | 'right';
    weight: 'normal' | 'bold';
    color: string;
    font: string;
};

type Frame = { x: number; y: number; w: number; h: number; visible: boolean };
type QrBox = { x: number; y: number; size: number; visible: boolean };

type LogoItem = {
    id: string;
    url: string | null;
    file?: File;
    x: number;
    y: number;
    w: number;
    h: number;
};

type CustomVariable = { key: string; label: string; value: string };

type FontOption = { id: string; label: string; family: string; url?: string | null };

type Training = { id: number; name: string };

type Person = { id: number; full_name: string; dni: string };

type TemplatePayload = {
    id: number | null;
    training_id: number | null;
    name: string;
    course_title: string;
    expires_on: string | null;
    code_prefix: string;
    issuer_name: string;
    issuer_title: string;
    background_url: string | null;
    signature_url: string | null;
    stamp_url: string | null;
    watermark_url: string | null;
    layout: {
        blocks: Block[];
        qr: QrBox;
        signature: Frame;
        stamp: Frame;
        watermark: Frame;
    };
    logos: LogoItem[];
    custom_variables: CustomVariable[];
};

type Props = {
    template: TemplatePayload;
    trainings: Training[];
    participants: Person[];
    fonts: FontOption[];
    variables: string[];
};

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function fill(text: string, sample: Record<string, string>): string {
    return text.replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g, (_, key: string) => sample[key] ?? '');
}

function RemoveButton({ onRemove }: { onRemove: () => void }) {
    return (
        <button
            type="button"
            aria-label="Quitar"
            onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onRemove();
            }}
            className="absolute top-0 right-0 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-red-600 text-sm leading-none text-white"
        >
            ×
        </button>
    );
}

export default function CentralCertificateEditor({ template, trainings, participants, fonts, variables }: Props) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const [name, setName] = useState(template.name);
    const [courseTitle, setCourseTitle] = useState(template.course_title);
    const [trainingId, setTrainingId] = useState(template.training_id ? String(template.training_id) : '');
    const [expiresOn, setExpiresOn] = useState(template.expires_on ?? '');
    const [codePrefix, setCodePrefix] = useState(template.code_prefix);
    const [issuerName, setIssuerName] = useState(template.issuer_name);
    const [issuerTitle, setIssuerTitle] = useState(template.issuer_title);
    const [blocks, setBlocks] = useState<Block[]>(template.layout.blocks);
    const [qr, setQr] = useState<QrBox>(template.layout.qr);
    const [signature, setSignature] = useState<Frame>(template.layout.signature);
    const [stamp, setStamp] = useState<Frame>(template.layout.stamp);
    const [watermark, setWatermark] = useState<Frame>(template.layout.watermark);
    const [logos, setLogos] = useState<LogoItem[]>(template.logos);
    const [custom, setCustom] = useState<CustomVariable[]>(template.custom_variables ?? []);
    const [selected, setSelected] = useState<string | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewPerson, setPreviewPerson] = useState<number | null>(participants[0]?.id ?? null);
    const [backgroundUrl, setBackgroundUrl] = useState<string | null>(template.background_url);
    const [signatureUrl, setSignatureUrl] = useState<string | null>(template.signature_url);
    const [stampUrl, setStampUrl] = useState<string | null>(template.stamp_url);
    const [watermarkUrl, setWatermarkUrl] = useState<string | null>(template.watermark_url);
    const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [stampFile, setStampFile] = useState<File | null>(null);
    const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
    const [removeBackground, setRemoveBackground] = useState(false);
    const [removeSignature, setRemoveSignature] = useState(false);
    const [removeStamp, setRemoveStamp] = useState(false);
    const [removeWatermark, setRemoveWatermark] = useState(false);
    const [removedLogos, setRemovedLogos] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [canvasWidth, setCanvasWidth] = useState(900);

    const person = participants.find((item) => item.id === previewPerson) ?? participants[0];
    const sample = useMemo(() => {
        const values: Record<string, string> = {
            nombre: person?.full_name ?? 'NOMBRE DEL PARTICIPANTE',
            dni: person?.dni ?? '00000000',
            curso: courseTitle || 'Nombre del curso',
            emision: new Date().toLocaleDateString('es-PE'),
            vencimiento: expiresOn ? new Date(expiresOn + 'T00:00:00').toLocaleDateString('es-PE') : '—',
            codigo: `${codePrefix || 'GIN'}-${new Date().getFullYear()}-0001`,
            firmante: issuerName,
            cargo: issuerTitle,
        };

        custom.forEach((item) => {
            if (item.key) {
                values[item.key] = item.value;
            }
        });

        return values;
    }, [person, courseTitle, expiresOn, codePrefix, issuerName, issuerTitle, custom]);

    const selectedBlock = blocks.find((block) => block.id === selected) ?? null;

    useEffect(() => {
        const styleId = 'central-certificate-font-faces';
        const rules = fonts
            .filter((font) => font.url)
            .map((font) => {
                const face = font.family.split(',')[0]?.trim() ?? font.family;

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

    const drag = (event: ReactPointerEvent, originX: number, originY: number, apply: (x: number, y: number) => void) => {
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
                clamp(originX + ((ev.clientX - startX) / rect.width) * 100, 0, 92),
                clamp(originY + ((ev.clientY - startY) / rect.height) * 100, 0, 92),
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
        setBlocks((current) => [
            ...current,
            {
                id,
                text,
                x: 10,
                y: 20,
                w: 50,
                size: 14,
                align: 'center',
                weight: 'normal',
                color: '#12355b',
                font: 'sans',
            },
        ]);
        setSelected(id);
    };

    const patchBlock = (id: string, patch: Partial<Block>) => {
        setBlocks((current) => current.map((block) => (block.id === id ? { ...block, ...patch } : block)));
    };

    const backgroundSrc = removeBackground && !backgroundFile ? null : backgroundUrl;
    const signatureSrc = removeSignature && !signatureFile ? null : signatureUrl;
    const stampSrc = removeStamp && !stampFile ? null : stampUrl;
    const watermarkSrc = removeWatermark && !watermarkFile ? null : watermarkUrl;

    const save = () => {
        const pending = logos.filter((logo) => logo.file);
        const stored = logos.filter((logo) => !logo.file);
        const layout = {
            blocks,
            qr,
            signature,
            stamp,
            watermark,
            logos: stored.map((logo) => ({ id: logo.id, x: logo.x, y: logo.y, w: logo.w, h: logo.h })),
        };
        const body = new FormData();
        body.append('name', name);
        body.append('course_title', courseTitle);
        body.append('training_id', trainingId);
        body.append('expires_on', expiresOn);
        body.append('code_prefix', codePrefix);
        body.append('issuer_name', issuerName);
        body.append('issuer_title', issuerTitle);
        body.append('layout', JSON.stringify(layout));
        body.append('custom_variables', JSON.stringify(custom));
        body.append('new_logo_boxes', JSON.stringify(pending.map((logo) => ({ x: logo.x, y: logo.y, w: logo.w, h: logo.h }))));
        body.append('remove_background', removeBackground ? '1' : '0');
        body.append('remove_signature', removeSignature ? '1' : '0');
        body.append('remove_stamp', removeStamp ? '1' : '0');
        body.append('remove_watermark', removeWatermark ? '1' : '0');
        removedLogos.forEach((id) => body.append('remove_logos[]', id));
        pending.forEach((logo) => {
            if (logo.file) {
                body.append('logo_files[]', logo.file);
            }
        });
        if (backgroundFile) {
            body.append('background', backgroundFile);
        }
        if (signatureFile) {
            body.append('signature', signatureFile);
        }
        if (stampFile) {
            body.append('stamp', stampFile);
        }
        if (watermarkFile) {
            body.append('watermark', watermarkFile);
        }

        setSaving(true);
        const url = template.id
            ? `/plataforma/certificados/plantillas/${template.id}`
            : '/plataforma/certificados/plantillas';

        router.post(url, body, {
            forceFormData: true,
            onFinish: () => setSaving(false),
        });
    };

    const openPreview = () => {
        if (!template.id) {
            toast.error('Guarda la plantilla antes de previsualizar.');

            return;
        }

        if (participants.length === 0) {
            toast.error('Amarra una capacitación que tenga participantes.');

            return;
        }

        setPreviewOpen(true);
    };

    return (
        <>
            <Head title={name || 'Plantilla'} />
            <div className="flex flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold tracking-wide text-[#5a7390] uppercase">Certificado</p>
                        <h1 className="text-2xl font-semibold text-[#1a2b4c]">Plantilla</h1>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={openPreview}>
                            <Eye className="size-4" />
                            Vista previa
                        </Button>
                        {template.id && (
                            <Button variant="outline" asChild>
                                <a href={`/plataforma/certificados/plantillas/${template.id}/descargar`}>
                                    <Download className="size-4" />
                                    Descargar ZIP
                                </a>
                            </Button>
                        )}
                        <Button type="button" onClick={save} disabled={saving}>
                            <Save className="size-4" />
                            {saving ? 'Guardando…' : 'Guardar'}
                        </Button>
                    </div>
                </div>

                <div className="grid items-start gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                    <div className="grid content-start gap-3">
                        <Accordion title="Datos del certificado" hint="Curso, vigencia y firma" defaultOpen>
                        <Field label="Nombre de la plantilla">
                            <Input value={name} onChange={(event) => setName(event.target.value)} />
                        </Field>
                        <Field label="Capacitación amarrada">
                            <select
                                value={trainingId}
                                onChange={(event) => setTrainingId(event.target.value)}
                                className="h-10 w-full rounded-lg border border-[#c5d5e6] bg-white px-3 text-sm text-[#1a2b4c]"
                            >
                                <option value="">Sin amarrar</option>
                                {trainings.map((training) => (
                                    <option key={training.id} value={training.id}>
                                        {training.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Nombre del curso en el certificado">
                            <Input value={courseTitle} onChange={(event) => setCourseTitle(event.target.value)} />
                        </Field>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Fecha de expiración">
                                <Input type="date" value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} />
                            </Field>
                            <Field label="Prefijo del código">
                                <Input value={codePrefix} onChange={(event) => setCodePrefix(event.target.value.toUpperCase())} />
                            </Field>
                        </div>
                        <Field label="Quien firma">
                            <Input value={issuerName} onChange={(event) => setIssuerName(event.target.value)} />
                        </Field>
                        <Field label="Cargo">
                            <Input value={issuerTitle} onChange={(event) => setIssuerTitle(event.target.value)} />
                        </Field>
                        </Accordion>
                        <Accordion title="Imágenes" hint="Fondo, logos, sello, firma y marca de agua">
                        <div className="grid gap-2">
                        <FileField
                            label="Fondo"
                            preview={backgroundSrc}
                            onChange={(file) => {
                                setBackgroundFile(file);
                                setRemoveBackground(false);
                                if (file) {
                                    setBackgroundUrl(URL.createObjectURL(file));
                                }
                            }}
                        />
                        <FileField
                            label="Firma"
                            preview={signatureSrc}
                            onChange={(file) => {
                                setSignatureFile(file);
                                setRemoveSignature(false);
                                setSignature((current) => ({ ...current, visible: true }));
                                if (file) {
                                    setSignatureUrl(URL.createObjectURL(file));
                                }
                            }}
                        />
                        <FileField
                            label="Sello"
                            preview={stampSrc}
                            onChange={(file) => {
                                setStampFile(file);
                                setRemoveStamp(false);
                                setStamp((current) => ({ ...current, visible: true }));
                                if (file) {
                                    setStampUrl(URL.createObjectURL(file));
                                }
                            }}
                        />
                        <FileField
                            label="Marca de agua"
                            preview={watermarkSrc}
                            onChange={(file) => {
                                setWatermarkFile(file);
                                setRemoveWatermark(false);
                                setWatermark((current) => ({ ...current, visible: true }));
                                if (file) {
                                    setWatermarkUrl(URL.createObjectURL(file));
                                }
                            }}
                        />
                        <FileField
                            label="Añadir logo"
                            onChange={(file) => {
                                if (!file) {
                                    return;
                                }

                                const index = logos.length;
                                setLogos((current) => [
                                    ...current,
                                    {
                                        id: `new-${Date.now()}`,
                                        url: URL.createObjectURL(file),
                                        file,
                                        x: 4 + ((index % 4) * 18),
                                        y: 4,
                                        w: 16,
                                        h: 12,
                                    },
                                ]);
                            }}
                        />
                        </div>
                        {logos.length > 0 && (
                            <p className="text-xs text-[#5a7390]">{logos.length} logo{logos.length === 1 ? '' : 's'} en el certificado. Muévelos en la hoja.</p>
                        )}
                        </Accordion>
                        <Accordion title="Textos" hint="Variables del participante y textos libres" defaultOpen>
                        <div className="flex flex-wrap gap-1.5">
                                {variables.map((key) => (
                                    <button
                                        key={key}
                                        type="button"
                                        className="cursor-pointer rounded-full border border-[#bfd3ea] bg-[#f3f7fb] px-2.5 py-1 text-xs font-medium text-[#12355b]"
                                        onClick={() => addBlock(`{{${key}}}`)}
                                    >
                                        {`{{${key}}}`}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    className="cursor-pointer rounded-full border border-[#99f6e4] bg-[#f0fdfa] px-2.5 py-1 text-xs font-medium text-[#0f766e]"
                                    onClick={() => addBlock('Texto')}
                                >
                                    Texto libre
                                </button>
                        </div>
                        <div className="mt-3 grid gap-2">
                            {blocks.map((block) => (
                                <button
                                    key={block.id}
                                    type="button"
                                    onClick={() => setSelected(block.id)}
                                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs ${
                                        selected === block.id ? 'border-[#12355b] bg-[#f3f7fb]' : 'border-[#e6eef6]'
                                    }`}
                                >
                                    <span className="size-3.5 shrink-0 rounded-full border border-black/10" style={{ background: block.color }} />
                                    <span className="truncate text-[#1a2b4c]">{fill(block.text, sample) || 'Texto vacío'}</span>
                                </button>
                            ))}
                        </div>
                        <div className="mt-4 grid gap-2">
                            <p className="text-xs font-medium text-[#1a2b4c]">Variables propias</p>
                            {custom.map((item, index) => (
                                <div key={index} className="grid grid-cols-3 gap-1">
                                    <Input
                                        value={item.key}
                                        placeholder="clave"
                                        onChange={(event) =>
                                            setCustom((current) =>
                                                current.map((row, rowIndex) =>
                                                    rowIndex === index ? { ...row, key: event.target.value } : row,
                                                ),
                                            )
                                        }
                                    />
                                    <Input
                                        value={item.label}
                                        placeholder="nombre"
                                        onChange={(event) =>
                                            setCustom((current) =>
                                                current.map((row, rowIndex) =>
                                                    rowIndex === index ? { ...row, label: event.target.value } : row,
                                                ),
                                            )
                                        }
                                    />
                                    <Input
                                        value={item.value}
                                        placeholder="valor"
                                        onChange={(event) =>
                                            setCustom((current) =>
                                                current.map((row, rowIndex) =>
                                                    rowIndex === index ? { ...row, value: event.target.value } : row,
                                                ),
                                            )
                                        }
                                    />
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCustom((current) => [...current, { key: '', label: '', value: '' }])}
                            >
                                Añadir variable
                            </Button>
                            {custom
                                .filter((item) => item.key)
                                .map((item) => (
                                    <button
                                        key={item.key}
                                        type="button"
                                        className="cursor-pointer text-left text-xs text-[#0f766e]"
                                        onClick={() => addBlock(`{{${item.key}}}`)}
                                    >
                                        Insertar {`{{${item.key}}}`}
                                    </button>
                                ))}
                        </div>
                        </Accordion>
                        <Button variant="outline" asChild>
                            <Link href="/plataforma/certificados/plantillas">Volver al listado</Link>
                        </Button>
                    </div>

                    <div className="grid gap-4">
                    <div className="rounded-2xl border border-[#d7e3f0] bg-[#e7eef6] p-3 md:p-6">

                    <div
                        ref={canvasRef}
                        className="relative mx-auto aspect-[297/210] w-full max-w-5xl overflow-hidden rounded-sm border border-[#d5deea] bg-white shadow-[0_18px_50px_rgba(18,53,91,0.12)]"
                        onPointerDown={() => setSelected(null)}
                    >
                        <div className="pointer-events-none absolute inset-[3.2%] border border-[#d5deea]" />
                        <div className="pointer-events-none absolute inset-[3.8%] border border-[#e7eef6]" />
                        {backgroundSrc && <img src={backgroundSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                        {watermarkSrc && watermark.visible && (
                            <Movable
                                selected={selected === 'watermark'}
                                style={{ left: `${watermark.x}%`, top: `${watermark.y}%`, width: `${watermark.w}%`, height: `${watermark.h}%` }}
                                onSelect={() => setSelected('watermark')}
                                onDrag={(event) => drag(event, watermark.x, watermark.y, (x, y) => setWatermark((current) => ({ ...current, x, y })))}
                                onRemove={() => {
                                    setWatermarkUrl(null);
                                    setWatermarkFile(null);
                                    setRemoveWatermark(true);
                                    setWatermark((current) => ({ ...current, visible: false }));
                                }}
                            >
                                <img src={watermarkSrc} alt="" className="h-full w-full object-contain opacity-20" />
                            </Movable>
                        )}
                        {logos.map((logo) =>
                            logo.url ? (
                                <Movable
                                    key={logo.id}
                                    selected={selected === logo.id}
                                    style={{ left: `${logo.x}%`, top: `${logo.y}%`, width: `${logo.w}%`, height: `${logo.h}%` }}
                                    onSelect={() => setSelected(logo.id)}
                                    onDrag={(event) =>
                                        drag(event, logo.x, logo.y, (x, y) =>
                                            setLogos((current) => current.map((item) => (item.id === logo.id ? { ...item, x, y } : item))),
                                        )
                                    }
                                    onRemove={() => {
                                        if (!logo.file) {
                                            setRemovedLogos((current) => [...current, logo.id]);
                                        }
                                        setLogos((current) => current.filter((item) => item.id !== logo.id));
                                    }}
                                >
                                    <img src={logo.url} alt="" className="h-full w-full object-contain" />
                                </Movable>
                            ) : null,
                        )}
                        {blocks.map((block) => (
                            <Movable
                                key={block.id}
                                selected={selected === block.id}
                                style={{
                                    left: `${block.x}%`,
                                    top: `${block.y}%`,
                                    width: `${block.w}%`,
                                    fontSize: `${Math.max(11, (block.size * canvasWidth) / 842)}px`,
                                    lineHeight: 1.2,
                                    textAlign: block.align,
                                    fontWeight: block.weight,
                                    color: block.color,
                                    fontFamily: fonts.find((font) => font.id === block.font)?.family,
                                    whiteSpace: 'pre-wrap',
                                }}
                                onSelect={() => setSelected(block.id)}
                                onDrag={(event) =>
                                    drag(event, block.x, block.y, (x, y) => patchBlock(block.id, { x, y }))
                                }
                                onRemove={() => setBlocks((current) => current.filter((item) => item.id !== block.id))}
                            >
                                {fill(block.text, sample) || ' '}
                            </Movable>
                        ))}
                        {signatureSrc && signature.visible && (
                            <Movable
                                selected={selected === 'signature'}
                                style={{ left: `${signature.x}%`, top: `${signature.y}%`, width: `${signature.w}%`, height: `${signature.h}%` }}
                                onSelect={() => setSelected('signature')}
                                onDrag={(event) => drag(event, signature.x, signature.y, (x, y) => setSignature((current) => ({ ...current, x, y })))}
                                onRemove={() => {
                                    setSignatureUrl(null);
                                    setSignatureFile(null);
                                    setRemoveSignature(true);
                                    setSignature((current) => ({ ...current, visible: false }));
                                }}
                            >
                                <img src={signatureSrc} alt="" className="h-full w-full object-contain" />
                            </Movable>
                        )}
                        {stampSrc && stamp.visible && (
                            <Movable
                                selected={selected === 'stamp'}
                                style={{ left: `${stamp.x}%`, top: `${stamp.y}%`, width: `${stamp.w}%`, height: `${stamp.h}%` }}
                                onSelect={() => setSelected('stamp')}
                                onDrag={(event) => drag(event, stamp.x, stamp.y, (x, y) => setStamp((current) => ({ ...current, x, y })))}
                                onRemove={() => {
                                    setStampUrl(null);
                                    setStampFile(null);
                                    setRemoveStamp(true);
                                    setStamp((current) => ({ ...current, visible: false }));
                                }}
                            >
                                <img src={stampSrc} alt="" className="h-full w-full object-contain" />
                            </Movable>
                        )}
                        {qr.visible && (
                            <Movable
                                selected={selected === 'qr'}
                                style={{ left: `${qr.x}%`, top: `${qr.y}%`, width: `${qr.size}%`, aspectRatio: '1' }}
                                onSelect={() => setSelected('qr')}
                                onDrag={(event) => drag(event, qr.x, qr.y, (x, y) => setQr((current) => ({ ...current, x, y })))}
                                onRemove={() => setQr((current) => ({ ...current, visible: false }))}
                            >
                                <div className="grid h-full place-items-center border border-dashed border-[#1a2b4c] bg-white text-[10px] text-[#1a2b4c]">
                                    QR
                                </div>
                            </Movable>
                        )}
                    </div>
                    </div>

                    <section className="rounded-2xl border border-[#d7e3f0] bg-white p-4">
                        <h2 className="text-sm font-semibold text-[#12355b]">Elemento seleccionado</h2>
                        {selectedBlock && (
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <p className="mb-2 text-xs font-medium text-[#5a7390]">Color</p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {TEXT_COLORS.map((swatch) => (
                                            <button
                                                key={swatch.value}
                                                type="button"
                                                title={swatch.name}
                                                aria-label={swatch.name}
                                                onClick={() => patchBlock(selectedBlock.id, { color: swatch.value })}
                                                className={`size-8 cursor-pointer rounded-full border-2 ${
                                                    selectedBlock.color.toLowerCase() === swatch.value
                                                        ? 'border-[#12355b]'
                                                        : 'border-transparent'
                                                }`}
                                                style={{ background: swatch.value, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)' }}
                                            />
                                        ))}
                                        <label className="flex cursor-pointer items-center gap-2 text-xs text-[#12355b]">
                                            Otro
                                            <input
                                                type="color"
                                                value={selectedBlock.color}
                                                onChange={(event) => patchBlock(selectedBlock.id, { color: event.target.value })}
                                                className="h-8 w-10 cursor-pointer rounded border border-[#c5d5e6] bg-white"
                                            />
                                        </label>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                <Field label="Texto">
                                    <textarea
                                        value={selectedBlock.text}
                                        rows={4}
                                        onChange={(event) => patchBlock(selectedBlock.id, { text: event.target.value })}
                                        className="rounded-md border border-[#c5d5e6] px-2 py-1 text-sm"
                                    />
                                </Field>
                                <Field label="Tamaño">
                                    <Input
                                        type="number"
                                        value={selectedBlock.size}
                                        onChange={(event) => patchBlock(selectedBlock.id, { size: Number(event.target.value) })}
                                    />
                                </Field>
                                <Field label="Ancho %">
                                    <Input
                                        type="number"
                                        value={selectedBlock.w}
                                        onChange={(event) => patchBlock(selectedBlock.id, { w: Number(event.target.value) })}
                                    />
                                </Field>
                                <Field label="Alineación">
                                    <select
                                        value={selectedBlock.align}
                                        onChange={(event) =>
                                            patchBlock(selectedBlock.id, { align: event.target.value as Block['align'] })
                                        }
                                        className="h-9 rounded-md border border-[#c5d5e6] px-2 text-sm"
                                    >
                                        <option value="left">Izquierda</option>
                                        <option value="center">Centro</option>
                                        <option value="right">Derecha</option>
                                    </select>
                                </Field>
                                <Field label="Fuente">
                                    <select
                                        value={selectedBlock.font}
                                        onChange={(event) => patchBlock(selectedBlock.id, { font: event.target.value })}
                                        className="h-9 rounded-md border border-[#c5d5e6] px-2 text-sm"
                                    >
                                        {fonts.map((font) => (
                                            <option key={font.id} value={font.id}>
                                                {font.label}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <label className="flex items-center gap-2 text-sm text-[#1a2b4c]">
                                    <input
                                        type="checkbox"
                                        checked={selectedBlock.weight === 'bold'}
                                        onChange={(event) =>
                                            patchBlock(selectedBlock.id, { weight: event.target.checked ? 'bold' : 'normal' })
                                        }
                                    />
                                    Negrita
                                </label>
                                </div>
                            </div>
                        )}
                        {selected === 'qr' && (
                            <Size
                                label="Tamaño del QR"
                                value={qr.size}
                                onChange={(size) => setQr((current) => ({ ...current, size }))}
                            />
                        )}
                        {selected === 'signature' && (
                            <FrameSize
                                frame={signature}
                                onChange={(patch) => setSignature((current) => ({ ...current, ...patch }))}
                            />
                        )}
                        {selected === 'stamp' && (
                            <FrameSize
                                frame={stamp}
                                onChange={(patch) => setStamp((current) => ({ ...current, ...patch }))}
                            />
                        )}
                        {selected === 'watermark' && (
                            <FrameSize
                                frame={watermark}
                                onChange={(patch) => setWatermark((current) => ({ ...current, ...patch }))}
                            />
                        )}
                        {logos.some((logo) => logo.id === selected) && (
                            <FrameSize
                                frame={logos.find((logo) => logo.id === selected)!}
                                onChange={(patch) =>
                                    setLogos((current) =>
                                        current.map((logo) => (logo.id === selected ? { ...logo, ...patch } : logo)),
                                    )
                                }
                            />
                        )}
                        {!selected && <p className="text-sm text-[#5a7390]">Selecciona un texto, logo, firma, sello o el QR para moverlo o ajustar su tamaño.</p>}
                        {!qr.visible && (
                            <Button type="button" variant="outline" onClick={() => setQr((current) => ({ ...current, visible: true }))}>
                                Mostrar QR
                            </Button>
                        )}
                    </section>
                    </div>
                </div>
            </div>

            <AppModal
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                title="Vista previa del certificado"
                footer={
                    <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>
                        Cerrar
                    </Button>
                }
                className="max-w-5xl"
            >
                <div className="mb-3">
                    <select
                        value={previewPerson ?? ''}
                        onChange={(event) => setPreviewPerson(Number(event.target.value))}
                        className="h-9 rounded-md border border-[#c5d5e6] px-2 text-sm"
                    >
                        {participants.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.full_name} · {item.dni}
                            </option>
                        ))}
                    </select>
                </div>
                {template.id && previewPerson && (
                    <iframe
                        title="Vista previa"
                        className="h-[70vh] w-full rounded-lg border border-[#d7e3f0]"
                        src={`/plataforma/certificados/plantillas/${template.id}/previsualizar?participante=${previewPerson}`}
                    />
                )}
            </AppModal>
        </>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid gap-1">
            <Label className="text-xs text-[#1a2b4c]">{label}</Label>
            {children}
        </div>
    );
}

function FileField({
    label,
    preview,
    onChange,
}: {
    label: string;
    preview?: string | null;
    onChange: (file: File | null) => void;
}) {
    return (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#c5d5e6] bg-[#f8fafc] px-3 py-2 hover:border-[#12355b]">
            {preview ? (
                <img src={preview} alt="" className="h-11 w-11 rounded-lg bg-white object-contain" />
            ) : (
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#e7eef6] text-lg text-[#12355b]">+</span>
            )}
            <span className="min-w-0">
                <span className="block text-sm font-medium text-[#12355b]">{label}</span>
                <span className="block text-xs text-[#5a7390]">PNG o JPG</span>
            </span>
            <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => onChange(event.target.files?.[0] ?? null)}
            />
        </label>
    );
}

function Accordion({
    title,
    hint,
    defaultOpen = false,
    children,
}: {
    title: string;
    hint: string;
    defaultOpen?: boolean;
    children: ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <Collapsible open={open} onOpenChange={setOpen} className="overflow-hidden rounded-2xl border border-[#d7e3f0] bg-white">
            <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left">
                <span>
                    <span className="block text-sm font-semibold text-[#12355b]">{title}</span>
                    <span className="block text-xs text-[#5a7390]">{hint}</span>
                </span>
                <ChevronDown className={`size-4 shrink-0 text-[#5a7390] transition ${open ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="grid gap-3 border-t border-[#e6eef6] px-4 py-4">{children}</CollapsibleContent>
        </Collapsible>
    );
}

function Movable({
    selected,
    style,
    onSelect,
    onDrag,
    onRemove,
    children,
}: {
    selected: boolean;
    style: CSSProperties;
    onSelect: () => void;
    onDrag: (event: ReactPointerEvent) => void;
    onRemove: () => void;
    children: ReactNode;
}) {
    return (
        <div
            className={`absolute cursor-move ${selected ? 'ring-2 ring-[#1a2b4c]' : ''}`}
            style={style}
            onPointerDown={(event) => {
                onSelect();
                onDrag(event);
            }}
        >
            {selected && <RemoveButton onRemove={onRemove} />}
            {children}
        </div>
    );
}

function Size({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
    return (
        <Field label={label}>
            <Input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
        </Field>
    );
}

function FrameSize({
    frame,
    onChange,
}: {
    frame: { w: number; h: number };
    onChange: (patch: { w: number; h: number }) => void;
}) {
    return (
        <>
            <Size label="Ancho %" value={frame.w} onChange={(w) => onChange({ w, h: frame.h })} />
            <Size label="Alto %" value={frame.h} onChange={(h) => onChange({ w: frame.w, h })} />
        </>
    );
}

CentralCertificateEditor.layout = {
    breadcrumbs: [
        { title: 'Panel', href: '/plataforma' },
        { title: 'Certificado', href: '/plataforma/certificados/plantillas' },
        { title: 'Plantilla', href: '/plataforma/certificados/plantillas' },
    ],
};
