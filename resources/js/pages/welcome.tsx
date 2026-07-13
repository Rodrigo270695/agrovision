import { Head, Link, usePage } from '@inertiajs/react';
import { dashboard, login } from '@/routes';

export default function Welcome() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Agrovisión" />
            <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f7f2] p-6 text-[#1c2a22]">
                <h1 className="mb-2 text-3xl font-semibold">Agrovisión</h1>
                <p className="mb-6 text-sm text-[#5a6b60]">
                    Plataforma SST para agroexportación
                </p>
                {auth.user ? (
                    <Link
                        href={dashboard()}
                        className="rounded-xl bg-[#1f4d34] px-5 py-2.5 text-sm font-semibold text-white"
                    >
                        Ir al panel
                    </Link>
                ) : (
                    <Link
                        href={login()}
                        className="rounded-xl bg-[#1f4d34] px-5 py-2.5 text-sm font-semibold text-white"
                    >
                        Iniciar sesión
                    </Link>
                )}
            </div>
        </>
    );
}
