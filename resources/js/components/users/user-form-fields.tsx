import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type UserFormValues = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
};

type Props = {
    values: UserFormValues;
    errors: Partial<Record<keyof UserFormValues, string>>;
    onChange: (field: keyof UserFormValues, value: string) => void;
    isEditing?: boolean;
};

const passwordInputClassName =
    'h-11 border-[#c5d5e6] bg-white focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/35';

export function UserFormFields({
    values,
    errors,
    onChange,
    isEditing = false,
}: Props) {
    return (
        <div className="space-y-4">
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
                    autoFocus
                    className={passwordInputClassName}
                />
                <InputError message={errors.name} />
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
                    className={passwordInputClassName}
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
                    className={passwordInputClassName}
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
                    className={passwordInputClassName}
                    autoComplete="new-password"
                />
                <InputError message={errors.password_confirmation} />
            </div>
        </div>
    );
}
