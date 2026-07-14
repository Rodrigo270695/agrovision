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
        const root = document.documentElement;
        const body = document.body;
        const hadDark = root.classList.contains('dark');
        const prevScheme = root.style.colorScheme;
        const prevRootOverflow = root.style.overflow;
        const prevBodyOverflow = body.style.overflow;

        root.classList.remove('dark');
        root.style.colorScheme = 'light';
        root.style.overflow = 'hidden';
        body.style.overflow = 'hidden';

        const frame = requestAnimationFrame(() => setReady(true));

        return () => {
            cancelAnimationFrame(frame);
            if (hadDark) {
                root.classList.add('dark');
            }
            root.style.colorScheme = prevScheme;
            root.style.overflow = prevRootOverflow;
            body.style.overflow = prevBodyOverflow;
        };
    }, []);

    return (
        <>
            <Head title="Iniciar sesión">
                <meta name="theme-color" content="#1a2b4c" />
                <meta name="color-scheme" content="light" />
            </Head>

            <div className="login-shell relative isolate h-dvh max-h-dvh overflow-hidden bg-[#e8eef6] font-sans text-[#1a2b4c] scheme-light">
                {/* Fondo móvil: franja Indelsi compacta */}
                <div
                    aria-hidden
                    className="login-hero-media pointer-events-none absolute inset-x-0 top-0 h-[38%] lg:hidden"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-[38%] bg-linear-to-b from-transparent to-[#e8eef6] lg:hidden"
                />

                {/* Desktop hero */}
                <div className="pointer-events-none absolute inset-y-0 left-0 hidden h-full w-[52%] lg:block">
                    <div className="login-hero-media absolute inset-0" />
                    <div className="login-hero-veil absolute inset-0" />
                    <div
                        className={cn(
                            'relative z-10 flex h-full flex-col items-center justify-center gap-10 px-10 text-center text-white xl:gap-12 xl:px-14',
                            ready ? 'login-fade-in' : 'opacity-0',
                        )}
                    >
                        <div className="rounded-3xl bg-white px-8 py-6 shadow-[0_16px_40px_rgba(0,0,0,0.25)] ring-4 ring-[#4a90e2]/45">
                            <img
                                src="/logo.png"
                                alt="Grupo Indelsi"
                                className="mx-auto h-32 w-auto max-w-[300px] object-contain xl:h-36 xl:max-w-[340px]"
                            />
                        </div>

                        <div className="max-w-lg space-y-4">
                            <p className="text-xs font-semibold tracking-[0.28em] text-[#9ec4e8] uppercase">
                                Seguridad en el Trabajo · SST – SSOMA
                            </p>
                            <h2 className="font-display text-5xl leading-[1.05] font-bold tracking-tight xl:text-6xl">
                                Grupo Indelsi
                            </h2>
                            <p className="mx-auto max-w-md text-base leading-relaxed text-[#d5e6f5]">
                                Plataforma operativa para control, cumplimiento
                                y gestión segura en campo.
                            </p>
                        </div>

                        <p className="text-sm text-[#a8c4db]">
                            Expertos en gestión de riesgos y cumplimiento SST
                        </p>
                    </div>
                </div>

                {/* Contenido / formulario */}
                <div className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden px-4 py-4 sm:px-6 lg:ml-[52%] lg:w-[48%] lg:px-10 lg:py-6">
                    <div
                        className={cn(
                            'w-full max-w-[400px] rounded-3xl border border-[#d7e3f0] bg-white p-5 shadow-[0_20px_50px_rgba(26,43,76,0.16)] sm:p-7',
                            ready
                                ? 'login-rise-in'
                                : 'translate-y-4 opacity-0',
                        )}
                    >
                        {/* Marcas */}
                        <div className="mb-5 flex flex-col items-center gap-3 text-center">
                            <div className="rounded-2xl bg-white px-5 py-3 shadow-sm ring-2 ring-[#4a90e2]/35 lg:hidden">
                                <img
                                    src="/logo.png"
                                    alt="Grupo Indelsi"
                                    className="mx-auto h-16 w-auto max-w-[200px] object-contain"
                                />
                            </div>                            <div className="w-full rounded-2xl border border-[#e2eaf3] bg-[#f7fafc] px-4 py-3">
                                <p className="mb-2 text-[10px] font-semibold tracking-[0.2em] text-[#6b8ead] uppercase">
                                    Cliente
                                </p>
                                <img
                                    src="/agro-mark.png"
                                    alt="Agrovision"
                                    className="mx-auto h-12 w-auto max-w-full object-contain sm:h-14"
                                />
                            </div>
                        </div>

                        <div className="mb-5 space-y-1.5 text-center sm:text-left">
                            <h1 className="font-display text-2xl font-semibold tracking-tight text-[#1a2b4c]">
                                Iniciar sesión
                            </h1>
                            <p className="text-sm leading-relaxed text-[#5a7390]">
                                Accede con tu cuenta autorizada de Agrovision.
                            </p>
                        </div>

                        {status ? (
                            <div className="mb-4 rounded-xl border border-[#9ec4e8] bg-[#e8f1fa] px-3 py-2 text-center text-sm font-medium text-[#1a2b4c]">
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
                                        <Label
                                            htmlFor="email"
                                            className="text-[#1a2b4c]"
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
                                            inputMode="email"
                                            placeholder="nombre@agrovision.com"
                                            className="h-12 border-[#c5d5e6] bg-white text-base text-[#1a2b4c] shadow-none placeholder:text-[#8aa3bd] focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/35"
                                        />
                                        <InputError message={errors.email} />
                                    </div>

                                    <div className="grid gap-1.5">
                                        <Label
                                            htmlFor="password"
                                            className="text-[#1a2b4c]"
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
                                            className="h-12 border-[#c5d5e6] bg-white text-base text-[#1a2b4c] shadow-none placeholder:text-[#8aa3bd] focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/35"
                                        />
                                        <InputError message={errors.password} />
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id="remember"
                                            name="remember"
                                            tabIndex={3}
                                            className="border-[#8aa3bd] data-[state=checked]:border-[#1a2b4c] data-[state=checked]:bg-[#1a2b4c]"
                                        />
                                        <Label
                                            htmlFor="remember"
                                            className="text-sm text-[#5a7390]"
                                        >
                                            Recordarme en este equipo
                                        </Label>
                                    </div>

                                    <Button
                                        type="submit"
                                        tabIndex={4}
                                        disabled={processing}
                                        data-test="login-button"
                                        className="mt-1 h-12 w-full bg-[#1a2b4c] text-base font-semibold text-white hover:bg-[#122038]"
                                    >
                                        {processing ? <Spinner /> : null}
                                        Iniciar sesión
                                    </Button>
                                </>
                            )}
                        </Form>

                        <p className="mt-6 text-center text-[11px] leading-relaxed text-[#6b8ead]">
                            Sistema Indelsi · Uso autorizado Agrovision
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}

Login.layout = null;
