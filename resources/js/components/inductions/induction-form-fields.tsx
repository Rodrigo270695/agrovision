import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export type InductionFormValues = {
    title: string;
    document_code: string;
    document_revision: string;
    temario: string;
    activity: string;
    corrective_action: boolean;
    modality: string;
    school: string;
    categories: string[];
    category_other: string;
    session_date: string;
    start_time: string;
    end_time: string;
    estimated_minutes: string;
    sede: string;
    department: string;
    area: string;
    section: string;
    zone: string;
    target_group: string;
    crop: string;
    org_unit: string;
    speaker_name: string;
    speaker_institution: string;
    period_id: string;
    status: string;
    notes: string;
};

export type PeriodOption = {
    id: number;
    name: string;
    status?: string;
    date?: string;
};

export type FormOption = { value: string; label: string };

export type InductionFormOptions = {
    activities: FormOption[];
    modalities: FormOption[];
    schools: FormOption[];
    categories: FormOption[];
};

type Props = {
    values: InductionFormValues;
    errors: Partial<Record<keyof InductionFormValues | 'categories', string>>;
    onChange: <K extends keyof InductionFormValues>(
        field: K,
        value: InductionFormValues[K],
    ) => void;
    periodOptions: PeriodOption[];
    formOptions: InductionFormOptions;
    isEditing?: boolean;
};

const inputClass =
    'h-9 border-[#c5d5e6] bg-white text-sm focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/35';

function SectionTitle({ children }: { children: string }) {
    return (
        <p className="border-b border-[#e2eaf3] pb-1 text-xs font-semibold tracking-wide text-[#1a2b4c] uppercase">
            {children}
        </p>
    );
}

export function InductionFormFields({
    values,
    errors,
    onChange,
    periodOptions,
    formOptions,
    isEditing = false,
}: Props) {
    const toggleCategory = (value: string, checked: boolean) => {
        const next = checked
            ? [...values.categories, value]
            : values.categories.filter((item) => item !== value);
        onChange('categories', next);
    };

    return (
        <div className="space-y-5">
            <div className="space-y-3">
                <SectionTitle>Código del formato</SectionTitle>
                <p className="text-xs text-[#5a6f8c]">
                    Este código y revisión aparecen en la cabecera del acta y del
                    comprobante. La fecha se toma de la sesión (dd-mm-yyyy).
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">
                            Código <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={values.document_code}
                            onChange={(e) =>
                                onChange('document_code', e.target.value)
                            }
                            placeholder="GH-GD-FO-0609"
                            className={inputClass}
                            autoFocus
                        />
                        <InputError message={errors.document_code} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">
                            Revisión <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={values.document_revision}
                            onChange={(e) =>
                                onChange('document_revision', e.target.value)
                            }
                            placeholder="006"
                            className={inputClass}
                        />
                        <InputError message={errors.document_revision} />
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <SectionTitle>Tema y temario</SectionTitle>
                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">
                        Tema <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        value={values.title}
                        onChange={(e) => onChange('title', e.target.value)}
                        placeholder="Ej. Identificación de peligros..."
                        className={inputClass}
                    />
                    <InputError message={errors.title} />
                </div>
                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">Temario</Label>
                    <Textarea
                        value={values.temario}
                        onChange={(e) => onChange('temario', e.target.value)}
                        placeholder="Detalle de los puntos a tratar"
                        className="min-h-20 border-[#c5d5e6] bg-white text-sm"
                    />
                    <InputError message={errors.temario} />
                </div>
            </div>

            <div className="space-y-3">
                <SectionTitle>Clasificación</SectionTitle>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">
                            Actividad <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={values.activity}
                            onValueChange={(v) => onChange('activity', v)}
                        >
                            <SelectTrigger className={cn(inputClass, 'w-full cursor-pointer')}>
                                <SelectValue placeholder="Selecciona" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                {formOptions.activities.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value} className="cursor-pointer">
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.activity} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">
                            Modalidad <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={values.modality}
                            onValueChange={(v) => onChange('modality', v)}
                        >
                            <SelectTrigger className={cn(inputClass, 'w-full cursor-pointer')}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                {formOptions.modalities.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value} className="cursor-pointer">
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.modality} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">
                            Escuela <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={values.school}
                            onValueChange={(v) => onChange('school', v)}
                        >
                            <SelectTrigger className={cn(inputClass, 'w-full cursor-pointer')}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                {formOptions.schools.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value} className="cursor-pointer">
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.school} />
                    </div>
                    <div className="flex items-end gap-2 pb-1">
                        <Checkbox
                            id="corrective_action"
                            checked={values.corrective_action}
                            onCheckedChange={(checked) =>
                                onChange('corrective_action', checked === true)
                            }
                            className="border-[#c5d5e6] data-[state=checked]:border-[#2e5a9e] data-[state=checked]:bg-[#2e5a9e] data-[state=checked]:text-white"
                        />
                        <Label htmlFor="corrective_action" className="cursor-pointer text-xs text-[#1a2b4c]">
                            Acción correctiva
                        </Label>
                    </div>
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">
                        Categorías <span className="text-red-500">*</span>
                    </Label>
                    <div className="grid gap-2 rounded-xl border border-[#e2eaf3] bg-[#f8fafc] p-3 sm:grid-cols-2">
                        {formOptions.categories.map((opt) => {
                            const checked = values.categories.includes(opt.value);

                            return (
                                <label
                                    key={opt.value}
                                    className="flex cursor-pointer items-start gap-2 text-xs text-[#1a2b4c]"
                                >
                                    <Checkbox
                                        checked={checked}
                                        onCheckedChange={(state) =>
                                            toggleCategory(opt.value, state === true)
                                        }
                                        className="mt-0.5 border-[#c5d5e6] data-[state=checked]:border-[#2e5a9e] data-[state=checked]:bg-[#2e5a9e] data-[state=checked]:text-white"
                                    />
                                    <span>{opt.label}</span>
                                </label>
                            );
                        })}
                    </div>
                    <InputError message={errors.categories} />
                    {values.categories.includes('otros') ? (
                        <Input
                            value={values.category_other}
                            onChange={(e) => onChange('category_other', e.target.value)}
                            placeholder="Especificar otra categoría"
                            className={inputClass}
                        />
                    ) : null}
                </div>
            </div>

            <div className="space-y-3">
                <SectionTitle>Fecha, hora y ubicación</SectionTitle>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">
                            Fecha <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            type="date"
                            value={values.session_date}
                            onChange={(e) => onChange('session_date', e.target.value)}
                            className={inputClass}
                        />
                        <InputError message={errors.session_date} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">
                            Periodo <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={values.period_id || '__none'}
                            onValueChange={(v) =>
                                onChange(
                                    'period_id',
                                    v === '__none' ? '' : v,
                                )
                            }
                        >
                            <SelectTrigger className={cn(inputClass, 'w-full cursor-pointer')}>
                                <SelectValue placeholder="Selecciona un periodo" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                <SelectItem
                                    value="__none"
                                    className="cursor-pointer text-[#6b8ead]"
                                >
                                    Selecciona un periodo
                                </SelectItem>
                                {periodOptions.map((p) => (
                                    <SelectItem key={p.id} value={String(p.id)} className="cursor-pointer">
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.period_id} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">
                            Hora inicio <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            type="time"
                            value={values.start_time}
                            onChange={(e) => onChange('start_time', e.target.value)}
                            className={inputClass}
                        />
                        <InputError message={errors.start_time} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">
                            Hora término <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            type="time"
                            value={values.end_time}
                            onChange={(e) => onChange('end_time', e.target.value)}
                            className={inputClass}
                        />
                        <InputError message={errors.end_time} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">Tiempo estimado (min)</Label>
                        <Input
                            type="number"
                            min={1}
                            value={values.estimated_minutes}
                            onChange={(e) => onChange('estimated_minutes', e.target.value)}
                            placeholder="60"
                            className={inputClass}
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">Sede</Label>
                        <Input
                            value={values.sede}
                            onChange={(e) => onChange('sede', e.target.value)}
                            placeholder="Ej. OLMOS C5"
                            className={inputClass}
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">Departamento</Label>
                        <Input
                            value={values.department}
                            onChange={(e) => onChange('department', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">Área</Label>
                        <Input
                            value={values.area}
                            onChange={(e) => onChange('area', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">Sección</Label>
                        <Input
                            value={values.section}
                            onChange={(e) => onChange('section', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">Zona</Label>
                        <Input
                            value={values.zone}
                            onChange={(e) => onChange('zone', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">Grupo objetivo</Label>
                        <Input
                            value={values.target_group}
                            onChange={(e) => onChange('target_group', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">Cultivo</Label>
                        <Input
                            value={values.crop}
                            onChange={(e) => onChange('crop', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className="grid gap-1.5 sm:col-span-2">
                        <Label className="text-xs text-[#1a2b4c]">Unidad</Label>
                        <Input
                            value={values.org_unit}
                            onChange={(e) => onChange('org_unit', e.target.value)}
                            placeholder="Ej. Agrícola"
                            className={inputClass}
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <SectionTitle>Expositor</SectionTitle>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">Nombre del expositor</Label>
                        <Input
                            value={values.speaker_name}
                            onChange={(e) => onChange('speaker_name', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">Institución de procedencia</Label>
                        <Input
                            value={values.speaker_institution}
                            onChange={(e) =>
                                onChange('speaker_institution', e.target.value)
                            }
                            placeholder="AGROVISION PERÚ SAC"
                            className={inputClass}
                        />
                    </div>
                </div>
            </div>

            {!isEditing ? (
                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">Estado inicial</Label>
                    <Select
                        value={values.status || 'scheduled'}
                        onValueChange={(v) => onChange('status', v)}
                    >
                        <SelectTrigger className={cn(inputClass, 'w-full cursor-pointer')}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                            <SelectItem value="draft" className="cursor-pointer">
                                Borrador
                            </SelectItem>
                            <SelectItem value="scheduled" className="cursor-pointer">
                                Programada
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            ) : null}
        </div>
    );
}
