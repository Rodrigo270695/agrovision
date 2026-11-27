import { Head, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
    status: number;
    title?: string;
    message?: string;
};

const DEFAULT_MESSAGES: Record<number, { title: string; message: string }> = {
    401: {
        title: 'Sesión no iniciada',
        message: 'Inicia sesión para continuar.',
    },
    402: {
        title: 'Acción no disponible',
        message: 'Esta función no está habilitada en tu cuenta.',
    },
    403: {
        title: 'Sin permiso',
        message:
            'No tienes permiso para ver esto. Si crees que es un error, pide acceso a tu coordinador.',
    },
    404: {
        title: 'Página no encontrada',
        message:
            'El enlace no existe o ya no está disponible. Usa el menú o vuelve al panel.',
    },
    419: {
        title: 'La sesión expiró',
        message: 'Tu sesión caducó por inactividad. Vuelve a iniciar sesión.',
    },
    422: {
        title: 'No se pudo completar',
        message: 'Revisa los datos e inténtalo de nuevo.',
    },
    429: {
        title: 'Demasiados intentos',
        message: 'Espera un momento y vuelve a intentarlo.',
    },
    500: {
        title: 'Algo salió mal',
        message:
            'Ocurrió un problema en el servidor. Si estabas descargando un archivo grande, prueba con un rango de fechas más corto.',
    },
    503: {
        title: 'Servicio en mantenimiento',
        message: 'Estamos actualizando el sistema. Intenta en unos minutos.',
    },
};

export default function ErrorPage({ status, title, message }: Props) {
    const fallback = DEFAULT_MESSAGES[status] ?? {
        title: 'Error',
        message:
            'No pudimos completar la acción. Intenta de nuevo o contacta a soporte.',
    };

    const pageTitle = title ?? fallback.title;
    const pageMessage = message ?? fallback.message;
    const loginRequired = status === 401 || status === 419;

    return (
        <>
            <Head title={pageTitle} />
            <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12">
                <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg">
                    <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                        Error {status}
                    </p>
                    <h1 className="mt-2 font-display text-xl font-bold text-brand-800">
                        {pageTitle}
                    </h1>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">
                        {pageMessage}
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                        {loginRequired ? (
                            <Button asChild className="rounded-xl">
                                <Link href="/login">Iniciar sesión</Link>
                            </Button>
                        ) : (
                            <Button asChild className="rounded-xl">
                                <Link href="/dashboard">Ir al panel</Link>
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => window.history.back()}
                        >
                            Volver
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}

ErrorPage.layout = ({ children }: { children: ReactNode }) => children;