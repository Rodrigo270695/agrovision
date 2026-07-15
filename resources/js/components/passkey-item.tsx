import { KeyRound, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import type { Passkey } from '@/types/auth';

type Props = {
    passkey: Passkey;
    onDelete: (id: number, onError: () => void) => void;
};

export default function PasskeyItem({ passkey, onDelete }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        setIsDeleting(true);
        onDelete(passkey.id, () => setIsDeleting(false));
    };

    return (
        <div className="flex items-center justify-between border-b border-[#c5d5e6] p-4 last:border-b-0">
            <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f1fa]">
                    <KeyRound className="h-5 w-5 text-[#2e5a9e]" />
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <p className="font-medium tracking-tight text-[#1a2b4c]">
                            {passkey.name}
                        </p>
                        {passkey.authenticator && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#eef4fb] px-2 py-0.5 text-[11px] font-medium tracking-wide text-[#5a7390] uppercase ring-1 ring-[#c5d5e6] ring-inset">
                                {passkey.authenticator}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-[#5a7390]">
                        Agregada {passkey.created_at_diff}
                        {passkey.last_used_at_diff && (
                            <>
                                <span className="mx-1 text-[#c5d5e6]">/</span>
                                Último uso {passkey.last_used_at_diff}
                            </>
                        )}
                    </p>
                </div>
            </div>

            <Dialog>
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer text-red-700 hover:bg-red-50 hover:text-red-800"
                    >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Eliminar</span>
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogTitle>Eliminar passkey</DialogTitle>
                    <DialogDescription>
                        ¿Seguro que quieres eliminar la passkey "{passkey.name}
                        "? Ya no podrás usarla para iniciar sesión.
                    </DialogDescription>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button
                                variant="secondary"
                                className="cursor-pointer"
                            >
                                Cancelar
                            </Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="cursor-pointer"
                        >
                            {isDeleting
                                ? 'Eliminando...'
                                : 'Eliminar passkey'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
