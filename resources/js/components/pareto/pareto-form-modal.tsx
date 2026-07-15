import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, type FormEvent } from 'react';
import InputError from '@/components/input-error';
import type { ParetoItem, ParentOption } from '@/components/pareto/pareto-table';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

type Props = {
    open: boolean;
    item?: ParetoItem | null;
    checkTypeOptions: { value: string; label: string }[];
    parentOptions: ParentOption[];
    defaultTemplateType: 'tdp' | 'tdc';
    onClose: () => void;
};

export function ParetoFormModal({
    open,
    item = null,
    checkTypeOptions,
    parentOptions,
    defaultTemplateType,
    onClose,
}: Props) {
    const isEditing = Boolean(item);
    const form = useForm({
        template_type: 'tdp' as 'tdp' | 'tdc',
        parent_id: '' as string,
        item_number: '',
        label: '',
        sort_order: '',
        check_type: 'observation',
        weight: '0',
        is_active: true,
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({
            template_type: item?.template_type ?? defaultTemplateType,
            parent_id: item?.parent_id ? String(item.parent_id) : '',
            item_number: item?.item_number ?? '',
            label: item?.label ?? '',
            sort_order: item?.sort_order != null ? String(item.sort_order) : '',
            check_type: item?.check_type ?? 'observation',
            weight: item?.weight != null ? String(item.weight) : '0',
            is_active: item?.is_active ?? true,
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, item?.id, defaultTemplateType]);

    const parentsForTemplate = useMemo(
        () =>
            parentOptions.filter(
                (option) =>
                    option.template_type === form.data.template_type &&
                    option.id !== item?.id,
            ),
        [parentOptions, form.data.template_type, item?.id],
    );

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        const payload = {
            template_type: form.data.template_type,
            parent_id:
                form.data.parent_id === '' ? null : Number(form.data.parent_id),
            item_number: form.data.item_number,
            label: form.data.label,
            sort_order:
                form.data.sort_order === ''
                    ? null
                    : Number(form.data.sort_order),
            check_type: form.data.check_type,
            weight: Number(form.data.weight),
            is_active: Boolean(form.data.is_active),
        };

        const options = {
            preserveScroll: true,
            onSuccess: () => onClose(),
        };

        if (isEditing && item) {
            form.transform(() => payload);
            form.put(`/pareto/${item.id}`, {
                ...options,
                onFinish: () => form.transform((data) => data),
            });
            return;
        }

        form.transform(() => payload);
        form.post('/pareto', {
            ...options,
            onFinish: () => form.transform((data) => data),
        });
    };

    return (
        <AppModal
            open={open}
            onClose={onClose}
            title={isEditing ? 'Editar ítem Pareto' : 'Nuevo ítem Pareto'}
            description="Define la exigencia, tipo de check y su peso (%)."
            className="sm:max-w-lg"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="pareto-form"
                        disabled={form.processing}
                        className="cursor-pointer bg-[#2e5a9e] text-white hover:bg-[#1a2b4c]"
                    >
                        {form.processing ? <Spinner /> : null}
                        {isEditing ? 'Guardar' : 'Crear'}
                    </Button>
                </>
            }
        >
            <form id="pareto-form" className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">Plantilla *</Label>
                        <Select
                            value={form.data.template_type}
                            onValueChange={(value) =>
                                form.setData(
                                    'template_type',
                                    value as 'tdp' | 'tdc',
                                )
                            }
                        >
                            <SelectTrigger className="h-9 w-full cursor-pointer border-[#c5d5e6]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                <SelectItem value="tdp" className="cursor-pointer">
                                    TDP
                                </SelectItem>
                                <SelectItem value="tdc" className="cursor-pointer">
                                    TDC
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.template_type} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">Número *</Label>
                        <Input
                            value={form.data.item_number}
                            onChange={(e) =>
                                form.setData('item_number', e.target.value)
                            }
                            placeholder="1, 2, a..."
                            className="h-9 border-[#c5d5e6]"
                        />
                        <InputError message={form.errors.item_number} />
                    </div>
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">Exigencia *</Label>
                    <Input
                        value={form.data.label}
                        onChange={(e) => form.setData('label', e.target.value)}
                        placeholder="Texto de la exigencia"
                        className="h-9 border-[#c5d5e6]"
                    />
                    <InputError message={form.errors.label} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">
                            Tipo de check *
                        </Label>
                        <Select
                            value={form.data.check_type}
                            onValueChange={(value) =>
                                form.setData('check_type', value)
                            }
                        >
                            <SelectTrigger className="h-9 w-full cursor-pointer border-[#c5d5e6]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                {checkTypeOptions.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                        className="cursor-pointer"
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.check_type} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">Peso % *</Label>
                        <Input
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            value={form.data.weight}
                            onChange={(e) =>
                                form.setData('weight', e.target.value)
                            }
                            className="h-9 border-[#c5d5e6]"
                        />
                        <InputError message={form.errors.weight} />
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">Padre</Label>
                        <Select
                            value={form.data.parent_id || '__none'}
                            onValueChange={(value) =>
                                form.setData(
                                    'parent_id',
                                    value === '__none' ? '' : value,
                                )
                            }
                        >
                            <SelectTrigger className="h-9 w-full cursor-pointer border-[#c5d5e6]">
                                <SelectValue placeholder="Sin padre" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                <SelectItem
                                    value="__none"
                                    className="cursor-pointer"
                                >
                                    Sin padre
                                </SelectItem>
                                {parentsForTemplate.map((option) => (
                                    <SelectItem
                                        key={option.id}
                                        value={String(option.id)}
                                        className="cursor-pointer"
                                    >
                                        {option.item_number}. {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">Orden</Label>
                        <Input
                            type="number"
                            min={0}
                            value={form.data.sort_order}
                            onChange={(e) =>
                                form.setData('sort_order', e.target.value)
                            }
                            className="h-9 border-[#c5d5e6]"
                        />
                    </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#1a2b4c]">
                    <Checkbox
                        checked={form.data.is_active}
                        onCheckedChange={(checked) =>
                            form.setData('is_active', Boolean(checked))
                        }
                        className="border-[#c5d5e6]"
                    />
                    Activo (cuenta para el 100%)
                </label>
            </form>
        </AppModal>
    );
}
