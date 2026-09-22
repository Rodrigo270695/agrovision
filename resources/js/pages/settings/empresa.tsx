import { Form, Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import BrandingController from '@/actions/App/Http/Controllers/Settings/BrandingController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { TenantBrandMark } from '@/components/tenant-brand-mark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/empresa';

type Branding = {
    name: string;
    legal_name: string | null;
    logo: string | null;
};

export default function Empresa({ branding }: { branding: Branding }) {
    const [preview, setPreview] = useState<string | null>(branding.logo);

    useEffect(() => {
        setPreview(branding.logo);
    }, [branding.logo]);

    return (
        <>
            <Head title="Empresa" />

            <h1 className="sr-only">Datos de la empresa</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Empresa"
                    description="Nombre comercial, razón social y logo que se muestran en el inicio de sesión y en el menú"
                />

                <Form
                    {...BrandingController.update.form()}
                    encType="multipart/form-data"
                    options={{
                        preserveScroll: true,
                    }}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nombre comercial</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    required
                                    defaultValue={branding.name}
                                    placeholder="Macga"
                                    className="mt-1 block w-full border-[#c5d5e6]"
                                />
                                <InputError
                                    className="mt-2"
                                    message={errors.name}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="legal_name">Razón social</Label>
                                <Input
                                    id="legal_name"
                                    name="legal_name"
                                    defaultValue={branding.legal_name ?? ''}
                                    placeholder="Macga S.A.C."
                                    className="mt-1 block w-full border-[#c5d5e6]"
                                />
                                <p className="text-xs text-[#6b8ead]">
                                    Opcional. Úsala si el nombre legal es
                                    distinto al comercial.
                                </p>
                                <InputError
                                    className="mt-2"
                                    message={errors.legal_name}
                                />
                            </div>

                            <div className="grid gap-3">
                                <Label htmlFor="logo">Logo</Label>
                                <div className="flex items-center gap-4 rounded-2xl border border-[#d7e3f0] bg-[#f7fafc] p-4">
                                    <TenantBrandMark
                                        name={branding.name}
                                        logo={preview}
                                        className="size-16 shrink-0 text-lg"
                                        imageClassName="h-16 w-auto max-w-28"
                                    />
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <Input
                                            id="logo"
                                            name="logo"
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            className="block w-full cursor-pointer border-[#c5d5e6] text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#1a2b4c] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                                            onChange={(event) => {
                                                const file =
                                                    event.target.files?.[0];

                                                if (!file) {
                                                    setPreview(branding.logo);
                                                    return;
                                                }

                                                const url =
                                                    URL.createObjectURL(file);
                                                setPreview(url);
                                            }}
                                        />
                                        <p className="text-xs text-[#6b8ead]">
                                            PNG, JPG o WEBP. Máximo 2 MB.
                                        </p>
                                    </div>
                                </div>
                                <InputError
                                    className="mt-1"
                                    message={errors.logo}
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <Button
                                    disabled={processing}
                                    data-test="update-branding-button"
                                    className="cursor-pointer bg-[#2e5a9e] text-white hover:bg-[#1a2b4c]"
                                >
                                    Guardar
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

Empresa.layout = {
    breadcrumbs: [
        {
            title: 'Empresa',
            href: edit(),
        },
    ],
};
