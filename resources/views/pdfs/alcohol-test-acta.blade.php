<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Acta alcohómetro {{ $test->id }}</title>
    <style>
        @page { margin: 28px 32px; size: A4 portrait; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #111; line-height: 1.45; }
        table { border-collapse: collapse; width: 100%; }
        .hdr td { border: 1px solid #222; vertical-align: middle; padding: 8px 10px; }
        .logo { height: 42px; }
        .title { font-size: 13px; font-weight: bold; text-align: center; text-transform: uppercase; }
        .meta { font-size: 9px; line-height: 1.45; }
        h2 { text-align: center; font-size: 14px; margin: 18px 0 8px; text-transform: uppercase; }
        p { margin: 0 0 10px; text-align: justify; }
        .box { border: 1px solid #222; padding: 10px 12px; margin-top: 12px; }
        .row { margin: 4px 0; }
        .label { display: inline-block; min-width: 140px; font-weight: bold; }
        .alert { background: #f7e8e8; border: 1px solid #c07070; padding: 8px 10px; margin: 12px 0; }
        .ok { background: #eef7f1; border: 1px solid #6fa88a; padding: 8px 10px; margin: 12px 0; }
        .sig { max-height: 70px; max-width: 220px; }
        .sig-line { border-bottom: 1px solid #222; width: 220px; margin-top: 6px; }
        .muted { color: #555; font-size: 9px; }
        .footer { margin-top: 28px; font-size: 9px; color: #555; border-top: 1px solid #ccc; padding-top: 8px; }
    </style>
</head>
<body>
@php
    $tested = $test->tested_at ? \Carbon\Carbon::parse($test->tested_at) : null;
    $signed = $test->coordinator_signed_at ? \Carbon\Carbon::parse($test->coordinator_signed_at) : null;
    $level = number_format((float) $test->alcohol_level, 3, '.', '');
@endphp

<table class="hdr">
    <tr>
        <td style="width: 18%; text-align: center;">
            @if (! empty($logoSrc))
                <img class="logo" src="{{ $logoSrc }}" alt="Agrovision">
            @else
                <strong>AGROVISIÓN</strong>
            @endif
        </td>
        <td style="width: 52%;" class="title">
            Acta de control de alcohómetro
        </td>
        <td style="width: 30%;" class="meta">
            <strong>N°:</strong> {{ str_pad((string) $test->id, 6, '0', STR_PAD_LEFT) }}<br>
            <strong>Fecha test:</strong> {{ $tested?->format('d-m-Y H:i') ?? '—' }}<br>
            <strong>Tolerancia:</strong> 0.000 %
        </td>
    </tr>
</table>

<h2>Registro de ingreso / control</h2>

<p>
    Se deja constancia del test de alcohómetro practicado al conductor indicado,
    con <strong>tolerancia cero</strong>. En caso de resultado positivo, el personal
    a cargo <strong>no debe permitir el ingreso</strong> al área hasta la disposición
    del coordinador responsable.
</p>

@if ($test->is_positive)
    <div class="alert">
        <strong>RESULTADO: POSITIVO</strong> — Nivel detectado: {{ $level }} %
        (por encima de tolerancia 0).
    </div>
@else
    <div class="ok">
        <strong>RESULTADO: NEGATIVO</strong> — Nivel detectado: {{ $level }} %.
    </div>
@endif

<div class="box">
    <div class="row"><span class="label">Conductor:</span> {{ $test->driver_name }}</div>
    <div class="row"><span class="label">DNI:</span> {{ $test->driver_dni ?: '—' }}</div>
    <div class="row"><span class="label">Placa / unidad:</span> {{ $test->plate_number ?: '—' }}</div>
    <div class="row"><span class="label">Fecha y hora:</span> {{ $tested?->format('d/m/Y H:i') ?? '—' }}</div>
    <div class="row"><span class="label">Lugar / área:</span> {{ $test->location ?: '—' }}</div>
    <div class="row"><span class="label">Nivel alcohol:</span> {{ $level }} %</div>
    <div class="row"><span class="label">Periodo:</span> {{ $test->period?->name ?: '—' }}</div>
    <div class="row"><span class="label">Registrado por:</span> {{ $test->creator?->name ?: '—' }}</div>
    @if ($test->notes)
        <div class="row"><span class="label">Observaciones:</span> {{ $test->notes }}</div>
    @endif
</div>

@if (! empty($evidenceSrc))
    <div class="box" style="margin-top: 16px; text-align: center;">
        <strong>Foto de evidencia del test</strong><br><br>
        <img src="{{ $evidenceSrc }}" alt="Evidencia" style="max-width: 320px; max-height: 240px;">
    </div>
@endif

@if ($test->is_positive)
    <div class="box" style="margin-top: 16px;">
        <strong>Medidas del coordinador</strong>
        <div class="row" style="margin-top: 8px;">
            <span class="label">Estado:</span>
            {{ $test->coordinator_status === 'acknowledged' ? 'Acta firmada' : 'Pendiente de firma' }}
        </div>
        <div class="row">
            <span class="label">Coordinador:</span>
            {{ $test->coordinator?->name ?: ($test->coordinator_signer_name ?: '—') }}
        </div>
        <div class="row" style="margin-top: 8px;">
            <strong>Plan de acción / medidas:</strong><br>
            {{ $test->coordinator_action_plan ?: 'Pendiente de registro por el coordinador.' }}
        </div>

        <div style="margin-top: 24px; text-align: center;">
            <strong>Firma del coordinador</strong><br><br>
            @if (! empty($signatureSrc))
                <img class="sig" src="{{ $signatureSrc }}" alt="Firma">
            @endif
            <div class="sig-line" style="margin-left: auto; margin-right: auto;"></div>
            <div class="muted" style="margin-top: 4px;">
                {{ $test->coordinator_signer_name ?: '—' }}
                @if ($signed)
                    · {{ $signed->format('d/m/Y H:i') }}
                @endif
            </div>
        </div>
    </div>
@endif

<div class="footer">
    Documento generado por Agrovisión — App digital CCT / SST-Flota.
    Los registros de alcohómetro no se eliminan (trazabilidad).
</div>
</body>
</html>
