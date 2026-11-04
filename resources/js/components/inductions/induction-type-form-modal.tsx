import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import InputError from '@/components/input-error';
import type { InductionCatalogItem } from '@/components/inductions/induction-catalog';
import type { FormOption } from '@/components/inductions/induction-form-fields';
import { AppModal } from '@/components/shared/app-modal';
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
import { cn } from '@/lib/utils';

type Props = {
    open: boolean;
    activityOptions: FormOption[];
    catalog?: InductionCatalogItem[];
    editing?: InductionCatalogItem | null;
    onClose: () => void;
};

const inputClass =
    'h-9 border-brand-300 bg-white text-sm focus-visible:border-brand-500 focus-visible:ring-brand-400/35';

export function normalizeTypeTitle(value: string): string {
    return value
        .trim()
        .toLocaleLowerCase('es')
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[^a-z0-9\s]+/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function InductionTypeFormModal({
    open,
    activityOptions,
    catalog = [],
    editing = null,
    onClose,
}: Props) {
    const isEditing = Boolean(editing);
    const form = useForm({
        title: '',
        activity: 'capacitacion',
        short: '',
        merge: false,
    });
    const [mergeTarget, setMergeTarget] = useState<InductionCatalogItem | null>(
        null,
    );

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({
            title: editing?.title ?? '',
            activity: editing?.activity ?? 'capacitacion',
            short: editing?.short ?? '',
            merge: false,
        });
        form.clearErrors();
        setMergeTarget(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, editing?.slug]);

    const conflict = useMemo(() => {
        if (!isEditing || !editing) {
            return null;
        }

        const normalized = normalizeTypeTitle(form.data.title);

        if (normalized === '') {
            return null;
        }

        return (
            catalog.find(
                (item) =>
                    item.slug !== editing.slug &&
                    normalizeTypeTitle(item.title) === normalized,
            ) ?? null
        );
    }, [catalog, editing, form.data.title, isEditing]);

    const handleClose = () => {
        form.reset();
        form.clearErrors();
        setMergeTarget(null);
        onClose();
    };

    const submitUpdate = (merge: boolean) => {
        if (!editing) {
            return;
        }

        form.transform((data) => ({
            ...data,
            merge,
        }));

        form.put(`/inducciones/tipos/${editing.slug}`, {
            preserveScroll: true,
            onSuccess: () => handleClose(),
            onFinish: () => form.transform((data) => data),
        });
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (form.data.title.trim() === '' || form.processing) {
            return;
        }

        if (!isEditing) {
            form.post('/inducciones/tipos', {
                preserveScroll: true,
                onSuccess: () => handleClose(),
            });
            return;
        }

        if (conflict) {
            setMergeTarget(conflict);
            return;
        }

        submitUpdate(false);
    };

    const confirmMerge = () => {
        if (!mergeTarget || !editing) {
            return;
        }

        submitUpdate(true);
    };

    return (
        <>
            <AppModal
                open={open && !mergeTarget}
                onClose={handleClose}
                title={isEditing ? 'Editar tipo' : 'Nuevo tipo'}
                description={
                    isEditing
                        ? 'Corrige el nombre. Si coincide con otro tipo, podrás unir los paquetes.'
                        : 'Crea una inducción o capacitación con otro nombre. Luego abres paquetes y creas sesiones por fecha.'
                }
                className="sm:max-w-lg"
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            className="cursor-pointer border-brand-300 text-brand-700"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            form="induction-type-form"
                            disabled={
                                form.data.title.trim() === '' || form.processing
                            }
                            className="cursor-pointer bg-brand-500 text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                            {form.processing ? <Spinner /> : null}
                            {isEditing ? 'Guardar' : 'Crear tipo'}
                        </Button>
                    </>
                }
            >
                <form
                    id="induction-type-form"
                    onSubmit={handleSubmit}
                    className="space-y-4"
                >
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-brand-700">
                            Nombre <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={form.data.title}
                            onChange={(e) =>
                                form.setData('title', e.target.value)
                            }
                            placeholder="Ej. Capacitación: Primeros auxilios"
                            className={inputClass}
                            autoFocus
                        />
                        <InputError message={form.errors.title} />
                        {conflict ? (
                            <p className="text-xs text-amber-700">
                                Coincide con «{conflict.title}» (
                                {conflict.packages_count} paquete
                                {conflict.packages_count === 1 ? '' : 's'}). Al
                                guardar te pediremos confirmar la unión.
                            </p>
                        ) : null}
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-brand-700">
                            Actividad <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            modal={false}
                            value={form.data.activity}
                            onValueChange={(value) =>
                                form.setData('activity', value)
                            }
                        >
                            <SelectTrigger
                                className={cn(
                                    inputClass,
                                    'w-full cursor-pointer',
                                )}
                            >
                                <SelectValue placeholder="Selecciona" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                {activityOptions.map((opt) => (
                                    <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                        className="cursor-pointer"
                                    >
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.activity} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-brand-700">
                            Nombre corto
                        </Label>
                        <Input
                            value={form.data.short}
                            onChange={(e) =>
                                form.setData('short', e.target.value)
                            }
                            placeholder="Opcional · se usa en breadcrumbs"
                            className={inputClass}
                        />
                        <InputError message={form.errors.short} />
                    </div>
                </form>
            </AppModal>

            <AppModal
                open={Boolean(mergeTarget && editing)}
                onClose={() => {
                    if (form.processing) {
                        return;
                    }
                    setMergeTarget(null);
                }}
                title="¿Unir tipos?"
                description="Hay otro tipo con el mismo nombre. Si confirmas, se unen los paquetes en uno solo."
                className="sm:max-w-md"
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={form.processing}
                            onClick={() => setMergeTarget(null)}
                            className="cursor-pointer border-brand-300 text-brand-700"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            disabled={form.processing}
                            onClick={confirmMerge}
                            className="cursor-pointer bg-brand-700 text-white hover:bg-brand-800"
                        >
                            {form.processing ? <Spinner /> : null}
                            Unir paquetes
                        </Button>
                    </>
                }
            >
                {mergeTarget && editing ? (
                    <div className="space-y-3 text-sm text-brand-800">
                        <p>
                            Vas a unir{' '}
                            <span className="font-semibold">
                                «{editing.title}»
                            </span>{' '}
                            ({editing.packages_count} paquete
                            {editing.packages_count === 1 ? '' : 's'}) con{' '}
                            <span className="font-semibold">
                                «{mergeTarget.title}»
                            </span>{' '}
                            ({mergeTarget.packages_count} paquete
                            {mergeTarget.packages_count === 1 ? '' : 's'}).
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Quedará un solo tipo llamado «{form.data.title.trim()}».
                            Los paquetes de ambos pasan a ese tipo y se elimina el
                            duplicado.
                        </p>
                    </div>
                ) : null}
            </AppModal>
        </>
    );
}
