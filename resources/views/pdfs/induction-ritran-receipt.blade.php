<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Comprobante RITRAN {{ $attendee->driver_dni }}</title>
    <style>
        @page { margin: 22px 24px; size: A4 portrait; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #111; line-height: 1.45; }
        table { border-collapse: collapse; width: 100%; }
        .hdr td { border: 1px solid #222; vertical-align: middle; padding: 8px 10px; }
        .logo { height: 40px; }
        .title { font-size: 12px; font-weight: bold; text-align: center; text-transform: uppercase; }
        .meta { font-size: 9px; line-height: 1.45; }
        .section { margin-top: 18px; }
        h2 { text-align: center; font-size: 13px; margin: 14px 0 6px; text-transform: uppercase; }
        h3 { text-align: center; font-size: 11px; margin: 0 0 14px; text-transform: uppercase; }
        p { margin: 0 0 10px; text-align: justify; }
        .field { margin-top: 18px; }
        .line { display: inline-block; border-bottom: 1px solid #222; min-width: 240px; padding: 0 4px 2px; }
        .sigs {
            width: 70%;
            margin: 40px auto 0;
            table-layout: fixed;
        }
        .sigs td {
            width: 50%;
            vertical-align: top;
            text-align: center;
            padding: 10px 16px 0;
        }
        .sig-img { max-height: 60px; max-width: 200px; display: inline-block; }
        .huella {
            width: 78px;
            height: 100px;
            border: 1px solid #222;
            display: inline-block;
        }
        .sig-line {
            border-bottom: 1px solid #222;
            width: 200px;
            margin: 6px auto 0;
        }
        .muted { color: #555; font-size: 9px; }
    </style>
</head>
<body>
@php
    $closed = $induction->closed_at
        ? \Carbon\Carbon::parse($induction->closed_at)
        : null;
    $closedDate = $closed ? $closed->format('d-m-Y') : '____ - ____ - ________';
    $closedTime = $closed ? $closed->format('H:i') : '';
    $closedLine = $closed
        ? $closed->locale('es')->translatedFormat('d \\d\\e F \\d\\e Y')
        : '____ , ____ , ________';
@endphp

<table class="hdr">
    <tr>
        <td style="width: 16%; text-align: center;">
            @if ($logoSrc)
                <img class="logo" src="{{ $logoSrc }}" alt="{{ $companyName ?? 'Logo' }}">
            @elseif (! empty($companyName))
                <strong>{{ $companyName }}</strong>
            @endif
        </td>
        <td style="width: 54%;" class="title">
            Reglamento Interno de Tránsito
        </td>
        <td style="width: 30%;" class="meta">
            <strong>Código:</strong> {{ $formats['ritran_code'] }}<br>
            <strong>Revisión:</strong> {{ $formats['ritran_revision'] }}<br>
            <strong>Página:</strong> 1 de 1
        </td>
    </tr>
</table>

<div class="section">
    <h2>Comprobante de recepción</h2>
    <h3>Reglamento Interno de Tránsito (RITRAN)</h3>

    <p>
        Yo, <strong>{{ $attendee->driver_name }}</strong>,
        con DNI N° <strong>{{ $attendee->driver_dni ?: '____________' }}</strong>,
        dejo constancia de haber recibido un ejemplar del Reglamento Interno de
        Tránsito (RITRAN), revisión
        <strong>{{ $formats['ritran_revision'] }}</strong>,
        de la empresa AGROVISIÓN PERÚ S.A.C.
    </p>

    <p>
        Declaro que me ha sido explicado el contenido del documento, que comprendo su
        obligatoriedad y que me comprometo a cumplir con las disposiciones establecidas, los
        estándares de seguridad y procedimientos específicos en seguridad y salud en el trabajo.
    </p>

    <p>
        Mi compromiso es leer su contenido y dar cumplimiento durante el desempeño de mi trabajo,
        este registro será entregado a Gestión Humana para adjuntarlo a mi file personal.
    </p>

    <div class="field">
        <strong>Puesto de Trabajo:</strong>
        <span class="line">CONDUCTOR</span>
    </div>

    <div class="field">
        <strong>Fecha y hora de cierre de inducción:</strong>
        <span class="line">{{ $closedDate }}{{ $closedTime ? ' '.$closedTime : '' }}</span>
        <span class="muted"> ({{ $closedLine }})</span>
    </div>

    <table class="sigs">
        <tr>
            <td>
                <strong>Firma:</strong><br><br>
                @if (! empty($signatureSrc))
                    <img class="sig-img" src="{{ $signatureSrc }}" alt="Firma">
                @endif
                <div class="sig-line"></div>
                <div class="muted" style="margin-top: 4px;">{{ $attendee->driver_name }}</div>
            </td>
            <td>
                <strong>Huella:</strong><br><br>
                @if (! empty($fingerprintSrc))
                    <img class="sig-img" style="max-height: 100px; max-width: 90px;" src="{{ $fingerprintSrc }}" alt="Huella">
                @else
                    <span class="huella"></span>
                @endif
            </td>
        </tr>
    </table>
</div>
</body>
</html>
