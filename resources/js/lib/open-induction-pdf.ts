import { toast } from 'sonner';

let opening = false;

export async function openInductionPdf(id: number | string): Promise<void> {
    if (opening) {
        return;
    }

    opening = true;
    const popup = window.open('', '_blank');

    if (popup) {
        popup.document.title = 'Documentos';
        popup.document.body.innerHTML =
            '<p style="font-family:system-ui,sans-serif;padding:2rem;color:#1a2b4c">Generando documentos… La primera vez puede demorar. Las siguientes se abren al instante.</p>';
    }

    const notice = toast.loading(
        'Generando documentos. La primera vez puede demorar.',
    );

    try {
        const response = await fetch(`/inducciones/${id}/pdf`, {
            credentials: 'same-origin',
            headers: {
                Accept: 'application/pdf, application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
        const type = response.headers.get('content-type') ?? '';

        if (!response.ok || !type.includes('pdf')) {
            let message = 'No se pudo generar el PDF.';

            if (type.includes('json')) {
                const body = (await response.json()) as { message?: string };
                if (body.message) {
                    message = body.message;
                }
            }

            throw new Error(message);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        if (popup) {
            popup.location.href = url;
        } else {
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener';
            link.click();
        }

        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        toast.success('Documentos listos.', { id: notice });
    } catch (error) {
        popup?.close();
        toast.error(
            error instanceof Error ? error.message : 'No se pudo generar el PDF.',
            { id: notice },
        );
    } finally {
        opening = false;
    }
}
