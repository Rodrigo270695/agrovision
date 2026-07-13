import { Form, Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { store } from '@/routes/login';

type Props = {
    status?: string;
};

export default function Login({ status }: Props) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const frame = requestAnimationFrame(() => setReady(true));

        return () => cancelAnimationFrame(frame);
    }, []);

    return (
        <>
            <Head title="Iniciar sesión" />

            <div className="login-shell relative flex min-h-dvh overflow-hidden bg-[#f4f7f2] font-[family-name:var(--font-login)] text-[#1c2a22]">
                <div
                    aria-hidden
                    className="login-hero absolute inset-0 lg:static lg:block lg:min-h-dvh lg:w-[58%]"
                >
                    <div className="login-hero-media absolute inset-0" />
                    <div className="login-hero-veil absolute inset-0" />
                    <div
                        className={cn(
                            'relative z-10 flex h-full min-h-dvh flex-col justify-between p-8 text-[#f7faf5] md:p-12 lg:p-14',
                            ready ? 'login-fade-in' : 'opacity-0',
                        )}
                    >
                        <p className="text-xs font-medium tracking-[0.28em] text-[#d7e8c8] uppercase">
                            Agroexportación · SST · Operaciones
                        </p>

                        <div className="max-w-xl space-y-5">
                            <p className="font-[family-name:var(--font-display)] text-5xl leading-[0.95] font-bold tracking-tight md:text-6xl lg:text-7xl">
                                Agrovisión
                            </p>
                            <p className="max-w-md text-base leading-relaxed text-[#e4efda] md:text-lg">
                                Plataforma de control para la cadena de
                                arándanos, paltas y berries de exportación.
                            </p>
                        </div>

                        <p className="hidden text-sm text-[#c9dbb8] lg:block">
                            Calidad de campo a puerto · Trazabilidad y
                            seguridad operativa
                        </p>
                    </div>
                </div>

                <div className="relative z-20 flex w-full items-end justify-center px-4 py-8 sm:items-center lg:w-[42%] lg:bg-[#f4f7f2] lg:px-10">
                    <div
                        className={cn(
                            'w-full max-w-[420px] rounded-t-3xl bg-[#f4f7f2]/px-5 py-8 shadow-[0_-18px_50px_rgba(18,40,28,0.18)] sm:rounded-3xl sm:px-8 sm:shadow-none lg:bg-transparent',
                            ready
                                ? 'login-rise-in'
                                : 'translate-y-6 opacity-0',
                        )}
                    >
                        <div className="mb-8 space-y-2 lg:mb-10">
                            <p className="text-xs font-semibold tracking-[0.22em] text-[#3f6b4a] uppercase lg:hidden">
                                Agrovisión
                            </p>
                            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[#1c2a22]">
                                Iniciar sesión
                            </h1>
                            <p className="text-sm leading-relaxed text-[#5a6b60]">
                                Accede con tu cuenta corporativa para gestionar
                                inspecciones y operaciones.
                            </p>
                        </div>

                        {status ? (
                            <div className="mb-4 rounded-xl border border-[#9fbf8a]/bg-[#e8f2df] px-3 py-2 text-center text-sm font-medium text-[#2f5a3a]">
                                {status}
                            </div>
                        ) : null}

                        <Form
                            {...store.form()}
                            resetOnSuccess={['password']}
                            className="flex flex-col gap-5"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="email"
                                            className="text-[#1c2a22]"
                                        >
                                            Correo electrónico
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            name="email"
                                            required
                                            autoFocus
                                            tabIndex={1}
                                            autoComplete="email"
                                            placeholder="nombre@agrovision.com"
                                            className="h-11 border-[#c9d6c4] bg-white shadow-none focus-visible:border-[#3f6b4a] focus-visible:ring-[#3f6b4a]/40"
                                        />
                                        <InputError message={errors.email} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="password"
                                            className="text-[#1c2a22]"
                                        >
                                            Contraseña
                                        </Label>
                                        <PasswordInput
                                            id="password"
                                            name="password"
                                            required
                                            tabIndex={2}
                                            autoComplete="current-password"
                                            placeholder="Tu contraseña"
                                            className="h-11 border-[#c9d6c4] bg-white shadow-none focus-visible:border-[#3f6b4a] focus-visible:ring-[#3f6b4a]/40"
                                        />
                                        <InputError message={errors.password} />
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id="remember"
                                            name="remember"
                                            tabIndex={3}
                                            className="border-[#8aa68a] data-[state=checked]:border-[#2f5a3a] data-[state=checked]:bg-[#2f5a3a]"
                                        />
                                        <Label
                                            htmlFor="remember"
                                            className="text-sm text-[#44554b]"
                                        >
                                            Recordarme en este equipo
                                        </Label>
                                    </div>

                                    <Button
                                        type="submit"
                                        tabIndex={4}
                                        disabled={processing}
                                        data-test="login-button"
                                        className="mt-2 h-11 w-full bg-[#1f4d34] text-base font-semibold text-[#f4f7f2] hover:bg-[#163828]"
                                    >
                                        {processing ? <Spinner /> : null}
                                        Iniciar sesión
                                    </Button>
                                </>
                            )}
                        </Form>

                        <p className="mt-8 text-xs leading-relaxed text-[#6b7c70]">
                            Acceso restringido al personal autorizado de
                            Agrovisión.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}

Login.layout = null;
