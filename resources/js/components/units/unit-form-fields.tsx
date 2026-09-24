import { Building2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import { SearchableCombobox } from '@/components/shared/searchable-combobox';
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

export type LicenseCategoryOption = {
    name: string;
    description?: string | null;
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
    vehicleTypeOptions: string[];
    licenseCategoryOptions: LicenseCategoryOption[];
    serviceTypeOptions: string[];
    responsibleOptions: string[];
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
        label: 'Categoría de licencia',
        placeholder: 'Ej. A-IIb',
    },
];

function formatPlateInput(value: string): string {
    const body = value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6);

    if (body.length <= 3) {
        return body;
    }

    return `${body.slice(0, 3)}-${body.slice(3)}`;
}

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

async function createCatalog(
    url: string,
    name: string,
): Promise<{ name: string; description?: string | null }> {
    const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': getXsrfToken(),
        },
        body: JSON.stringify({ name }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
        name?: string;
        description?: string | null;
        message?: string;
        errors?: Record<string, string[]>;
    };

    if (!response.ok) {
        const firstError = payload.errors
            ? Object.values(payload.errors).flat()[0]
            : undefined;

        throw new Error(
            firstError || payload.message || 'No se pudo crear el registro.',
        );
    }

    return {
        name: payload.name ?? name,
        description: payload.description,
    };
}

export function UnitFormFields({
    values,
    errors,
    onChange,
    periodOptions,
    coordinatorOptions,
    vehicleTypeOptions,
    licenseCategoryOptions,
    serviceTypeOptions,
    responsibleOptions,
}: Props) {
    const [rucLoading, setRucLoading] = useState(false);
    const [dniLoading, setDniLoading] = useState(false);
    const [rucError, setRucError] = useState<string | null>(null);
    const [dniError, setDniError] = useState<string | null>(null);
    const [rucInfo, setRucInfo] = useState<RucInfo | null>(null);
    const [vehicleTypes, setVehicleTypes] = useState(vehicleTypeOptions);
    const [licenseCategories, setLicenseCategories] = useState(
        licenseCategoryOptions,
    );
    const [serviceTypes, setServiceTypes] = useState(serviceTypeOptions);
    const [responsibles, setResponsibles] = useState(responsibleOptions);
    const [creatingField, setCreatingField] = useState<
        'vehicle_type' | 'category' | 'service_type' | 'responsible_person' | null
    >(null);
    const [catalogError, setCatalogError] = useState<
        Partial<
            Record<
                | 'vehicle_type'
                | 'category'
                | 'service_type'
                | 'responsible_person',
                string
            >
        >
    >({});
    const vehicleTypeKey = vehicleTypeOptions.join('\n');
    const licenseCategoryKey = licenseCategoryOptions
        .map((item) => item.name)
        .join('\n');
    const serviceTypeKey = serviceTypeOptions.join('\n');
    const responsibleKey = responsibleOptions.join('\n');

    useEffect(() => {
        setVehicleTypes(vehicleTypeOptions);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vehicleTypeKey]);

    useEffect(() => {
        setLicenseCategories(licenseCategoryOptions);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [licenseCategoryKey]);

    useEffect(() => {
        setServiceTypes(serviceTypeOptions);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serviceTypeKey]);

    useEffect(() => {
        setResponsibles(responsibleOptions);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [responsibleKey]);

    const vehicleTypeChoices = useMemo(() => {
        const names = [...vehicleTypes];
        const current = values.vehicle_type.trim();

        if (
            current !== '' &&
            !names.some((name) => name.toLowerCase() === current.toLowerCase())
        ) {
            names.push(current);
        }

        return names.map((name) => ({ value: name, label: name }));
    }, [values.vehicle_type, vehicleTypes]);

    const licenseCategoryChoices = useMemo(() => {
        const items = [...licenseCategories];
        const current = values.category.trim();

        if (
            current !== '' &&
            !items.some((item) => item.name.toLowerCase() === current.toLowerCase())
        ) {
            items.push({ name: current });
        }

        return items.map((item) => ({
            value: item.name,
            label: item.name,
            description: item.description ?? undefined,
        }));
    }, [licenseCategories, values.category]);

    const serviceTypeChoices = useMemo(() => {
        const names = [...serviceTypes];
        const current = values.service_type.trim();

        if (
            current !== '' &&
            !names.some((name) => name.toLowerCase() === current.toLowerCase())
        ) {
            names.push(current);
        }

        return names.map((name) => ({ value: name, label: name }));
    }, [serviceTypes, values.service_type]);

    const responsibleChoices = useMemo(() => {
        const names = [...responsibles];
        const current = values.responsible_person.trim();

        if (
            current !== '' &&
            !names.some((name) => name.toLowerCase() === current.toLowerCase())
        ) {
            names.push(current);
        }

        return names.map((name) => ({ value: name, label: name }));
    }, [responsibles, values.responsible_person]);

    const createVehicleType = async (name: string) => {
        setCatalogError((current) => ({ ...current, vehicle_type: undefined }));
        setCreatingField('vehicle_type');

        try {
            const created = await createCatalog(
                '/unidades/tipos-vehiculo',
                name,
            );

            setVehicleTypes((current) =>
                current.some(
                    (item) => item.toLowerCase() === created.name.toLowerCase(),
                )
                    ? current
                    : [...current, created.name],
            );
            onChange('vehicle_type', created.name);
        } catch (error) {
            setCatalogError((current) => ({
                ...current,
                vehicle_type:
                    error instanceof Error
                        ? error.message
                        : 'No se pudo crear el tipo de vehículo.',
            }));
        } finally {
            setCreatingField(null);
        }
    };

    const createLicenseCategory = async (name: string) => {
        setCatalogError((current) => ({ ...current, category: undefined }));
        setCreatingField('category');

        try {
            const created = await createCatalog(
                '/unidades/categorias-licencia',
                name,
            );

            setLicenseCategories((current) =>
                current.some(
                    (item) =>
                        item.name.toLowerCase() === created.name.toLowerCase(),
                )
                    ? current
                    : [
                          ...current,
                          {
                              name: created.name,
                              description: created.description,
                          },
                      ],
            );
            onChange('category', created.name);
        } catch (error) {
            setCatalogError((current) => ({
                ...current,
                category:
                    error instanceof Error
                        ? error.message
                        : 'No se pudo crear la categoría.',
            }));
        } finally {
            setCreatingField(null);
        }
    };

    const createServiceType = async (name: string) => {
        setCatalogError((current) => ({ ...current, service_type: undefined }));
        setCreatingField('service_type');

        try {
            const created = await createCatalog(
                '/unidades/tipos-servicio',
                name,
            );

            setServiceTypes((current) =>
                current.some(
                    (item) => item.toLowerCase() === created.name.toLowerCase(),
                )
                    ? current
                    : [...current, created.name],
            );
            onChange('service_type', created.name);
        } catch (error) {
            setCatalogError((current) => ({
                ...current,
                service_type:
                    error instanceof Error
                        ? error.message
                        : 'No se pudo crear el tipo de servicio.',
            }));
        } finally {
            setCreatingField(null);
        }
    };

    const createResponsible = async (name: string) => {
        setCatalogError((current) => ({
            ...current,
            responsible_person: undefined,
        }));
        setCreatingField('responsible_person');

        try {
            const created = await createCatalog('/unidades/responsables', name);

            setResponsibles((current) =>
                current.some(
                    (item) => item.toLowerCase() === created.name.toLowerCase(),
                )
                    ? current
                    : [...current, created.name],
            );
            onChange('responsible_person', created.name);
        } catch (error) {
            setCatalogError((current) => ({
                ...current,
                responsible_person:
                    error instanceof Error
                        ? error.message
                        : 'No se pudo crear el responsable.',
            }));
        } finally {
            setCreatingField(null);
        }
    };

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
                    {field.key === 'vehicle_type' ? (
                        <SearchableCombobox
                            id="unit-vehicle_type"
                            compact
                            value={
                                vehicleTypeChoices.find(
                                    (option) =>
                                        option.value.toLowerCase() ===
                                        values.vehicle_type.trim().toLowerCase(),
                                )?.value ?? null
                            }
                            options={vehicleTypeChoices}
                            onChange={(value) =>
                                onChange('vehicle_type', value ?? '')
                            }
                            onCreate={(name) => void createVehicleType(name)}
                            creating={creatingField === 'vehicle_type'}
                            placeholder="Buscar o crear tipo"
                            emptyMessage="No hay tipos de vehículo"
                        />
                    ) : field.key === 'service_type' ? (
                        <SearchableCombobox
                            id="unit-service_type"
                            compact
                            value={
                                serviceTypeChoices.find(
                                    (option) =>
                                        option.value.toLowerCase() ===
                                        values.service_type.trim().toLowerCase(),
                                )?.value ?? null
                            }
                            options={serviceTypeChoices}
                            onChange={(value) =>
                                onChange('service_type', value ?? '')
                            }
                            onCreate={(name) => void createServiceType(name)}
                            creating={creatingField === 'service_type'}
                            placeholder="Buscar o crear servicio"
                            emptyMessage="No hay tipos de servicio"
                        />
                    ) : field.key === 'responsible_person' ? (
                        <SearchableCombobox
                            id="unit-responsible_person"
                            compact
                            value={
                                responsibleChoices.find(
                                    (option) =>
                                        option.value.toLowerCase() ===
                                        values.responsible_person
                                            .trim()
                                            .toLowerCase(),
                                )?.value ?? null
                            }
                            options={responsibleChoices}
                            onChange={(value) =>
                                onChange('responsible_person', value ?? '')
                            }
                            onCreate={(name) => void createResponsible(name)}
                            creating={creatingField === 'responsible_person'}
                            placeholder="Buscar o crear responsable"
                            emptyMessage="Aún no hay responsables"
                        />
                    ) : field.key === 'category' ? (
                        <SearchableCombobox
                            id="unit-category"
                            compact
                            value={
                                licenseCategoryChoices.find(
                                    (option) =>
                                        option.value.toLowerCase() ===
                                        values.category.trim().toLowerCase(),
                                )?.value ?? null
                            }
                            options={licenseCategoryChoices}
                            onChange={(value) => onChange('category', value ?? '')}
                            onCreate={(name) => void createLicenseCategory(name)}
                            creating={creatingField === 'category'}
                            placeholder="Buscar o crear categoría"
                            emptyMessage="No hay categorías"
                        />
                    ) : (
                        <Input
                            id={`unit-${field.key}`}
                            name={field.key}
                            type={field.type ?? 'text'}
                            value={values[field.key]}
                            maxLength={field.key === 'plate_number' ? 7 : undefined}
                            onChange={(event) =>
                                onChange(
                                    field.key,
                                    field.key === 'plate_number'
                                        ? formatPlateInput(event.target.value)
                                        : event.target.value,
                                )
                            }
                            placeholder={field.placeholder}
                            autoFocus={field.key === 'correlative'}
                            className={
                                field.key === 'plate_number'
                                    ? 'h-9 border-[#c5d5e6] bg-white text-sm uppercase focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/35'
                                    : 'h-9 border-[#c5d5e6] bg-white text-sm focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/35'
                            }
                        />
                    )}
                    <InputError
                        message={
                            errors[field.key] ??
                            (field.key === 'vehicle_type' ||
                            field.key === 'category' ||
                            field.key === 'service_type' ||
                            field.key === 'responsible_person'
                                ? catalogError[field.key]
                                : undefined)
                        }
                    />
                </div>
            ))}

            <div className="grid gap-1.5 sm:col-span-2">
                <Label
                    htmlFor="unit-coordinator_id"
                    className="text-xs text-[#1a2b4c]"
                >
                    Coordinador
                </Label>
                <select
                    id="unit-coordinator_id"
                    name="coordinator_id"
                    value={coordinatorSelectValue}
                    onChange={(event) => {
                        const value = event.target.value;
                        onChange(
                            'coordinator_id',
                            value === 'none' ? '' : value,
                        );
                    }}
                    className="h-9 w-full cursor-pointer rounded-md border border-[#c5d5e6] bg-white px-3 text-sm text-[#1a2b4c] outline-none focus:border-[#2e5a9e] focus:ring-[3px] focus:ring-[#4a90e2]/35"
                >
                    <option value="none">Sin coordinador</option>
                    {coordinatorOptions.map((coordinator) => (
                        <option
                            key={coordinator.id}
                            value={String(coordinator.id)}
                        >
                            {coordinator.name}
                        </option>
                    ))}
                </select>
                {coordinatorOptions.length === 0 ? (
                    <p className="text-[11px] text-amber-700">
                        No hay usuarios con rol coordinador. Créalos en Usuarios
                        / Roles para poder asignarlos.
                    </p>
                ) : null}
                <InputError message={errors.coordinator_id} />
            </div>
        </div>
    );
}
