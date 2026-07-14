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
                <Label htmlFor="role-name" className="text-[#1a2b4c]">
                    Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="role-name"
                    name="name"
                    value={values.name}
                    onChange={(event) => onChange('name', event.target.value)}
                    placeholder="Ej. Administrador"
                    autoFocus
                    className="h-11 border-[#c5d5e6] bg-white focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/35"
                />
                <InputError message={errors.name} />
            </div>
        </div>
    );
}
