import { Head, router, useForm, usePage } from '@inertiajs/react';
import { CheckSquare2, Square, Zap } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { VerificationPhotoCapture } from '@/components/inductions/verification-photo-capture';
import type {
    InductionTypeOption,
    PeriodOption,
    SiteOption,
} from '@/components/inductions/induction-form-fields';
import { PageHeader } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { SearchableCombobox } from '@/components/shared/searchable-combobox';
import { useCan } from '@/hooks/use-can';
import { dashboard } from '@/routes';
import { cn } from '@/lib/utils';

function normalizeTime(value: string): string {
    const trimmed = value.trim();

    if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
        return trimmed.slice(0, 5);
    }

    return trimmed.slice(0, 5);
}

type Candidate = {
    key: string;
    dni: string;
    name: string;
    plate?: string | null;
    provider?: string | null;
    unit_id?: number | null;
    biometric_id: number;
};

type CatalogType = {
    slug: string;
    title: string;
    short: string;
    activity: string;
    activity_label: string;
};

type PageProps = {
    selectedType: string | null;
    catalogType: CatalogType | null;
    types: InductionTypeOption[];
    candidates: Candidate[];
    periodOptions: PeriodOption[];
    formOptions: { sites: SiteOption[] };
    defaults: {
        session_date: string;
        start_time: string;
        end_time: string;
        speaker_name: string;
        speaker_institution: string;
        period_id: number | null;
    };
};

const inputClass =
    'h-9 border-[#c5d5e6] bg-white text-sm focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/35';

export default function InductionQuickCompletePage({
    selectedType,
    catalogType,
    types,
    candidates,
    periodOptions,
    formOptions,
    defaults,
}: PageProps) {
    const { can } = useCan();
    const page = usePage();
    const flash = (page.props as { flash?: { toast?: { type?: string; message?: string } } })
        .flash;
    const [selected, setSelected] = useState<string[]>(
        candidates.map((item) => item.dni),
    );
    const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

    const form = useForm({
        induction_type: selectedType ?? '',
        session_date: defaults.session_date,
        start_time: defaults.start_time,
        end_time: defaults.end_time,
        period_id: defaults.period_id ? String(defaults.period_id) : '',
        site_id: '',
        place_id: '',
        speaker_name: defaults.speaker_name,
        speaker_institution: defaults.speaker_institution,
        dnis: candidates.map((item) => item.dni) as string[],
        photo_data_url: '',
    });

    useEffect(() => {
        const next = candidates.map((item) => item.dni);
        setSelected(next);
        form.setData('dnis', next);
        form.setData('induction_type', selectedType ?? '');
        setPhotoDataUrl(null);
        form.setData('photo_data_url', '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedType, candidates]);

    const sites = formOptions.sites ?? [];
    const selectedSite =
        sites.find((site) => String(site.id) === form.data.site_id) ?? null;
    const places = selectedSite?.places ?? [];

    const allSelected =
        candidates.length > 0 && selected.length === candidates.length;

    const toggleAll = () => {
        if (allSelected) {
            setSelected([]);
            form.setData('dnis', []);

            return;
        }

        const next = candidates.map((item) => item.dni);
        setSelected(next);
        form.setData('dnis', next);
    };

    const toggleOne = (dni: string, checked: boolean) => {
        const next = checked
            ? [...selected, dni]
            : selected.filter((item) => item !== dni);
        setSelected(next);
        form.setData('dnis', next);
    };

    const selectType = (slug: string) => {
        router.get(
            '/inducciones/cierre-rapido',
            { type: slug },
            { preserveState: false, preserveScroll: true },
        );
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!form.data.induction_type) {
            toast.error('Selecciona un tipo de inducción o capacitación.');

            return;
        }

        if (selected.length === 0) {
            toast.error('Selecciona al menos un conductor.');

            return;
        }

        if (!form.data.session_date || !form.data.period_id) {
            toast.error('Completa la fecha y el periodo.');

            return;
        }

        if (!photoDataUrl) {
            toast.error('Sube o toma la foto de evidencia.');

            return;
        }

        form.transform((data) => ({
            ...data,
            induction_type: data.induction_type || selectedType || '',
            start_time: normalizeTime(data.start_time),
            end_time: normalizeTime(data.end_time),
            period_id: data.period_id === '' ? null : Number(data.period_id),
            site_id: data.site_id === '' ? null : Number(data.site_id),
            place_id: data.place_id === '' ? null : Number(data.place_id),
            dnis: selected,
            photo_data_url: photoDataUrl,
        }));

        form.post('/inducciones/cierre-rapido', {
            preserveScroll: true,
            onSuccess: () => {
                setPhotoDataUrl(null);
                toast.success('Paquete creado y cerrado.');
            },
            onError: (errors) => {
                const first = Object.values(errors)[0];
                toast.error(
                    typeof first === 'string'
                        ? first
                        : 'No se pudo crear el paquete. Revisa los datos.',
                );
            },
            onFinish: () => form.transform((data) => data),
        });
    };

    if (!can('inductions.quick_complete')) {
        return (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-[#5a7390]">
                No tienes permiso para esta vista.
            </div>
        );
    }

    return (
        <>
            <Head title="Inducción · Cierre rápido" />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Cierre rápido de faltantes"
                    description="Elige el tipo, revisa quién falta con firma y huella, sube la foto de evidencia y cierra el paquete."
                    stats={[
                        {
                            label: 'Tipos',
                            value: types.length,
                            variant: 'info',
                            icon: Zap,
                        },
                        {
                            label: 'Elegibles',
                            value: candidates.length,
                            variant: 'warning',
                            icon: CheckSquare2,
                        },
                        {
                            label: 'Seleccionados',
                            value: selected.length,
                            variant: 'success',
                            icon: Square,
                        },
                    ]}
                />

                {flash?.toast?.message ? (
                    <p
                        className={cn(
                            'rounded-xl border px-3 py-2 text-sm',
                            flash.toast.type === 'error'
                                ? 'border-red-200 bg-red-50 text-red-800'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-800',
                        )}
                    >
                        {flash.toast.message}
                    </p>
                ) : null}

                <section className="rounded-2xl border border-[#e2eaf3] bg-white p-4">
                    <h2 className="text-xs font-semibold tracking-wide text-[#1a2b4c] uppercase">
                        1. Tipo de inducción / capacitación
                    </h2>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {types.map((type) => {
                            const active = selectedType === type.value;

                            return (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => selectType(type.value)}
                                    className={cn(
                                        'cursor-pointer rounded-xl border px-3 py-3 text-left transition',
                                        active
                                            ? 'border-[#2e5a9e] bg-[#e8f1fa] shadow-sm'
                                            : 'border-[#e2eaf3] hover:border-[#c5d5e6] hover:bg-[#f8fafc]',
                                    )}
                                >
                                    <p className="text-sm font-semibold text-[#1a2b4c]">
                                        {type.short || type.label}
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-xs text-[#5a7390]">
                                        {type.label}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {!selectedType ? (
                    <p className="text-sm text-[#5a7390]">
                        Selecciona un tipo para ver quién falta.
                    </p>
                ) : (
                    <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                        <section className="rounded-2xl border border-[#e2eaf3] bg-white p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h2 className="text-xs font-semibold tracking-wide text-[#1a2b4c] uppercase">
                                        2. Conductores faltantes
                                    </h2>
                                    <p className="mt-1 text-xs text-[#5a7390]">
                                        Solo con firma y huella guardadas ·{' '}
                                        {catalogType?.title}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={toggleAll}
                                    disabled={candidates.length === 0}
                                    className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                                >
                                    {allSelected ? 'Quitar todos' : 'Marcar todos'}
                                </Button>
                            </div>

                            {candidates.length === 0 ? (
                                <p className="mt-4 rounded-xl border border-dashed border-[#d7e3f0] bg-[#f8fafc] px-3 py-8 text-center text-sm text-[#5a7390]">
                                    Nadie falta con firma y huella para este tipo.
                                </p>
                            ) : (
                                <ul className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                                    {candidates.map((item) => {
                                        const checked = selected.includes(item.dni);

                                        return (
                                            <li
                                                key={item.dni}
                                                className="flex items-start gap-3 rounded-xl border border-[#e2eaf3] px-3 py-2.5"
                                            >
                                                <Checkbox
                                                    checked={checked}
                                                    onCheckedChange={(value) =>
                                                        toggleOne(item.dni, value === true)
                                                    }
                                                    className="mt-0.5"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium text-[#1a2b4c]">
                                                        {item.name}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-[#5a7390]">
                                                        DNI {item.dni}
                                                        {item.plate ? ` · ${item.plate}` : ''}
                                                        {item.provider
                                                            ? ` · ${item.provider}`
                                                            : ''}
                                                    </p>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            <InputError message={(form.errors as Record<string, string>).dnis} />
                        </section>

                        <section className="space-y-4 rounded-2xl border border-[#e2eaf3] bg-white p-4">
                            <h2 className="text-xs font-semibold tracking-wide text-[#1a2b4c] uppercase">
                                3. Paquete y evidencia
                            </h2>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-[#1a2b4c]">
                                        Fecha <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        type="date"
                                        value={form.data.session_date}
                                        onChange={(e) =>
                                            form.setData('session_date', e.target.value)
                                        }
                                        className={inputClass}
                                    />
                                    <InputError message={form.errors.session_date} />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-[#1a2b4c]">
                                        Periodo <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        modal={false}
                                        value={form.data.period_id || undefined}
                                        onValueChange={(value) =>
                                            form.setData('period_id', value)
                                        }
                                    >
                                        <SelectTrigger
                                            className={cn(inputClass, 'w-full cursor-pointer')}
                                        >
                                            <SelectValue placeholder="Selecciona" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white">
                                            {periodOptions.map((period) => (
                                                <SelectItem
                                                    key={period.id}
                                                    value={String(period.id)}
                                                    className="cursor-pointer"
                                                >
                                                    {period.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={form.errors.period_id} />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-[#1a2b4c]">Inicio</Label>
                                    <Input
                                        type="time"
                                        value={form.data.start_time}
                                        onChange={(e) =>
                                            form.setData('start_time', e.target.value)
                                        }
                                        className={inputClass}
                                    />
                                    <InputError message={form.errors.start_time} />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-[#1a2b4c]">Fin</Label>
                                    <Input
                                        type="time"
                                        value={form.data.end_time}
                                        onChange={(e) =>
                                            form.setData('end_time', e.target.value)
                                        }
                                        className={inputClass}
                                    />
                                    <InputError message={form.errors.end_time} />
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-[#1a2b4c]">Sede</Label>
                                    <SearchableCombobox
                                        value={form.data.site_id || null}
                                        onChange={(value) => {
                                            form.setData('site_id', value ?? '');
                                            form.setData('place_id', '');
                                        }}
                                        options={sites.map((site) => ({
                                            value: String(site.id),
                                            label: site.name,
                                        }))}
                                        placeholder="Selecciona sede"
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-[#1a2b4c]">Lugar</Label>
                                    <SearchableCombobox
                                        value={form.data.place_id || null}
                                        onChange={(value) =>
                                            form.setData('place_id', value ?? '')
                                        }
                                        options={places.map((place) => ({
                                            value: String(place.id),
                                            label: place.name,
                                        }))}
                                        placeholder={
                                            form.data.site_id
                                                ? 'Selecciona lugar'
                                                : 'Elige sede primero'
                                        }
                                        disabled={!form.data.site_id}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-[#1a2b4c]">Expositor</Label>
                                    <Input
                                        value={form.data.speaker_name}
                                        onChange={(e) =>
                                            form.setData('speaker_name', e.target.value)
                                        }
                                        className={inputClass}
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-[#1a2b4c]">Institución</Label>
                                    <Input
                                        value={form.data.speaker_institution}
                                        onChange={(e) =>
                                            form.setData(
                                                'speaker_institution',
                                                e.target.value,
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-1.5">
                                <Label className="text-xs text-[#1a2b4c]">
                                    Foto de evidencia <span className="text-red-500">*</span>
                                </Label>
                                <VerificationPhotoCapture
                                    existingUrl={photoDataUrl}
                                    saving={form.processing}
                                    autoCommit
                                    onSave={(dataUrl) => {
                                        setPhotoDataUrl(dataUrl);
                                        form.setData('photo_data_url', dataUrl);
                                    }}
                                    onRemove={() => {
                                        setPhotoDataUrl(null);
                                        form.setData('photo_data_url', '');
                                    }}
                                />
                                <InputError
                                    message={
                                        (form.errors as Record<string, string>)
                                            .photo_data_url
                                    }
                                />
                                {photoDataUrl ? (
                                    <p className="text-xs text-emerald-700">
                                        Evidencia lista para cerrar el paquete.
                                    </p>
                                ) : (
                                    <p className="text-xs text-amber-700">
                                        Falta la foto de evidencia.
                                    </p>
                                )}
                            </div>

                            {Object.keys(form.errors).length > 0 ? (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                                    {Object.values(form.errors)
                                        .flat()
                                        .filter(Boolean)
                                        .slice(0, 4)
                                        .map((message) => (
                                            <p key={String(message)}>{String(message)}</p>
                                        ))}
                                </div>
                            ) : null}

                            <Button
                                type="submit"
                                disabled={form.processing}
                                className="w-full cursor-pointer gap-2 bg-[#1a2b4c] text-white hover:bg-[#122038] disabled:opacity-50"
                            >
                                {form.processing ? <Spinner /> : <Zap className="size-4" />}
                                Crear paquete y cerrar ({selected.length})
                            </Button>
                        </section>
                    </form>
                )}
            </div>
        </>
    );
}

InductionQuickCompletePage.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Inducción', href: '/inducciones' },
        { title: 'Cierre rápido', href: '/inducciones/cierre-rapido' },
    ],
};
