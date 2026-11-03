import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type RoleFormValues = {
    name: string;
};

type Props = {
    values: RoleFormValues;
    errors: Partial<Record<keyof RoleFormValues, string>>;
    onChange: (field: keyof RoleFormValues, value: string) => void;
};

export function RoleFormFields({ values, errors, onChange }: Props) {
    return (
        <div className="space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="role-name" className="text-brand-700">
                    Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="role-name"
                    name="name"
                    value={values.name}
                    onChange={(event) => onChange('name', event.target.value)}
                    placeholder="Ej. Administrador"
                    autoFocus
                    className="h-11 border-brand-300 bg-white focus-visible:border-brand-500 focus-visible:ring-brand-400/35"
                />
                <InputError message={errors.name} />
            </div>
        </div>
    );
}
