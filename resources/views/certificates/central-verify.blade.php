<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $found ? 'Certificado '.$certificate->code : 'Certificado no encontrado' }}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            font-family: "Segoe UI", sans-serif;
            color: #12355b;
            background:
                radial-gradient(circle at 12% 8%, rgba(15, 118, 110, 0.18), transparent 32%),
                radial-gradient(circle at 90% 0%, rgba(161, 98, 7, 0.16), transparent 28%),
                linear-gradient(160deg, #e7eef6 0%, #f7fafc 48%, #e6f6f3 100%);
        }
        .page { max-width: 680px; margin: 0 auto; padding: 28px 16px 48px; }
        .card {
            overflow: hidden;
            background: #fff;
            border-radius: 28px;
            box-shadow: 0 24px 60px rgba(18, 53, 91, 0.14);
        }
        .band {
            position: relative;
            padding: 28px 24px 22px;
            color: #fff;
            background: linear-gradient(135deg, #12355b 0%, #0f766e 100%);
        }
        .band.expired { background: linear-gradient(135deg, #7c2d12 0%, #a16207 100%); }
        .band.missing { background: linear-gradient(135deg, #7f1d1d 0%, #9f1239 100%); }
        .band::after {
            content: "";
            position: absolute;
            right: -40px;
            bottom: -46px;
            width: 140px;
            height: 140px;
            border: 18px solid rgba(255, 255, 255, 0.12);
            border-radius: 50%;
        }
        .logos { position: relative; z-index: 1; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px; min-height: 54px; }
        .logos img { height: 52px; max-width: 120px; object-fit: contain; background: #fff; border-radius: 12px; padding: 6px 8px; }
        .wordmark { font-size: 13px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }
        .status {
            position: relative;
            z-index: 1;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-top: 16px;
            border-radius: 999px;
            padding: 6px 12px;
            background: rgba(255, 255, 255, 0.16);
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: #86efac; box-shadow: 0 0 0 4px rgba(134, 239, 172, 0.25); }
        .expired .dot { background: #fde68a; box-shadow: 0 0 0 4px rgba(253, 230, 138, 0.25); }
        .missing .dot { background: #fecaca; box-shadow: 0 0 0 4px rgba(254, 202, 202, 0.25); }
        .body { padding: 26px 24px 28px; }
        .kicker { margin: 0; color: #0f766e; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
        h1 { margin: 8px 0 0; font-family: Georgia, "Times New Roman", serif; font-size: 32px; line-height: 1.15; }
        .course {
            margin: 14px 0 0;
            padding: 12px 14px;
            border-radius: 14px;
            background: #f3f7fb;
            border-left: 4px solid #1d4ed8;
            font-size: 16px;
            font-weight: 700;
        }
        .facts { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; }
        .fact { padding: 12px 14px; border-radius: 16px; background: #f8fafc; border: 1px solid #e6eef6; }
        .fact span { display: block; color: #5a7390; font-size: 12px; }
        .fact strong { display: block; margin-top: 3px; font-size: 15px; }
        .note { margin: 18px 0 0; color: #334155; font-size: 14px; line-height: 1.5; }
        .signer { margin: 14px 0 0; color: #12355b; font-size: 13px; }
        .download {
            display: inline-flex;
            margin-top: 18px;
            padding: 12px 16px;
            border-radius: 12px;
            background: #12355b;
            color: #fff;
            font-size: 14px;
            font-weight: 700;
            text-decoration: none;
        }
        .foot { padding: 0 24px 22px; color: #5a7390; font-size: 12px; }
        @media (max-width: 520px) {
            h1 { font-size: 26px; }
            .facts { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="page">
        <article class="card">
            @if (! $found)
                <header class="band missing">
                    <div class="logos"><span class="wordmark">Grupo Indelsi</span></div>
                    <div class="status"><span class="dot"></span> No encontrado</div>
                </header>
                <div class="body">
                    <h1>No encontramos ese certificado</h1>
                    <p class="note">El código del QR no corresponde a un certificado emitido por Grupo Indelsi.</p>
                </div>
            @else
                <header class="band {{ $valid ? '' : 'expired' }}">
                    <div class="logos">
                        @forelse ($logos as $logo)
                            <img src="{{ $logo }}" alt="Logo">
                        @empty
                            <span class="wordmark">Grupo Indelsi</span>
                        @endforelse
                    </div>
                    <div class="status"><span class="dot"></span> {{ $valid ? 'Válido' : 'Vencido' }}</div>
                </header>
                <div class="body">
                    <p class="kicker">Certificado verificado</p>
                    <h1>{{ $certificate->participant_name }}</h1>
                    <p class="course">{{ $certificate->course_title }}</p>
                    <div class="facts">
                        <div class="fact"><span>DNI</span><strong>{{ $certificate->participant_dni }}</strong></div>
                        <div class="fact"><span>Código</span><strong>{{ $certificate->code }}</strong></div>
                        <div class="fact"><span>Inicio</span><strong>{{ $certificate->issued_on?->format('d/m/Y') ?: '—' }}</strong></div>
                        <div class="fact"><span>Vencimiento</span><strong>{{ $certificate->expires_on?->format('d/m/Y') ?: '—' }}</strong></div>
                    </div>
                    <p class="note">
                        @if ($valid)
                            Este certificado pertenece a {{ $certificate->participant_name }}, DNI {{ $certificate->participant_dni }}, y se encuentra vigente.
                        @else
                            Este certificado pertenece a {{ $certificate->participant_name }}, DNI {{ $certificate->participant_dni }}, pero ya venció.
                        @endif
                    </p>
                    @if ($issuerName)
                        <p class="signer">Firma: {{ $issuerName }}{{ $issuerTitle ? ' · '.$issuerTitle : '' }}</p>
                    @endif
                    <a class="download" href="{{ route('central.certificates.verify.pdf', $certificate->token) }}">Descargar el certificado</a>
                </div>
                <p class="foot">Grupo Indelsi · Verificación de certificados</p>
            @endif
        </article>
    </div>
</body>
</html>
