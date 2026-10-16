<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Comprobantes RISST</title>
    <style>
        @page { margin: 28px 32px 24px; size: A4 portrait; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111; line-height: 1.45; }
        table { border-collapse: collapse; width: 100%; }
        .sheet { page-break-after: always; }
        .sheet:last-child { page-break-after: auto; }
        .hdr td { border: 1px solid #222; vertical-align: middle; padding: 8px 10px; }
        .logo { height: 42px; }
        .title { font-size: 13px; font-weight: bold; text-align: center; text-transform: uppercase; line-height: 1.25; }
        .meta { font-size: 11px; line-height: 1.45; }
        h2 { text-align: center; font-size: 16px; margin: 28px 0 22px; letter-spacing: 0.3px; }
        p { margin: 0 0 14px; text-align: justify; }
        .fill { font-weight: bold; }
        .details { margin-top: 8px; }
        .details td { vertical-align: top; }
        .bullet { margin: 0 0 10px; }
        .sig { max-height: 48px; max-width: 180px; vertical-align: middle; }
        .box {
            width: 118px;
            height: 118px;
            border: 1.5px solid #222;
            text-align: center;
            margin: 0 36px 0 auto;
        }
        .print { max-height: 108px; max-width: 100px; }
        .footer {
            margin-top: 36px;
            border: 1px solid #222;
            text-align: center;
            font-size: 9px;
            padding: 4px 8px;
        }
    </style>
</head>
<body>
@php
    $sessionAt = $induction->session_date ?? $induction->scheduled_at ?? null;
    $receivedOn = $sessionAt
        ? \Carbon\Carbon::parse($sessionAt)->format('d/m/Y')
        : '____ / ____ / ________';
@endphp

@foreach ($rows as $row)
    @php
        $attendee = $row['attendee'];
        $signatureSrc = $row['signature_src'] ?? null;
        $fingerprintSrc = $row['fingerprint_src'] ?? null;
        $company = trim((string) ($attendee->provider ?? ''));
    @endphp
    <div class="sheet">
        <table class="hdr">
            <tr>
                <td style="width: 18%; text-align: center;">
                    @if ($logoSrc)
                        <img class="logo" src="{{ $logoSrc }}" alt="Logo">
                    @endif
                </td>
                <td style="width: 52%;" class="title">
                    Reglamento<br>Interno de Seguridad y Salud en el<br>Trabajo
                </td>
                <td style="width: 30%;" class="meta">
                    <strong>Código:</strong> {{ $formats['risst_code'] }}<br>
                    <strong>Versión:</strong> {{ $formats['risst_revision'] }}
                </td>
            </tr>
        </table>

        <h2>COMPROBANTE DE RECEPCIÓN</h2>

        <p>
            Yo, <span class="fill">{{ $attendee->driver_name }}</span>,
            identificado(a) con DNI N° <span class="fill">{{ $attendee->driver_dni ?: '________' }}</span>,
            en calidad de trabajador(a) de la empresa <span class="fill">{{ $company !== '' ? $company : '____________________' }}</span>, dejo
            constancia de haber recibido en esta fecha un ejemplar del Reglamento Interno de
            Seguridad y Salud en el Trabajo (RISST) con fecha de aprobación del 30/09/2026 de la
            empresa AGROVISION PERÚ S.A.C. De acuerdo con lo establecido en el Decreto supremo
            N° 005-2012-TR artículo 75°, que señala: Facilitar a todo trabajador una copia del RISST.
        </p>

        <p>
            Declaro que me ha sido explicado el contenido del documento, que comprendo su
            obligatoriedad y que me comprometo a cumplir con las disposiciones establecidas, los
            estándares de seguridad y procedimientos específicos en seguridad y salud en el trabajo.
        </p>

        <p>
            Mi compromiso es leer su contenido y dar cumplimiento durante el desempeño de mi
            trabajo, este registro será entregado a Gestión Humana para adjuntarlo a mi file personal.
        </p>

        <table class="details">
            <tr>
                <td style="width: 72%;">
                    <p class="bullet">• &nbsp; Puesto de trabajo: <span class="fill">CONDUCTOR</span></p>
                    <p class="bullet">
                        • &nbsp; Firma del trabajador:
                        @if (! empty($signatureSrc))
                            <img class="sig" src="{{ $signatureSrc }}" alt="Firma">
                        @else
                            ______________________________
                        @endif
                    </p>
                    <p class="bullet">• &nbsp; Fecha de recepción: <span class="fill">{{ $receivedOn }}</span></p>
                </td>
                <td style="width: 28%; text-align: right;">
                    <div class="box">
                        @if (! empty($fingerprintSrc))
                            <img class="print" src="{{ $fingerprintSrc }}" alt="Huella">
                        @endif
                    </div>
                </td>
            </tr>
        </table>

        <div class="footer">
            Prohibida la reproducción parcial o total de este documento, sin la autorización de la Gerencia General
        </div>
    </div>
@endforeach
</body>
</html>
