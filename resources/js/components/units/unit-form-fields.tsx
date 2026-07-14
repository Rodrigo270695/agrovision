import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
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
import { Building2, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

export type PeriodOption = {
    id: number;
    name: string;
    status?: string;
    date?: string;
};

export type CoordinatorOption = {
    id: number;
    name: string;
    email?: string | null;
};

export type UnitFormValues = {
    period_id: string;
    correlative: string;
    phone: string;
    email: string;
    provider: string;
    route: string;
    vehicle_type: string;
    service_date: string;
    driver_name: string;
    plate_number: string;
    responsible_person: string;
    service_type: string;
    ruc: string;
    driver_dni: string;
    category: string;
    coordinator_id: string;
};

type Props = {
    values: UnitFormValues;
    errors: Partial<Record<keyof UnitFormValues, string>>;
    onChange: (field: keyof UnitFormValues, value: string) => void;
    periodOptions: PeriodOption[];
    coordinatorOptions: CoordinatorOption[];
};

type RucInfo = {
    ruc: string;
    name: string;
    state: string | null;
    condition: string | null;
    address: string | null;
};

const otherFields: Array<{
    key: keyof UnitFormValues;
    label: string;
    required?: boolean;
    type?: string;
    placeholder?: string;
    full?: boolean;
}> = [
    {
        key: 'correlative',
        label: 'Correlativo',
        required: true,
        placeholder: 'Ej. AGV2026-6955',
    },
    {
        key: 'phone',
        label: 'Celular',
        placeholder: 'Ej. 985555756',
    },
    {
        key: 'email',
        label: 'Correo',
        type: 'email',
        placeholder: 'Ej. conductor@agrovision.com',
        full: true,
    },
    {
        key: 'route',
        label: 'Ruta',
        placeholder: 'Ej. CAMPAMENT',
    },
    {
        key: 'vehicle_type',
        label: 'Tipo de vehículo',
        placeholder: 'Ej. MINIBUS',
    },
    {
        key: 'service_date',
        label: 'Fecha',
        type: 'date',
    },
    {
        key: 'plate_number',
        label: 'Placa',
        placeholder: 'Ej. T5M-121',
    },
    {
        key: 'responsible_person',
        label: 'Responsable',
        placeholder: 'Nombre del responsable',
    },
    {
        key: 'service_type',
        label: 'Tipo de servicio',
        placeholder: 'Ej. CAMPAMENT',
    },
    {
        key: 'category',
        label: 'Categoría',
        placeholder: 'Ej. B',
    },
];

function getXsrfToken(): string {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);

    return match ? decodeURIComponent(match[1]) : '';
}

async function postJson<T>(url: string, body: Record<string, string>): Promise<T> {
    const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': getXsrfToken(),
        },
        body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message =
            (payload as { message?: string }).message ||
            (payload as { errors?: Record<string, string[]> }).errors?.ruc?.[0] ||
            (payload as { errors?: Record<string, string[]> }).errors?.dni?.[0] ||
            'No se pudo completar la consulta.';

        throw new Error(message);
    }

    return payload as T;
}

export function UnitFormFields({
    values,
    errors,
    onChange,
    periodOptions,
    coordinatorOptions,
}: Props) {
    const [rucLoading, setRucLoading] = useState(false);
    const [dniLoading, setDniLoading] = useState(false);
    const [rucError, setRucError] = useState<string | null>(null);
    const [dniError, setDniError] = useState<string | null>(null);
    const [rucInfo, setRucInfo] = useState<RucInfo | null>(null);

    useEffect(() => {
        if (values.period_id === '' && periodOptions[0]) {
            onChange('period_id', String(periodOptions[0].id));
        }
    }, [values.period_id, periodOptions, onChange]);

    useEffect(() => {
        if (
            values.coordinator_id === '' &&
            coordinatorOptions.length === 1 &&
            coordinatorOptions[0]
        ) {
            onChange('coordinator_id', String(coordinatorOptions[0].id));
        }
    }, [values.coordinator_id, coordinatorOptions, onChange]);

    const periodSelectValue =
        values.period_id !== ''
            ? values.period_id
            : periodOptions[0]
              ? String(periodOptions[0].id)
              : 'none';

    const coordinatorSelectValue =
        values.coordinator_id !== '' ? values.coordinator_id : 'none';

    const rucDigits = values.ruc.replace(/\D/g, '').slice(0, 11);
    const dniDigits = values.driver_dni.replace(/\D/g, '').slice(0, 20);

    const lookupRuc = async () => {
        setRucError(null);
        setRucInfo(null);

        if (rucDigits.length !== 11) {
            setRucError('El RUC debe tener 11 dígitos.');

            return;
        }

        setRucLoading(true);

        try {
            const data = await postJson<RucInfo>('/consultas/ruc', {
                ruc: rucDigits,
            });

            setRucInfo(data);

            if (data.name) {
                onChange('provider', data.name);
            }
        } catch (error) {
            setRucError(
                error instanceof Error
                    ? error.message
                    : 'No se pudo consultar el RUC.',
            );
        } finally {
            setRucLoading(false);
        }
    };

    const lookupDni = async () => {
        setDniError(null);

        if (dniDigits.length !== 8) {
            setDniError('El DNI debe tener exactamente 8 dígitos.');

            return;
        }

        setDniLoading(true);

        try {
            const data = await postJson<{ full_name: string }>('/consultas/dni', {
                dni: dniDigits,
            });

            if (data.full_name) {
                onChange('driver_name', data.full_name.toUpperCase());
            }
        } catch (error) {
            setDniError(
                error instanceof Error
                    ? error.message
                    : 'No se pudo consultar el DNI.',
            );
        } finally {
            setDniLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
                <Label className="text-xs text-[#1a2b4c]">
                    Periodo <span className="text-red-500">*</span>
                </Label>
                <Select
                    value={periodSelectValue}
                    onValueChange={(value) => {
                        if (value === 'none') {
                            return;
                        }

                        onChange('period_id', value);
                    }}
                >
                    <SelectTrigger className="h-9 w-full cursor-pointer border-[#c5d5e6] bg-white text-sm text-[#1a2b4c]">
                        <SelectValue placeholder="Selecciona un periodo" />
                    </SelectTrigger>
                    <SelectContent className="border-[#d7e3f0] bg-white">
                        {periodOptions.length === 0 ? (
                            <SelectItem value="none" disabled>
                                No hay periodos disponibles
                            </SelectItem>
                        ) : (
                            periodOptions.map((period) => (
                                <SelectItem
                                    key={period.id}
                                    value={String(period.id)}
                                    className="cursor-pointer"
                                >
                                    {period.name}
                                    {period.status === 'inactive'
                                        ? ' (inactivo)'
                                        : ''}
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
                <InputError message={errors.period_id} />
            </div>

            {/* RUC + DNI primero para consultas SUNAT / RENIEC */}
            <div className="grid gap-1.5">
                <Label htmlFor="unit-ruc" className="text-xs text-[#1a2b4c]">
                    RUC
                </Label>
                <div className="flex gap-1.5">
                    <div className="relative min-w-0 flex-1">
                        <Input
                            id="unit-ruc"
                            name="ruc"
                            inputMode="numeric"
                            value={rucDigits}
                            onChange={(event) => {
                                setRucInfo(null);
                                setRucError(null);
                                onChange(
                                    'ruc',
                                    event.target.value.replace(/\D/g, '').slice(0, 11),
                                );
                            }}
                            placeholder="Ej. 20554556192"
                            maxLength={11}
                            className="h-9 border-[#c5d5e6] bg-white pr-14 text-sm focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/35"
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] font-medium text-[#6b8ead]">
                            {rucDigits.length}/11
                        </span>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={rucLoading}
                        onClick={() => void lookupRuc()}
                        className="size-9 shrink-0 cursor-pointer border-[#c5d5e6] text-[#2e5a9e] hover:bg-[#e8f1fa]"
                        aria-label="Consultar RUC en SUNAT"
                        title="Consultar RUC"
                    >
                        {rucLoading ? (
                            <Spinner />
                        ) : (
                            <Building2 className="size-4" />
                        )}
                    </Button>
                </div>
                <InputError message={errors.ruc ?? rucError ?? undefined} />
                {rucInfo ? (
                    <div className="rounded-lg border border-[#d7e3f0] bg-[#f8fafc] px-2.5 py-2 text-[11px] text-[#5a7390]">
                        <p className="font-semibold text-[#1a2b4c]">
                            {rucInfo.name || 'Sin razón social'}
                        </p>
                        {rucInfo.state ? (
                            <p>
                                Estado: <span className="text-[#1a2b4c]">{rucInfo.state}</span>
                            </p>
                        ) : null}
                        {rucInfo.condition ? (
                            <p>
                                Condición:{' '}
                                <span className="text-[#1a2b4c]">{rucInfo.condition}</span>
                            </p>
                        ) : null}
                        {rucInfo.address ? <p>Dirección: {rucInfo.address}</p> : null}
                    </div>
                ) : null}
            </div>

            <div className="grid gap-1.5">
                <Label htmlFor="unit-driver_dni" className="text-xs text-[#1a2b4c]">
                    DNI conductor
                </Label>
                <div className="flex gap-1.5">
                    <div className="relative min-w-0 flex-1">
                        <Input
                            id="unit-driver_dni"
                            name="driver_dni"
                            inputMode="numeric"
                            value={dniDigits}
                            onChange={(event) => {
                                setDniError(null);
                                onChange(
                                    'driver_dni',
                                    event.target.value.replace(/\D/g, '').slice(0, 8),
                                );
                            }}
                            placeholder="Ej. 46909313"
                            className="h-9 border-[#c5d5e6] bg-white pr-12 text-sm focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/35"
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] font-medium text-[#6b8ead]">
                            {dniDigits.length}/8
                        </span>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={dniLoading}
                        onClick={() => void lookupDni()}
                        className="size-9 shrink-0 cursor-pointer border-[#c5d5e6] text-[#2e5a9e] hover:bg-[#e8f1fa]"
                        aria-label="Consultar DNI"
                        title="Consultar DNI"
                    >
                        {dniLoading ? <Spinner /> : <Search className="size-4" />}
                    </Button>
                </div>
                <InputError message={errors.driver_dni ?? dniError ?? undefined} />
            </div>

            <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="unit-provider" className="text-xs text-[#1a2b4c]">
                    Proveedor <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="unit-provider"
                    name="provider"
                    value={values.provider}
                    onChange={(event) => onChange('provider', event.target.value)}
                    placeholder="Ej. AGROVISION PERU S.A.C."
                    className="h-9 border-[#c5d5e6] bg-white text-sm focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/35"
                />
                <InputError message={errors.provider} />
            </div>

            <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="unit-driver_name" className="text-xs text-[#1a2b4c]">
                    Conductor
                </Label>
                <Input
                    id="unit-driver_name"
                    name="driver_name"
                    value={values.driver_name}
                    onChange={(event) => onChange('driver_name', event.target.value)}
                    placeholder="Nombre del conductor"
                    className="h-9 border-[#c5d5e6] bg-white text-sm focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/35"
                />
                <InputError message={errors.driver_name} />
            </div>

            {otherFields.map((field) => (
                <div
                    key={field.key}
                    className={
                        field.full ? 'grid gap-1.5 sm:col-span-2' : 'grid gap-1.5'
                    }
                >
                    <Label
                        htmlFor={`unit-${field.key}`}
                        className="text-xs text-[#1a2b4c]"
                    >
                        {field.label}
                        {field.required ? (
                            <span className="text-red-500"> *</span>
                        ) : null}
                    </Label>
                    <Input
                        id={`unit-${field.key}`}
                        name={field.key}
                        type={field.type ?? 'text'}
                        value={values[field.key]}
                        onChange={(event) =>
                            onChange(field.key, event.target.value)
                        }
                        placeholder={field.placeholder}
                        autoFocus={field.key === 'correlative'}
                        className="h-9 border-[#c5d5e6] bg-white text-sm focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/35"
                    />
                    <InputError message={errors[field.key]} />
                </div>
            ))}

            <div className="grid gap-1.5 sm:col-span-2">
                <Label className="text-xs text-[#1a2b4c]">Coordinador</Label>
                <Select
                    value={coordinatorSelectValue}
                    onValueChange={(value) => {
                        onChange(
                            'coordinator_id',
                            value === 'none' ? '' : value,
                        );
                    }}
                    disabled={coordinatorOptions.length === 1}
                >
                    <SelectTrigger className="h-9 w-full cursor-pointer border-[#c5d5e6] bg-white text-sm text-[#1a2b4c] disabled:cursor-not-allowed">
                        <SelectValue placeholder="Selecciona un coordinador" />
                    </SelectTrigger>
                    <SelectContent className="border-[#d7e3f0] bg-white">
                        <SelectItem value="none" className="cursor-pointer">
                            Sin coordinador
                        </SelectItem>
                        {coordinatorOptions.map((coordinator) => (
                            <SelectItem
                                key={coordinator.id}
                                value={String(coordinator.id)}
                                className="cursor-pointer"
                            >
                                {coordinator.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={errors.coordinator_id} />
            </div>
        </div>
    );
}
