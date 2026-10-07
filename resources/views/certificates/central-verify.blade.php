<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $found ? 'Certificado '.$certificate->code : 'Certificado no encontrado' }}</title>
    <style>
        body { margin: 0; font-family: Georgia, "Times New Roman", serif; background: #f4f7fb; color: #1a2b4c; }
        .wrap { max-width: 640px; margin: 32px auto; padding: 0 16px 40px; }
        .card { background: #fff; border: 1px solid #d7e3f0; border-radius: 16px; padding: 28px 24px; box-shadow: 0 8px 24px rgba(26, 43, 76, 0.06); }
        .badge { display: inline-block; border-radius: 999px; padding: 4px 10px; font-family: sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
        .ok { background: #d1fae5; color: #065f46; }
        .expired { background: #fef3c7; color: #92400e; }
        .missing { background: #fee2e2; color: #991b1b; }
        h1 { margin: 14px 0 4px; font-size: 28px; line-height: 1.2; }
        .course { margin: 0 0 18px; font-size: 18px; }
        dl { display: grid; grid-template-columns: 140px 1fr; gap: 8px 12px; margin: 0; font-family: sans-serif; font-size: 14px; }
        dt { color: #5a7390; }
        dd { margin: 0; font-weight: 600; }
        a { color: #1a2b4c; }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="card">
            @if (! $found)
                <span class="badge missing">No encontrado</span>
                <h1>No encontramos ese certificado</h1>
                <p>El código del QR no corresponde a un certificado emitido por Grupo Indelsi.</p>
            @else
                <span class="badge {{ $valid ? 'ok' : 'expired' }}">
                    {{ $valid ? 'Válido' : 'Vencido' }}
                </span>
                <h1>{{ $certificate->participant_name }}</h1>
                <p class="course">{{ $certificate->course_title }}</p>
                <dl>
                    <dt>DNI</dt>
                    <dd>{{ $certificate->participant_dni }}</dd>
                    <dt>Código</dt>
                    <dd>{{ $certificate->code }}</dd>
                    <dt>Emisión</dt>
                    <dd>{{ $certificate->issued_on?->format('d/m/Y') }}</dd>
                    <dt>Vencimiento</dt>
                    <dd>{{ $certificate->expires_on?->format('d/m/Y') ?: '—' }}</dd>
                </dl>
                <p style="margin-top: 18px; font-family: sans-serif; font-size: 14px;">
                    @if ($valid)
                        Este certificado pertenece a {{ $certificate->participant_name }}, DNI {{ $certificate->participant_dni }}, y se encuentra vigente.
                    @else
                        Este certificado pertenece a {{ $certificate->participant_name }}, DNI {{ $certificate->participant_dni }}, pero ya venció.
                    @endif
                </p>
                <p style="margin-top: 16px; font-family: sans-serif; font-size: 14px;">
                    <a href="{{ route('central.certificates.verify.pdf', $certificate->token) }}">Descargar el certificado</a>
                </p>
            @endif
        </div>
    </div>
</body>
</html>
