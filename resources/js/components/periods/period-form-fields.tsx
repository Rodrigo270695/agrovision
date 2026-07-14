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

export type PeriodFormValues = {
    name: string;
    date: string;
    status: 'active' | 'inactive';
};

type Props = {
    values: PeriodFormValues;
    errors: Partial<Record<keyof PeriodFormValues, string>>;
    onChange: (field: keyof PeriodFormValues, value: string) => void;
};

export function PeriodFormFields({ values, errors, onChange }: Props) {
    return (
        <div className="space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="period-name" className="text-[#1a2b4c]">
                    Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="period-name"
                    name="name"
                    value={values.name}
                    onChange={(event) => onChange('name', event.target.value)}
                    placeholder="Ej. Periodo Julio 2026"
                    autoFocus
                    className="h-11 border-[#c5d5e6] bg-white focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/35"
                />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="period-date" className="text-[#1a2b4c]">
                    Fecha <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="period-date"
                    name="date"
                    type="date"
                    value={values.date}
                    onChange={(event) => onChange('date', event.target.value)}
                    className="h-11 border-[#c5d5e6] bg-white focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/35"
                />
                <InputError message={errors.date} />
            </div>

            <div className="grid gap-2">
                <Label className="text-[#1a2b4c]">
                    Estado <span className="text-red-500">*</span>
                </Label>
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
