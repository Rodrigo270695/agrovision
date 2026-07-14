import { Search } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
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

export type UserFormValues = {
    name: string;
    email: string;
    document_type: string;
    document_number: string;
    phone: string;
    password: string;
    password_confirmation: string;
};

type Props = {
    values: UserFormValues;
    errors: Partial<Record<keyof UserFormValues, string>>;
    onChange: (field: keyof UserFormValues, value: string) => void;
    isEditing?: boolean;
};

const inputClassName =
    'h-11 border-[#c5d5e6] bg-white focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/35';

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
            (payload as { errors?: Record<string, string[]> }).errors?.dni?.[0] ||
            'No se pudo completar la consulta.';

        throw new Error(message);
    }

    return payload as T;
}

export function UserFormFields({
    values,
    errors,
    onChange,
    isEditing = false,
}: Props) {
    const [dniLoading, setDniLoading] = useState(false);
    const [dniError, setDniError] = useState<string | null>(null);

    const isDni = values.document_type === 'dni';
    const documentDigits = isDni
        ? values.document_number.replace(/\D/g, '').slice(0, 8)
        : values.document_number.slice(0, 20);

    const phoneDigits = (() => {
        let digits = values.phone.replace(/\D/g, '').slice(0, 9);

        if (digits.length === 0) {
            return '';
        }

        if (!digits.startsWith('9')) {
            digits = `9${digits}`.slice(0, 9);
        }

        return digits;
    })();

    const normalizePhoneInput = (raw: string): string => {
        let digits = raw.replace(/\D/g, '');

        if (digits.length === 0) {
            return '';
        }

        if (!digits.startsWith('9')) {
            digits = `9${digits}`;
        }

        return digits.slice(0, 9);
    };

    const lookupDni = async () => {
        setDniError(null);

        if (documentDigits.length !== 8) {
            setDniError('El DNI debe tener exactamente 8 dígitos.');

            return;
        }

        setDniLoading(true);

        try {
            const data = await postJson<{ full_name: string }>('/consultas/dni', {
                dni: documentDigits,
            });

            onChange('name', data.full_name || values.name);
            onChange('document_number', documentDigits);
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
        <div className="space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="user-document_type" className="text-[#1a2b4c]">
                    Tipo de documento <span className="text-red-500">*</span>
                </Label>
                <Select
                    value={values.document_type || 'dni'}
                    onValueChange={(value) => {
                        setDniError(null);
                        onChange('document_type', value);
                        onChange('document_number', '');
                    }}
                >
                    <SelectTrigger
                        id="user-document_type"
                        className={`w-full cursor-pointer ${inputClassName}`}
                    >
                        <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent className="border-[#d7e3f0] bg-white">
                        <SelectItem value="dni" className="cursor-pointer">
                            DNI
                        </SelectItem>
                        <SelectItem value="ce" className="cursor-pointer">
                            Carnet de extranjería
                        </SelectItem>
                        <SelectItem value="pasaporte" className="cursor-pointer">
                            Pasaporte
                        </SelectItem>
                    </SelectContent>
                </Select>
                <InputError message={errors.document_type} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="user-document_number" className="text-[#1a2b4c]">
                    Número de documento <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-1.5">
                    <div className="relative min-w-0 flex-1">
                        <Input
                            id="user-document_number"
                            name="document_number"
                            inputMode={isDni ? 'numeric' : 'text'}
                            value={documentDigits}
                            onChange={(event) => {
                                setDniError(null);
                                const next = isDni
                                    ? event.target.value.replace(/\D/g, '').slice(0, 8)
                                    : event.target.value.slice(0, 20);
                                onChange('document_number', next);
                            }}
                            placeholder={isDni ? '8 dígitos' : 'Número de documento'}
                            className={`${inputClassName} ${isDni ? 'pr-12' : ''}`}
                        />
                        {isDni ? (
                            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] font-medium text-[#6b8ead]">
                                {documentDigits.length}/8
                            </span>
                        ) : null}
                    </div>
                    {isDni ? (
                        <Button
                            type="button"
                            variant="outline"
                            disabled={dniLoading || documentDigits.length !== 8}
                            onClick={() => void lookupDni()}
                            className="h-11 shrink-0 cursor-pointer border-[#c5d5e6] px-3 text-[#2e5a9e] hover:bg-[#e8f1fa] disabled:opacity-50"
                            aria-label="Buscar DNI"
                            title="Buscar DNI"
                        >
                            {dniLoading ? (
                                <Spinner />
                            ) : (
                                <>
                                    <Search className="size-4" />
                                    <span className="ml-1 hidden sm:inline">
                                        Buscar
                                    </span>
                                </>
                            )}
                        </Button>
                    ) : null}
                </div>
                <InputError
                    message={errors.document_number ?? dniError ?? undefined}
                />
                {isDni ? (
                    <p className="text-xs text-[#6b8ead]">
                        Busca el DNI para completar automáticamente el nombre.
                    </p>
                ) : null}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="user-name" className="text-[#1a2b4c]">
                    Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="user-name"
                    name="name"
                    value={values.name}
                    onChange={(event) => onChange('name', event.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className={inputClassName}
                />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="user-phone" className="text-[#1a2b4c]">
                    Celular <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                    <Input
                        id="user-phone"
                        name="phone"
                        inputMode="numeric"
                        value={phoneDigits}
                        onChange={(event) =>
                            onChange('phone', normalizePhoneInput(event.target.value))
                        }
                        onFocus={() => {
                            if (values.phone.replace(/\D/g, '').length === 0) {
                                onChange('phone', '9');
                            }
                        }}
                        placeholder="9XXXXXXXX"
                        maxLength={9}
                        className={`${inputClassName} pr-12`}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] font-medium text-[#6b8ead]">
                        {phoneDigits.length}/9
                    </span>
                </div>
                <InputError message={errors.phone} />
                <p className="text-xs text-[#6b8ead]">
                    Celular peruano: 9 dígitos, siempre empieza con 9.
                </p>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="user-email" className="text-[#1a2b4c]">
                    Correo <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="user-email"
                    name="email"
                    type="email"
                    value={values.email}
                    onChange={(event) => onChange('email', event.target.value)}
                    placeholder="Ej. juan@agrovision.com"
                    className={inputClassName}
                />
                <InputError message={errors.email} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="user-password" className="text-[#1a2b4c]">
                    Contraseña{' '}
                    {isEditing ? null : (
                        <span className="text-red-500">*</span>
                    )}
                </Label>
                <PasswordInput
                    id="user-password"
                    name="password"
                    value={values.password}
                    onChange={(event) =>
                        onChange('password', event.target.value)
                    }
                    placeholder={
                        isEditing
                            ? 'Dejar vacío para no cambiar'
                            : 'Mínimo 8 caracteres'
                    }
                    className={inputClassName}
                    autoComplete="new-password"
                />
                <InputError message={errors.password} />
                {isEditing ? (
                    <p className="text-xs text-[#6b8ead]">
                        Si no deseas cambiar la contraseña, deja estos campos
                        vacíos.
                    </p>
                ) : null}
            </div>

            <div className="grid gap-2">
                <Label
                    htmlFor="user-password-confirmation"
                    className="text-[#1a2b4c]"
                >
                    Confirmar contraseña{' '}
                    {isEditing ? null : (
                        <span className="text-red-500">*</span>
                    )}
                </Label>
                <PasswordInput
                    id="user-password-confirmation"
                    name="password_confirmation"
                    value={values.password_confirmation}
                    onChange={(event) =>
                        onChange('password_confirmation', event.target.value)
                    }
                    placeholder="Repite la contraseña"
                    className={inputClassName}
                    autoComplete="new-password"
                />
                <InputError message={errors.password_confirmation} />
            </div>
        </div>
    );
}
