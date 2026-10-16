import { useForm } from '@inertiajs/react';
import { useEffect, type FormEvent } from 'react';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export type InductionFormats = {
    register_code: string;
    register_revision: string;
    register_date: string | null;
    risst_code: string;
    risst_revision: string;
    ritran_code: string;
    ritran_revision: string;
};

type Props = {
    open: boolean;
    formats: InductionFormats;
    onClose: () => void;
};

const inputClass =
    'h-10 border-[#c5d5e6] bg-white text-[#1a2b4c] focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/35';

function dateValue(value?: string | null): string {
    if (!value) {
        return '';
    }

    return String(value).slice(0, 10);
}

export function InductionFormatsModal({ open, formats, onClose }: Props) {
    const form = useForm({
        register_code: formats.register_code,
        register_revision: formats.register_revision,
        register_date: dateValue(formats.register_date),
        risst_code: formats.risst_code,
        risst_revision: formats.risst_revision,
        ritran_code: formats.ritran_code,
        ritran_revision: formats.ritran_revision,
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({
            register_code: formats.register_code,
            register_revision: formats.register_revision,
            register_date: dateValue(formats.register_date),
            risst_code: formats.risst_code,
            risst_revision: formats.risst_revision,
            ritran_code: formats.ritran_code,
            ritran_revision: formats.ritran_revision,
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, formats]);

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        form.transform((data) => ({
            ...data,
            register_date: data.register_date === '' ? null : data.register_date,
        }));

        form.put('/inducciones/formatos', {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => form.transform((data) => data),
        });
    };

    return (
        <AppModal
            open={open}
            onClose={onClose}
            title="Códigos de documentos"
            description="Se usan en las inducciones nuevas. Las que ya existen conservan el código con el que se crearon."
            className="sm:max-w-lg"
            bodyClassName="max-h-[70vh]"
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
                        form="induction-formats-form"
                        disabled={form.processing}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                    >
                        {form.processing ? <Spinner /> : null}
                        Guardar
                    </Button>
                </>
            }
        >
            <form
                id="induction-formats-form"
                onSubmit={handleSubmit}
                className="space-y-4"
            >
                <section className="space-y-3 rounded-xl border border-[#d7e3f0] p-3">
                    <h3 className="text-sm font-semibold text-[#1a2b4c]">
                        Registro
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                            label="Código"
                            value={form.data.register_code}
                            error={form.errors.register_code}
                            onChange={(value) =>
                                form.setData('register_code', value)
                            }
                        />
                        <Field
                            label="Revisión"
                            value={form.data.register_revision}
                            error={form.errors.register_revision}
                            onChange={(value) =>
                                form.setData('register_revision', value)
                            }
                        />
                        <div className="grid gap-1.5 sm:col-span-2">
                            <Label className="text-xs text-[#1a2b4c]">
                                Fecha
                            </Label>
                            <Input
                                type="date"
                                value={form.data.register_date}
                                onChange={(event) =>
                                    form.setData(
                                        'register_date',
                                        event.target.value,
                                    )
                                }
                                className={inputClass}
                            />
                        </div>
                    </div>
                </section>

                <section className="space-y-3 rounded-xl border border-[#d7e3f0] p-3">
                    <h3 className="text-sm font-semibold text-[#1a2b4c]">
                        RISST
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                            label="Código"
                            value={form.data.risst_code}
                            error={form.errors.risst_code}
                            onChange={(value) =>
                                form.setData('risst_code', value)
                            }
                        />
                        <Field
                            label="Revisión"
                            value={form.data.risst_revision}
                            error={form.errors.risst_revision}
                            onChange={(value) =>
                                form.setData('risst_revision', value)
                            }
                        />
                    </div>
                </section>

                <section className="space-y-3 rounded-xl border border-[#d7e3f0] p-3">
                    <h3 className="text-sm font-semibold text-[#1a2b4c]">
                        RITRAN
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                            label="Código"
                            value={form.data.ritran_code}
                            error={form.errors.ritran_code}
                            onChange={(value) =>
                                form.setData('ritran_code', value)
                            }
                        />
                        <Field
                            label="Revisión"
                            value={form.data.ritran_revision}
                            error={form.errors.ritran_revision}
                            onChange={(value) =>
                                form.setData('ritran_revision', value)
                            }
                        />
                    </div>
                </section>
            </form>
        </AppModal>
    );
}

function Field({
    label,
    value,
    error,
    onChange,
}: {
    label: string;
    value: string;
    error?: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="grid gap-1.5">
            <Label className="text-xs text-[#1a2b4c]">
                {label} <span className="text-red-500">*</span>
            </Label>
            <Input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className={inputClass}
            />
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
    );
}
