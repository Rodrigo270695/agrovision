import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, type FormEvent } from 'react';
import { AppModal } from '@/components/shared/app-modal';
import { SearchableCombobox } from '@/components/shared/searchable-combobox';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

type PlaceOption = {
    id: number;
    name: string;
};

type Props = {
    open: boolean;
    places: PlaceOption[];
    defaultPlaceId?: number | null;
    onClose: () => void;
};

function todayInput(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function AlcoholPackageFormModal({
    open,
    places,
    defaultPlaceId = null,
    onClose,
}: Props) {
    const form = useForm({
        title: '',
        session_date: todayInput(),
        place_id: '',
        notes: '',
    });

    const placeChoices = useMemo(
        () =>
            places.map((place) => ({
                value: String(place.id),
                label: place.name,
            })),
        [places],
    );

    useEffect(() => {
        if (!open) {
            return;
        }

        const preset =
            defaultPlaceId &&
            places.some((place) => place.id === defaultPlaceId)
                ? String(defaultPlaceId)
                : '';

        form.setData({
            title: '',
            session_date: todayInput(),
            place_id: preset,
            notes: '',
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, defaultPlaceId, places]);

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        form.clearErrors();

        let hasLocalError = false;

        if (!form.data.title.trim()) {
            form.setError('title', 'Indica un título para el paquete.');
            hasLocalError = true;
        }

        if (!form.data.session_date) {
            form.setError('session_date', 'Indica la fecha del operativo.');
            hasLocalError = true;
        }

        if (!form.data.place_id) {
            form.setError('place_id', 'Selecciona el lugar.');
            hasLocalError = true;
        }

        if (hasLocalError) {
            return;
        }

        form.transform((data) => ({
            ...data,
            place_id: Number(data.place_id),
            notes: data.notes || null,
        }));

        form.post('/alcoholimetro', {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    return (
        <AppModal
            open={open}
            onClose={() => {
                if (!form.processing) {
                    onClose();
                }
            }}
            title="Nuevo paquete de alcohómetro"
            description="El lugar se define aquí y aplica a todos los tests del paquete."
            className="sm:max-w-lg"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={form.processing}
                        onClick={onClose}
                        className="cursor-pointer border-[#c5d5e6]"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="alcohol-package-form"
                        disabled={form.processing}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                    >
                        {form.processing ? <Spinner /> : null}
                        Crear paquete
                    </Button>
                </>
            }
        >
            <form
                id="alcohol-package-form"
                onSubmit={handleSubmit}
                className="grid gap-3"
            >
                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">
                        Título <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        value={form.data.title}
                        onChange={(e) => form.setData('title', e.target.value)}
                        className="h-9 border-[#c5d5e6]"
                        placeholder="Ej. Test inopinada por fecha de fiestas"
                    />
                    <InputError message={form.errors.title} />
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">
                        Fecha del operativo{' '}
                        <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        type="date"
                        value={form.data.session_date}
                        onChange={(e) =>
                            form.setData('session_date', e.target.value)
                        }
                        className="h-9 border-[#c5d5e6]"
                    />
                    <InputError message={form.errors.session_date} />
                </div>

                <div className="grid gap-1.5">
                    <Label
                        htmlFor="alcohol-package-place"
                        className="text-xs text-[#1a2b4c]"
                    >
                        Lugar <span className="text-red-500">*</span>
                    </Label>
                    <SearchableCombobox
                        id="alcohol-package-place"
                        value={form.data.place_id || null}
                        options={placeChoices}
                        onChange={(value) => {
                            form.clearErrors('place_id');
                            form.setData('place_id', value ?? '');
                        }}
                        placeholder="Buscar lugar..."
                        emptyMessage={
                            places.length === 0
                                ? 'No hay lugares activos. Créalos en Lugares.'
                                : 'Sin coincidencias'
                        }
                        allowClear={false}
                        disabled={form.processing}
                    />
                    <InputError message={form.errors.place_id} />
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">Notas</Label>
                    <Textarea
                        value={form.data.notes}
                        onChange={(e) => form.setData('notes', e.target.value)}
                        rows={3}
                        className="border-[#c5d5e6]"
                        placeholder="Contexto del operativo (opcional)"
                    />
                    <InputError message={form.errors.notes} />
                </div>
            </form>
        </AppModal>
    );
}
