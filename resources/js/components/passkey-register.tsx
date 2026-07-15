import { usePasskeyRegister } from '@laravel/passkeys/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
    onSuccess: () => void;
};

export default function PasskeyRegistration({ onSuccess }: Props) {
    const [name, setName] = useState(() => {
        const ua = navigator.userAgent;

        const browser = [
            { pattern: /Edg|Edge/, name: 'Edge' },
            { pattern: /OPR|Opera|OPiOS/, name: 'Opera' },
            { pattern: /Firefox|FxiOS/, name: 'Firefox' },
            { pattern: /Chrome|CriOS/, name: 'Chrome' },
            { pattern: /Safari/, name: 'Safari' },
        ].find(({ pattern }) => pattern.test(ua))?.name;

        const os = [
            { pattern: /iPhone/, name: 'iPhone' },
            { pattern: /iPad|Macintosh(?=.*Mobile)/, name: 'iPad' },
            { pattern: /Android/, name: 'Android' },
            { pattern: /Mac/, name: 'Mac' },
            { pattern: /Windows/, name: 'Windows' },
        ].find(({ pattern }) => pattern.test(ua))?.name;

        return [browser, os].filter(Boolean).join(' en ') || '';
    });

    const [showForm, setShowForm] = useState(false);
    const { register, isLoading, error, isSupported } = usePasskeyRegister({
        onSuccess: () => {
            setName('');
            setShowForm(false);
            onSuccess();
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            return;
        }

        await register(name);
    };

    const handleCancel = () => {
        setShowForm(false);
        setName('');
    };

    if (!isSupported) {
        return (
            <div className="text-sm text-[#5a7390]">
                Las passkeys no son compatibles con este navegador.
            </div>
        );
    }

    if (!showForm) {
        return (
            <Button
                variant="outline"
                onClick={() => setShowForm(true)}
                className="cursor-pointer border-[#2e5a9e] text-[#2e5a9e] hover:bg-[#e8f1fa] hover:text-[#1a2b4c]"
            >
                Agregar passkey
            </Button>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-lg border border-[#c5d5e6] bg-[#f4f8fc] p-4"
        >
            <div className="grid gap-2">
                <Label htmlFor="passkey-name">Nombre de la passkey</Label>
                <Input
                    id="passkey-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej.: MacBook Pro, iPhone"
                    className="mt-1 block w-full border-[#c5d5e6]"
                    autoFocus
                />
                <p className="text-xs text-[#5a7390]">
                    Un nombre te ayuda a identificar esta passkey después.
                </p>
            </div>

            {error && <InputError message={error} />}

            <div className="flex gap-2">
                <Button
                    type="submit"
                    disabled={isLoading || !name.trim()}
                    className="cursor-pointer bg-[#2e5a9e] text-white hover:bg-[#1a2b4c]"
                >
                    {isLoading ? 'Registrando...' : 'Registrar passkey'}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCancel}
                    className="cursor-pointer"
                >
                    Cancelar
                </Button>
            </div>
        </form>
    );
}
