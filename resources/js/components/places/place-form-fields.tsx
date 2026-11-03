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
                <Label htmlFor={`${idPrefix}-name`} className="text-brand-700">
                    Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                    id={`${idPrefix}-name`}
                    name="name"
                    value={values.name}
                    onChange={(event) => onChange('name', event.target.value)}
                    placeholder={namePlaceholder}
                    autoFocus
                    className="h-11 border-brand-300 bg-white focus-visible:border-brand-500 focus-visible:ring-brand-400/35"
                />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}-description`} className="text-brand-700">
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
                    className="border-brand-300 bg-white"
                />
                <InputError message={errors.description} />
            </div>

            <div className="grid gap-2">
                <Label className="text-brand-700">Estado</Label>
                <Select
                    value={values.status || 'active'}
                    onValueChange={(value) => onChange('status', value)}
                >
                    <SelectTrigger className="h-11 w-full cursor-pointer border-brand-300 bg-white text-brand-700">
                        <SelectValue placeholder="Selecciona estado" />
                    </SelectTrigger>
                    <SelectContent className="border-brand-200 bg-white">
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
