import { Form, Head, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    index as confirmOptions,
    store as confirmStore,
} from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyConfirmationController';
import InputError from '@/components/input-error';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { TenantBrandMark } from '@/components/tenant-brand-mark';
import { cn } from '@/lib/utils';
import { store } from '@/routes/password/confirm';

export default function ConfirmPassword() {
    const tenant = usePage().props.tenant;
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const root = document.documentElement;
        const body = document.body;
        const prevRootOverflow = root.style.overflow;
        const prevBodyOverflow = body.style.overflow;

        root.classList.remove('dark');
        root.style.colorScheme = 'light';
        root.style.overflow = 'hidden';
        body.style.overflow = 'hidden';

        const frame = requestAnimationFrame(() => setReady(true));

        return () => {
            cancelAnimationFrame(frame);
            root.style.overflow = prevRootOverflow;
            body.style.overflow = prevBodyOverflow;
        };
    }, []);

    return (
        <>
            <Head title="Confirmar contraseña">
                <meta name="theme-color" content="#0f1f3a" />
                <meta name="color-scheme" content="light" />
            </Head>

            <div className="login-shell relative isolate h-dvh max-h-dvh overflow-hidden bg-brand-100 font-sans text-brand-700 scheme-light">
                <div
                    aria-hidden
                    className="login-hero-media pointer-events-none absolute inset-x-0 top-0 h-[38%] lg:hidden"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-[38%] bg-linear-to-b from-transparent to-brand-100 lg:hidden"
                />

                <div className="pointer-events-none absolute inset-y-0 left-0 hidden h-full w-[52%] lg:block">
                    <div className="login-hero-media absolute inset-0" />
                    <div className="login-hero-veil absolute inset-0" />
                    <div
                        className={cn(
                            'relative z-10 flex h-full flex-col items-center justify-center gap-10 px-10 text-center text-white xl:gap-12 xl:px-14',
                            ready ? 'login-fade-in' : 'opacity-0',
                        )}
                    >
                        <div className="rounded-3xl bg-white px-8 py-6 shadow-[0_16px_40px_rgba(0,0,0,0.25)] ring-4 ring-brand-400/45">
                            {tenant?.login_logo || tenant?.logo ? (
                                <img
                                    src={tenant?.login_logo ?? tenant?.logo ?? ''}
                                    alt={tenant?.name ?? 'Empresa'}
                                    className="mx-auto h-32 w-auto max-w-[300px] object-contain xl:h-36 xl:max-w-[340px]"
                                />
                            ) : (
                                <span className="font-display text-2xl font-semibold text-brand-700">
                                    {tenant?.name ?? 'Empresa'}
                                </span>
                            )}
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

                <div className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden px-4 py-4 sm:px-6 lg:ml-[52%] lg:w-[48%] lg:px-10 lg:py-6">
                    <div
                        className={cn(
                            'w-full max-w-[400px] rounded-3xl border border-brand-200 bg-white p-5 shadow-[0_20px_50px_rgba(26,43,76,0.16)] sm:p-7',
                            ready
                                ? 'login-rise-in'
                                : 'translate-y-4 opacity-0',
                        )}
                    >
                        <div className="mb-5 flex flex-col items-center gap-3 text-center">
                            <div className="rounded-2xl bg-white px-5 py-3 shadow-sm ring-2 ring-brand-400/35 lg:hidden">
                                {tenant?.login_logo || tenant?.logo ? (
                                    <img
                                        src={tenant?.login_logo ?? tenant?.logo ?? ''}
                                        alt={tenant?.name ?? 'Empresa'}
                                        className="mx-auto h-16 w-auto max-w-[200px] object-contain"
                                    />
                                ) : (
                                    <span className="font-display text-lg font-semibold text-brand-700">
                                        {tenant?.name ?? 'Empresa'}
                                    </span>
                                )}
                            </div>
                            <div className="w-full rounded-2xl border border-brand-200 bg-[#f7fafc] px-4 py-3">
                                <p className="mb-2 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                                    Cliente
                                </p>
                                <TenantBrandMark
                                    name={tenant?.name ?? 'Cliente'}
                                    logo={tenant?.login_logo ?? tenant?.logo}
                                    className="mx-auto size-14 text-lg sm:size-16"
                                    imageClassName="mx-auto h-12 w-auto max-w-full sm:h-14"
                                />
                            </div>
                        </div>

                        <div className="mb-5 space-y-1.5 text-center sm:text-left">
                            <h1 className="font-display text-2xl font-semibold tracking-tight text-brand-700">
                                Confirmar contraseña
                            </h1>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Área segura. Confirma tu contraseña para
                                continuar.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4">
                            <PasskeyVerify
                                routes={{
                                    options: confirmOptions(),
                                    submit: confirmStore(),
                                }}
                                label="Confirmar con passkey"
                                loadingLabel="Confirmando..."
                                separator="O confirma con contraseña"
                            />

                            <Form
                                {...store.form()}
                                resetOnSuccess={['password']}
                                className="flex flex-col gap-4"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <div className="grid gap-1.5">
                                            <Label
                                                htmlFor="password"
                                                className="text-brand-700"
                                            >
                                                Contraseña
                                            </Label>
                                            <PasswordInput
                                                id="password"
                                                name="password"
                                                placeholder="Tu contraseña"
                                                autoComplete="current-password"
                                                autoFocus
                                                className="h-12 border-brand-300 bg-white text-base text-brand-700 shadow-none placeholder:text-[#8aa3bd] focus-visible:border-brand-500 focus-visible:ring-brand-400/35"
                                            />
                                            <InputError
                                                message={errors.password}
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            disabled={processing}
                                            data-test="confirm-password-button"
                                            className="mt-1 h-12 w-full bg-brand-700 text-base font-semibold text-white hover:bg-brand-700"
                                        >
                                            {processing ? <Spinner /> : null}
                                            Confirmar contraseña
                                        </Button>
                                    </>
                                )}
                            </Form>
                        </div>

                        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
                            Sistema Indelsi · Uso autorizado Agrovision
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}

ConfirmPassword.layout = null;
