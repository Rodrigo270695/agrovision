import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';

type Props = {
    status?: string;
};

export default function CentralLogin({ status }: Props) {
    return (
        <>
            <Head title="Gindelsi · Soporte" />

            <div className="flex min-h-dvh items-center justify-center bg-[#e8eef6] px-4 text-[#1a2b4c]">
                <div className="w-full max-w-md rounded-3xl border border-[#d7e3f0] bg-white p-8 shadow-[0_20px_50px_rgba(26,43,76,0.16)]">
                    <div className="mb-6 flex flex-col items-center gap-3 text-center">
                        <img
                            src="/logo.png"
                            alt="Grupo Indelsi"
                            className="h-16 w-auto object-contain"
                        />
                        <p className="text-[10px] font-semibold tracking-[0.2em] text-[#6b8ead] uppercase">
                            Panel central
                        </p>
                        <h1 className="font-display text-2xl font-semibold">
                            Gindelsi
                        </h1>
                        <p className="text-sm text-[#5a7390]">
                            Acceso de soporte para administrar empresas.
                        </p>
                    </div>

                    {status ? (
                        <div className="mb-4 rounded-xl border border-[#9ec4e8] bg-[#e8f1fa] px-3 py-2 text-center text-sm font-medium">
                            {status}
                        </div>
                    ) : null}

                    <Form
                        {...store.form()}
                        resetOnSuccess={['password']}
                        className="flex flex-col gap-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="email">Correo</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoFocus
                                        autoComplete="email"
                                        placeholder="soporte@gindelsi.pe"
                                        className="h-12"
                                    />
                                    <InputError message={errors.email} />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="password">Contraseña</Label>
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        required
                                        autoComplete="current-password"
                                        className="h-12"
                                    />
                                    <InputError message={errors.password} />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="h-12 bg-[#1a2b4c] text-white hover:bg-[#122038]"
                                >
                                    {processing ? <Spinner /> : null}
                                    Entrar
                                </Button>
                            </>
                        )}
                    </Form>
                </div>
            </div>
        </>
    );
}

CentralLogin.layout = null;
