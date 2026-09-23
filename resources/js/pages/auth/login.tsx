import { Form, Head, usePage } from '@inertiajs/react';
import { Lock, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { TenantBrandMark } from '@/components/tenant-brand-mark';
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

const fieldClass =
    'h-12 rounded-none border-0 bg-transparent text-[15px] text-[#122038] shadow-none placeholder:text-[#9aadc0] focus-visible:border-transparent focus-visible:ring-0';

function useTenantBranding() {
    const tenant = usePage().props.tenant;

    return {
        name: tenant?.name ?? 'Cliente',
        legalName: tenant?.legal_name ?? null,
        logo: tenant?.login_logo ?? tenant?.logo ?? null,
    };
}

export default function Login({ status }: Props) {
    const [ready, setReady] = useState(false);
    const branding = useTenantBranding();

    useEffect(() => {
        const root = document.documentElement;
        const body = document.body;
        const hadDark = root.classList.contains('dark');
        const prevScheme = root.style.colorScheme;
        const prevRootOverflow = root.style.overflow;
        const prevBodyOverflow = body.style.overflow;
        const desktop = window.matchMedia('(min-width: 1024px)').matches;

        root.classList.remove('dark');
        root.style.colorScheme = 'light';

        if (desktop) {
            root.style.overflow = 'hidden';
            body.style.overflow = 'hidden';
        }

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
            <Head title={`Iniciar sesión · ${branding.name}`}>
                <meta name="theme-color" content="#0e1830" />
                <meta name="color-scheme" content="light" />
            </Head>

            <div className="login-shell relative isolate flex min-h-dvh flex-col bg-[#f4f6f8] font-login text-[#122038] scheme-light lg:h-dvh lg:max-h-dvh lg:flex-row lg:overflow-hidden">
                <aside className="relative hidden h-full w-[46%] shrink-0 lg:flex">
                    <div className="login-hero-media absolute inset-0" />
                    <div className="login-hex-grid pointer-events-none absolute inset-0" />
                    <div className="login-hero-veil absolute inset-0" />
                    <div
                        aria-hidden
                        className="login-beacon pointer-events-none absolute -bottom-16 -left-10 size-[320px] rounded-full"
                    />
                    <div
                        aria-hidden
                        className="login-beacon login-beacon-delay pointer-events-none absolute -bottom-16 -left-10 size-[320px] rounded-full"
                    />

                    <div
                        className={cn(
                            'relative z-10 flex h-full w-full flex-col px-12 py-11 xl:px-16',
                            ready ? 'login-fade-in' : 'opacity-0',
                        )}
                    >
                        <div className="flex flex-1 flex-col justify-center">
                            <div className="mb-10 flex justify-center">
                                <img
                                    src="/logo.png"
                                    alt="Grupo Indelsi"
                                    className="h-48 w-auto max-w-[min(100%,24rem)] object-contain brightness-0 invert drop-shadow-[0_18px_28px_rgba(0,0,0,0.35)] xl:h-56"
                                />
                            </div>

                            <div className="border-l-2 border-[#f5c440] pl-6">
                                <p className="text-[11px] font-medium tracking-[0.22em] text-[#d4b056] uppercase">
                                    Seguridad y salud en el trabajo
                                </p>
                                <h2 className="font-display mt-3 max-w-[15ch] text-[2.75rem] leading-[1.08] font-semibold tracking-[-0.035em] text-white xl:text-[3.15rem]">
                                    Tu Seguridad es nuestro compromiso diario.
                                </h2>
                            </div>

                            <p className="mt-7 max-w-[38ch] pl-6 text-[15px] leading-[1.65] text-white/62">
                                SST operativo: inspecciones, inducciones y
                                evidencia en campo. Para equipos que no pueden
                                improvisar.
                            </p>

                            <dl className="mt-12 grid max-w-sm grid-cols-3 gap-6 pl-6">
                                <div
                                    className={
                                        ready ? 'login-stagger-1' : 'opacity-0'
                                    }
                                >
                                    <dt className="font-display text-[1.35rem] font-semibold tracking-[-0.03em] text-white">
                                        01
                                    </dt>
                                    <dd className="mt-1 text-[12px] leading-snug text-white/50">
                                        Prevención
                                    </dd>
                                </div>
                                <div
                                    className={
                                        ready ? 'login-stagger-2' : 'opacity-0'
                                    }
                                >
                                    <dt className="font-display text-[1.35rem] font-semibold tracking-[-0.03em] text-white">
                                        02
                                    </dt>
                                    <dd className="mt-1 text-[12px] leading-snug text-white/50">
                                        Salud ocupacional
                                    </dd>
                                </div>
                                <div
                                    className={
                                        ready ? 'login-stagger-3' : 'opacity-0'
                                    }
                                >
                                    <dt className="font-display text-[1.35rem] font-semibold tracking-[-0.03em] text-white">
                                        03
                                    </dt>
                                    <dd className="mt-1 text-[12px] leading-snug text-white/50">
                                        Cumplimiento
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        <footer className="flex h-10 items-end">
                            <p className="text-[12px] tracking-[0.01em] text-white/32">
                                Grupo Indelsi · SST y cumplimiento
                            </p>
                        </footer>
                    </div>
                </aside>

                <div className="relative isolate lg:hidden">
                    <div className="login-hero-media absolute inset-0" />
                    <div className="login-hex-grid pointer-events-none absolute inset-0 opacity-40" />
                    <div className="relative z-10 flex flex-col items-center px-5 py-6 text-center">
                        <img
                            src="/logo.png"
                            alt="Grupo Indelsi"
                            className="h-24 w-auto max-w-[15rem] object-contain brightness-0 invert drop-shadow-[0_12px_20px_rgba(0,0,0,0.35)]"
                        />
                        <p className="mt-5 text-[10px] font-medium tracking-[0.2em] text-[#d4b056] uppercase">
                            Seguridad y salud en el trabajo
                        </p>
                        <p className="font-display mt-1.5 text-[1.45rem] leading-tight font-semibold tracking-[-0.03em] text-white">
                            Cuidar a la gente.
                        </p>
                    </div>
                </div>

                <main className="relative flex min-h-0 flex-1 flex-col bg-[#f7f8fa] lg:overflow-y-auto lg:border-l lg:border-[#e4eaf1]">
                    <div
                        className={cn(
                            'flex flex-1 flex-col items-center justify-center px-5 py-8 sm:px-8 lg:px-10',
                            ready ? 'login-rise-in' : 'translate-y-2 opacity-0',
                        )}
                    >
                        <div className="w-full max-w-[400px]">
                            <div className="mb-7 flex items-center gap-3.5">
                                <TenantBrandMark
                                    name={branding.name}
                                    logo={branding.logo}
                                    className="size-14 shrink-0 rounded-xl text-base ring-1 ring-[#d5deea]"
                                    imageClassName="h-14 w-auto max-w-[4.5rem] object-contain"
                                />
                                <div className="min-w-0">
                                    <p className="font-display truncate text-[17px] font-semibold tracking-[-0.02em] text-[#122038]">
                                        {branding.name}
                                    </p>
                                    <p className="truncate text-[13px] text-[#6b8298]">
                                        {branding.legalName ??
                                            'Espacio de trabajo SST'}
                                    </p>
                                </div>
                            </div>

                            <h1 className="font-display text-[1.65rem] leading-none font-semibold tracking-[-0.035em] text-[#0e1830] sm:text-[1.85rem]">
                                Iniciar sesión
                            </h1>
                            <p className="mt-2 text-[14px] leading-relaxed text-[#5c738c]">
                                Ingresa con tu correo corporativo de{' '}
                                {branding.name}.
                            </p>

                            {status ? (
                                <div className="mt-5 rounded-md border border-[#c5d9ee] bg-[#eef5fb] px-3 py-2.5 text-[13px] font-medium text-[#1a2b4c]">
                                    {status}
                                </div>
                            ) : null}

                            <Form
                                {...store.form()}
                                resetOnSuccess={['password']}
                                className="mt-7 flex flex-col gap-5"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <div className="overflow-hidden rounded-xl border border-[#d3deea] bg-white">
                                            <div className="border-b border-[#e6edf4]">
                                                <Label
                                                    htmlFor="email"
                                                    className="block px-4 pt-3 text-[11px] font-medium tracking-[0.12em] text-[#6b8298] uppercase"
                                                >
                                                    Correo electrónico
                                                </Label>
                                                <div className="flex items-center gap-3 px-4 pb-2.5">
                                                    <Mail
                                                        className="size-4 shrink-0 text-[#7a93ab]"
                                                        aria-hidden
                                                    />
                                                    <Input
                                                        id="email"
                                                        type="email"
                                                        name="email"
                                                        required
                                                        autoFocus
                                                        tabIndex={1}
                                                        autoComplete="email"
                                                        inputMode="email"
                                                        placeholder="correo@empresa.com"
                                                        className={fieldClass}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <Label
                                                    htmlFor="password"
                                                    className="block px-4 pt-3 text-[11px] font-medium tracking-[0.12em] text-[#6b8298] uppercase"
                                                >
                                                    Contraseña
                                                </Label>
                                                <div className="flex items-center gap-3 px-4 pb-2.5">
                                                    <Lock
                                                        className="size-4 shrink-0 text-[#7a93ab]"
                                                        aria-hidden
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <PasswordInput
                                                            id="password"
                                                            name="password"
                                                            required
                                                            tabIndex={2}
                                                            autoComplete="current-password"
                                                            placeholder="••••••••"
                                                            className={
                                                                fieldClass
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <InputError message={errors.email} />
                                        <InputError
                                            message={errors.password}
                                        />

                                        <label
                                            htmlFor="remember"
                                            className="flex cursor-pointer items-center gap-2.5"
                                        >
                                            <Checkbox
                                                id="remember"
                                                name="remember"
                                                tabIndex={3}
                                                className="cursor-pointer border-[#9aafc2] data-[state=checked]:border-[#122038] data-[state=checked]:bg-[#122038]"
                                            />
                                            <span className="text-[13px] text-[#5c738c]">
                                                Recordarme
                                            </span>
                                        </label>

                                        <Button
                                            type="submit"
                                            tabIndex={4}
                                            disabled={processing}
                                            data-test="login-button"
                                            className="h-12 w-full cursor-pointer rounded-xl bg-[#122038] text-[15px] font-medium tracking-[-0.01em] text-white hover:bg-[#0c1626]"
                                        >
                                            {processing ? <Spinner /> : null}
                                            Entrar
                                        </Button>
                                    </>
                                )}
                            </Form>

                            <p className="mt-8 text-center text-[12px] text-[#8aa0b5]">
                                Acceso restringido · Operado por Grupo Indelsi
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}

Login.layout = null;
