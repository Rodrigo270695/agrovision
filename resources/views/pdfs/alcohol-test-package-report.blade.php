<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Reporte alcohómetro {{ $package->id }}</title>
    <style>
        @page { margin: 24px 28px; size: A4 portrait; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #111; line-height: 1.4; }
        table { border-collapse: collapse; width: 100%; }
        .hdr td { border: 1px solid #222; vertical-align: middle; padding: 8px 10px; }
        .logo { height: 40px; }
        .title { font-size: 12px; font-weight: bold; text-align: center; text-transform: uppercase; }
        .meta { font-size: 9px; line-height: 1.4; }
        h2 { text-align: center; font-size: 13px; margin: 14px 0 8px; text-transform: uppercase; }
        p { margin: 0 0 8px; }
        .summary { margin: 10px 0 14px; }
        .summary span { display: inline-block; margin-right: 14px; }
        .grid th, .grid td { border: 1px solid #333; padding: 5px 6px; vertical-align: top; }
        .grid th { background: #1a2b4c; color: #fff; font-size: 9px; text-transform: uppercase; }
        .pos { color: #8b3a3a; font-weight: bold; }
        .neg { color: #2f6b4f; font-weight: bold; }
        .footer { margin-top: 18px; font-size: 8px; color: #555; border-top: 1px solid #ccc; padding-top: 6px; }
    </style>
</head>
<body>
@php
    $session = $package->session_date
        ? \Carbon\Carbon::parse($package->session_date)->format('d-m-Y')
        : '—';
    $positive = $tests->where('is_positive', true)->count();
    $negative = $tests->where('is_positive', false)->count();
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
            Acta / reporte de alcohómetro
        </td>
        <td style="width: 30%;" class="meta">
            <strong>Paquete:</strong> {{ str_pad((string) $package->id, 6, '0', STR_PAD_LEFT) }}<br>
            <strong>Fecha operativo:</strong> {{ $session }}<br>
            <strong>Tolerancia:</strong> 0.000 %
        </td>
    </tr>
</table>

<h2>{{ $package->title }}</h2>
@if ($package->notes)
    <p><strong>Notas:</strong> {{ $package->notes }}</p>
@endif

<div class="summary">
    <span><strong>Total tests:</strong> {{ $tests->count() }}</span>
    <span><strong>Positivos:</strong> {{ $positive }}</span>
    <span><strong>Negativos:</strong> {{ $negative }}</span>
</div>

<table class="grid">
    <thead>
        <tr>
            <th style="width: 4%;">N°</th>
            <th style="width: 22%;">Conductor</th>
            <th style="width: 10%;">DNI</th>
            <th style="width: 10%;">Placa</th>
            <th style="width: 10%;">Nivel %</th>
            <th style="width: 10%;">Resultado</th>
            <th style="width: 12%;">Acta coord.</th>
            <th style="width: 22%;">Medidas</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($tests as $index => $test)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>{{ $test->driver_name }}</td>
                <td>{{ $test->driver_dni ?: '—' }}</td>
                <td>{{ $test->plate_number ?: '—' }}</td>
                <td>{{ number_format((float) $test->alcohol_level, 3, '.', '') }}</td>
                <td class="{{ $test->is_positive ? 'pos' : 'neg' }}">
                    {{ $test->is_positive ? 'POSITIVO' : 'NEGATIVO' }}
                </td>
                <td>
                    @if (! $test->is_positive)
                        —
                    @elseif ($test->coordinator_status === 'acknowledged')
                        Firmada
                    @else
                        Pendiente
                    @endif
                </td>
                <td>{{ $test->coordinator_action_plan ?: '—' }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="8" style="text-align: center;">Sin tests en este paquete.</td>
            </tr>
        @endforelse
    </tbody>
</table>

<p style="margin-top: 12px;">
    En resultados positivos (tolerancia 0) el personal a cargo no debe permitir el ingreso
    hasta disposición del coordinador responsable de la unidad.
</p>

<div class="footer">
    Agrovisión — App digital CCT / SST-Flota. Registro agrupado de alcohómetro. Los tests no se eliminan.
</div>
</body>
</html>
