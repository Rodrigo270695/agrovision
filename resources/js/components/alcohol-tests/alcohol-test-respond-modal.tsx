import { useForm } from '@inertiajs/react';
import { useEffect, type FormEvent } from 'react';
import { SignaturePad } from '@/components/checklists/signature-pad';
import { AppModal } from '@/components/shared/app-modal';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

export type AlcoholRespondTest = {
    id: number;
    driver_name: string;
    plate_number?: string | null;
    alcohol_level: number;
    coordinator_signer_name?: string | null;
    coordinator_action_plan?: string | null;
};

type Props = {
    open: boolean;
    test: AlcoholRespondTest | null;
    defaultSignerName: string;
    onClose: () => void;
};

export function AlcoholTestRespondModal({
    open,
    test,
    defaultSignerName,
    onClose,
}: Props) {
    const form = useForm({
        coordinator_signer_name: defaultSignerName,
        coordinator_action_plan: '',
        signature_data_url: '' as string,
    });

    useEffect(() => {
        if (!open || !test) {
            return;
        }

        form.setData({
            coordinator_signer_name:
                test.coordinator_signer_name?.trim() ||
                defaultSignerName.trim() ||
                '',
            coordinator_action_plan: test.coordinator_action_plan ?? '',
            signature_data_url: '',
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, test?.id, defaultSignerName]);

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!test || form.processing) {
            return;
        }

        let hasLocalError = false;

        if (!form.data.coordinator_signer_name.trim()) {
            form.setError(
                'coordinator_signer_name',
                'Indica quién firma el acta.',
            );
            hasLocalError = true;
        }

        if (!form.data.coordinator_action_plan.trim()) {
            form.setError(
                'coordinator_action_plan',
                'Describe las medidas tomadas (no permitir ingreso, etc.).',
            );
            hasLocalError = true;
        }

        if (!form.data.signature_data_url) {
            form.setError('signature_data_url', 'Debes firmar el acta.');
            hasLocalError = true;
        }

        if (hasLocalError) {
            return;
        }

        form.post(`/alcoholimetro/tests/${test.id}/responder`, {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    return (
        <AppModal
            open={open && Boolean(test)}
            onClose={() => {
                if (!form.processing) {
                    onClose();
                }
            }}
            title={
                test
                    ? `Firmar acta · ${test.driver_name}`
                    : 'Firmar acta'
            }
            description={
                test
                    ? `Nivel ${test.alcohol_level.toFixed(3)}% · tolerancia 0${
                          test.plate_number ? ` · ${test.plate_number}` : ''
                      }. Confirma medidas y firma.`
                    : undefined
            }
            className="sm:max-w-lg"
            bodyClassName="max-h-[70vh]"
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
                        form="alcohol-respond-form"
                        disabled={form.processing}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                    >
                        {form.processing ? <Spinner /> : null}
                        Firmar acta
                    </Button>
                </>
            }
        >
            <form
                id="alcohol-respond-form"
                onSubmit={handleSubmit}
                className="grid gap-3"
            >
                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">
                        Quien firma <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        value={form.data.coordinator_signer_name}
                        onChange={(e) => {
                            form.clearErrors('coordinator_signer_name');
                            form.setData(
                                'coordinator_signer_name',
                                e.target.value,
                            );
                        }}
                        className="h-9 border-[#c5d5e6]"
                    />
                    <InputError
                        message={form.errors.coordinator_signer_name}
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">
                        Medidas / plan de acción{' '}
                        <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                        value={form.data.coordinator_action_plan}
                        onChange={(e) => {
                            form.clearErrors('coordinator_action_plan');
                            form.setData(
                                'coordinator_action_plan',
                                e.target.value,
                            );
                        }}
                        rows={4}
                        className="border-[#c5d5e6]"
                        placeholder="No se permite el ingreso. Conductor retirado..."
                    />
                    <InputError
                        message={form.errors.coordinator_action_plan}
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">
                        Firma <span className="text-red-500">*</span>
                    </Label>
                    <SignaturePad
                        valueUrl={form.data.signature_data_url || null}
                        onChange={(dataUrl) => {
                            form.clearErrors('signature_data_url');
                            form.setData(
                                'signature_data_url',
                                dataUrl ?? '',
                            );
                        }}
                    />
                    <InputError message={form.errors.signature_data_url} />
                </div>
            </form>
        </AppModal>
    );
}
