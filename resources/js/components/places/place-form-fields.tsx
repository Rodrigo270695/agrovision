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

export type PlaceFormValues = {
    name: string;
    description: string;
    status: 'active' | 'inactive';
};

type Props = {
    values: PlaceFormValues;
    errors: Partial<Record<keyof PlaceFormValues, string>>;
    onChange: (field: keyof PlaceFormValues, value: string) => void;
    idPrefix?: string;
    namePlaceholder?: string;
    descriptionPlaceholder?: string;
};

export function PlaceFormFields({
    values,
    errors,
    onChange,
    idPrefix = 'place',
    namePlaceholder = 'Ej. Garita 1',
    descriptionPlaceholder = 'Detalle opcional del lugar',
}: Props) {
    return (
        <div className="space-y-4">
            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}-name`} className="text-[#1a2b4c]">
                    Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                    id={`${idPrefix}-name`}
                    name="name"
                    value={values.name}
                    onChange={(event) => onChange('name', event.target.value)}
                    placeholder={namePlaceholder}
                    autoFocus
                    className="h-11 border-[#c5d5e6] bg-white focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/35"
                />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}-description`} className="text-[#1a2b4c]">
                    Descripción
                </Label>
                <Textarea
                    id={`${idPrefix}-description`}
                    name="description"
                    value={values.description}
                    onChange={(event) =>
                        onChange('description', event.target.value)
                    }
                    placeholder={descriptionPlaceholder}
                    rows={3}
                    className="border-[#c5d5e6] bg-white"
                />
                <InputError message={errors.description} />
            </div>

            <div className="grid gap-2">
                <Label className="text-[#1a2b4c]">Estado</Label>
                <Select
                    value={values.status || 'active'}
                    onValueChange={(value) => onChange('status', value)}
                >
                    <SelectTrigger className="h-11 w-full cursor-pointer border-[#c5d5e6] bg-white text-[#1a2b4c]">
                        <SelectValue placeholder="Selecciona estado" />
                    </SelectTrigger>
                    <SelectContent className="border-[#d7e3f0] bg-white">
                        <SelectItem value="active" className="cursor-pointer">
                            Activo
                        </SelectItem>
                        <SelectItem value="inactive" className="cursor-pointer">
                            Inactivo
                        </SelectItem>
                    </SelectContent>
                </Select>
                <InputError message={errors.status} />
            </div>
        </div>
    );
}
