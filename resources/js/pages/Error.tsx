import { Head, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { ErrorFleetScene } from '@/components/errors/error-fleet-scene';
import { Button } from '@/components/ui/button';
import { normalizeErrorCopy } from '@/lib/error-messages';

type Props = {
    status: number;
    title?: string;
    message?: string;
    hint?: string | null;
};

export default function ErrorPage({ status, title, message, hint }: Props) {
    const copy = normalizeErrorCopy(status, title, message, hint);
    const loginRequired = status === 401 || status === 419;

    return (
        <>
            <Head title={copy.title} />
            <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-brand-800 via-[#1e3359] to-[#0f1f3a] px-4 py-12">
                <div
                    aria-hidden
                    className="pointer-events-none absolute -right-24 -top-20 size-72 rounded-full bg-amber-400/15 blur-3xl"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute -bottom-24 -left-16 size-80 rounded-full bg-sky-400/10 blur-3xl"
                />

                <main
                    className="relative z-10 w-full max-w-lg"
                    role="alert"
                    aria-live="polite"
                >
                    <ErrorFleetScene status={status} />

                    <div className="rounded-2xl border border-white/15 bg-white/95 p-6 text-center shadow-[0_24px_60px_-24px_rgba(0,0,0,.55)] backdrop-blur sm:p-8">
                        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand-500 uppercase">
                            Error {status}
                        </p>
                        <h1 className="mt-2 font-display text-2xl font-bold text-brand-800">
                            {copy.title}
                        </h1>
                        <p className="mt-3 text-sm leading-relaxed text-slate-600">
                            {copy.message}
                        </p>
                        {copy.hint ? (
                            <p className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs leading-relaxed text-amber-950">
                                {copy.hint}
                            </p>
                        ) : null}

                        <div className="mt-6 flex flex-wrap justify-center gap-2">
                            {loginRequired ? (
                                <Button
                                    asChild
                                    className="cursor-pointer rounded-xl bg-brand-700 text-white hover:bg-brand-800"
                                >
                                    <Link href="/login">Iniciar sesión</Link>
                                </Button>
                            ) : (
                                <Button
                                    asChild
                                    className="cursor-pointer rounded-xl bg-brand-700 text-white hover:bg-brand-800"
                                >
                                    <Link href="/dashboard">Ir al panel</Link>
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                className="cursor-pointer rounded-xl border-slate-200"
                                onClick={() => window.history.back()}
                            >
                                Volver atrás
                            </Button>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}

ErrorPage.layout = ({ children }: { children: ReactNode }) => children;