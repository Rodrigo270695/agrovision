<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Inspecciones de seguridad</title>
    <style>
        @page { margin: 18px 20px; size: A4 landscape; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #1a2b4c; }
        table { border-collapse: collapse; width: 100%; }
        .hdr td { border: 1px solid #1a2b4c; vertical-align: middle; padding: 8px 10px; }
        .logo { height: 72px; width: auto; }
        .title { font-size: 14px; font-weight: bold; text-align: center; text-transform: uppercase; }
        .meta { font-size: 9px; line-height: 1.45; }
        h2 { font-size: 11px; margin: 14px 0 6px; text-transform: uppercase; }
        .grid th, .grid td { border: 1px solid #c5d5e6; padding: 4px 6px; }
        .grid th { background: #1a2b4c; color: #fff; font-size: 8px; text-transform: uppercase; }
        .num { text-align: center; font-weight: bold; }
        .pend { background: #f59e0b; color: #fff; }
        .baja { background: #94a3b8; color: #fff; }
        .hechas { background: #22c55e; color: #fff; }
        .total { background: #e8eef8; }
        .bar { height: 8px; background: #e8eef5; margin-top: 3px; }
        .bar span { display: block; height: 8px; }
        .ok { color: #166534; font-weight: bold; }
        .no { color: #b91c1c; font-weight: bold; }
        .pill-ok { background: #dcfce7; color: #166534; font-weight: bold; text-align: center; }
        .pill-no { background: #fee2e2; color: #b91c1c; font-weight: bold; text-align: center; }
        .note { margin-top: 6px; font-size: 8px; color: #5a7390; }
    </style>
</head>
<body>
@php
    $hechas = (int) $summary['ok'];
    $approved = (int) $summary['approved'];
    $rejected = (int) $summary['rejected'];
    $approvedWidth = $hechas > 0 ? round(($approved / $hechas) * 100) : 0;
    $rejectedWidth = $hechas > 0 ? round(($rejected / $hechas) * 100) : 0;
    $groupLabel = match ($group) {
        'ok' => 'OK',
        'nok' => 'No OK',
        'pendiente' => 'Pendientes',
        default => 'Todas',
    };
@endphp

<table class="hdr">
    <tr>
        <td style="width: 22%; text-align: center;">
            @if (! empty($logoSrc))
                <img class="logo" src="{{ $logoSrc }}" alt="Logo" height="72">
            @else
                <strong>{{ $company ?: 'Agrovision' }}</strong>
            @endif
        </td>
        <td class="title">Inspecciones de seguridad</td>
        <td style="width: 34%;" class="meta">
            <strong>Fecha:</strong> {{ $summary['week_label'] }}<br>
            <strong>Coordinador:</strong> {{ $coordinatorName }}<br>
            <strong>Inspector:</strong> {{ $inspectorName }}<br>
            <strong>Listado:</strong> {{ $groupLabel }}
        </td>
    </tr>
</table>

<table style="margin-top: 12px;">
    <tr>
        <td style="width: 48%; vertical-align: top; padding-right: 10px;">
            <h2 style="margin-top: 0;">Unidades móviles activas</h2>
            <table class="grid">
                <thead>
                    <tr>
                        <th>Tipo de unidad</th>
                        <th style="width: 22%;">Cantidad</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($fleet as $item)
                        <tr>
                            <td>{{ $item['type'] }}</td>
                            <td class="num">{{ $item['count'] }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="2">No hay unidades en el periodo activo.</td>
                        </tr>
                    @endforelse
                    <tr>
                        <td><strong>Total</strong></td>
                        <td class="num">{{ $summary['total'] }}</td>
                    </tr>
                </tbody>
            </table>
        </td>
        <td style="width: 52%; vertical-align: top;">
            <h2 style="margin-top: 0;">Avance de inspecciones</h2>
            <table class="grid">
                <thead>
                    <tr>
                        <th class="pend">Pendientes</th>
                        <th class="baja">Baja</th>
                        <th class="hechas">Hechas</th>
                        <th class="total">Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="num">{{ $summary['pendiente'] }}</td>
                        <td class="num">{{ $summary['baja'] }}</td>
                        <td class="num">{{ $summary['ok'] }}</td>
                        <td class="num">{{ $summary['total'] }}</td>
                    </tr>
                </tbody>
            </table>
            <p class="note">Hechas del total: {{ $summary['percent'] }}%.</p>

            <table style="margin-top: 8px;">
                <tr>
                    <td style="width: 50%; padding-right: 8px;">
                        <span class="ok">Aprobadas {{ $approved }}</span>
                        <div class="bar"><span style="width: {{ $approvedWidth }}%; background: #22c55e;"></span></div>
                    </td>
                    <td style="width: 50%;">
                        <span class="no">Desaprobadas {{ $rejected }}</span>
                        <div class="bar"><span style="width: {{ $rejectedWidth }}%; background: #ef4444;"></span></div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

@if (count($fullCoverage) === 0)
    <p class="note">Ningún requisito está al 100% en todas las unidades del filtro.</p>
@else
    <p class="note"><strong>Se inspeccionó al 100% en:</strong> {{ implode(', ', $fullCoverage) }}.</p>
@endif

<h2>Unidades · {{ $groupLabel }} ({{ $rows->count() }})</h2>
<table class="grid">
    <thead>
        <tr>
            <th style="width: 4%;">N°</th>
            <th style="width: 12%;">Tipo de servicio</th>
            <th style="width: 10%;">Placa</th>
            <th style="width: 18%;">Coordinador</th>
            <th style="width: 16%;">Responsable</th>
            <th style="width: 10%;">Ingreso</th>
            <th style="width: 12%;">Vehículo</th>
            <th style="width: 6%;">Insp.</th>
            <th>Observaciones</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($rows as $index => $row)
            <tr>
                <td class="num">{{ $index + 1 }}</td>
                <td>{{ $row['service_type'] }}</td>
                <td>{{ $row['plate'] }}{{ $row['status'] === 'baja' ? ' (*)' : '' }}</td>
                <td>{{ $row['coordinator'] }}</td>
                <td>{{ $row['responsible'] }}</td>
                <td>{{ $row['service_date'] }}</td>
                <td>{{ $row['vehicle_type'] }}</td>
                <td class="{{ $row['inspection'] === 'OK' ? 'pill-ok' : 'pill-no' }}">{{ $row['inspection'] }}</td>
                <td>{{ $row['observations'] }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="9">No hay unidades en este listado.</td>
            </tr>
        @endforelse
    </tbody>
</table>
<p class="note">(*) Unidad de baja. No vino en la última carga o la observación dice baja.</p>
</body>
</html>
