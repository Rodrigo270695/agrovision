<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Inspección {{ strtoupper($checklist->template->type ?? '') }} — {{ $checklist->plate_number }}</title>
    <style>
        @page { margin: 18px 22px; }
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 10px;
            color: #1a2b4c;
            line-height: 1.35;
        }
        h1 { font-size: 15px; margin: 0 0 4px; }
        h2 {
            font-size: 11px;
            margin: 14px 0 6px;
            padding-bottom: 3px;
            border-bottom: 1px solid #c5d5e6;
            color: #1a2b4c;
        }
        .muted { color: #5a7390; }
        .header { width: 100%; margin-bottom: 10px; }
        .header td { vertical-align: middle; }
        .logo { height: 42px; }
        .badge {
            display: inline-block;
            padding: 2px 7px;
            border-radius: 10px;
            font-size: 9px;
            font-weight: bold;
        }
        .badge-ok { background: #e8f7ef; color: #15803d; }
        .badge-no { background: #fef2f2; color: #b91c1c; }
        .badge-seal { background: #e8f1fa; color: #2e5a9e; }
        .meta { width: 100%; border-collapse: collapse; margin-top: 6px; }
        .meta td {
            border: 1px solid #d7e3f0;
            padding: 5px 7px;
            width: 25%;
            vertical-align: top;
        }
        .meta .label {
            display: block;
            font-size: 8px;
            color: #6b8ead;
            text-transform: uppercase;
            margin-bottom: 2px;
        }
        .items { width: 100%; border-collapse: collapse; }
        .items th {
            background: #1a2b4c;
            color: #fff;
            font-size: 8px;
            text-transform: uppercase;
            padding: 5px 6px;
            text-align: left;
        }
        .items td {
            border: 1px solid #e2eaf3;
            padding: 4px 6px;
            vertical-align: top;
        }
        .items tr:nth-child(even) td { background: #f8fafc; }
        .child { padding-left: 14px; color: #5a7390; }
        .num {
            display: inline-block;
            min-width: 18px;
            font-weight: bold;
        }
        .sig-grid { width: 100%; border-collapse: collapse; margin-top: 4px; }
        .sig-grid td {
            width: 50%;
            border: 1px solid #d7e3f0;
            padding: 8px;
            vertical-align: top;
        }
        .sig-label { font-size: 9px; font-weight: bold; margin-bottom: 3px; }
        .sig-name { font-size: 10px; margin-bottom: 6px; }
        .sig-img { max-width: 100%; max-height: 70px; }
        .sig-empty {
            height: 56px;
            border: 1px dashed #c5d5e6;
            color: #94a3b8;
            text-align: center;
            line-height: 56px;
            font-size: 9px;
        }
        .photos { width: 100%; border-collapse: collapse; }
        .photos td {
            width: 50%;
            padding: 6px;
            vertical-align: top;
            border: 1px solid #e2eaf3;
        }
        .photo-img { max-width: 100%; max-height: 160px; }
        .footer {
            margin-top: 14px;
            font-size: 8px;
            color: #6b8ead;
            border-top: 1px solid #e2eaf3;
            padding-top: 6px;
        }
        .badge-obs { background: #fff7ed; color: #c2410c; }
        .badge-rev { background: #ede9fe; color: #6d28d9; }
        .pareto-box {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            border: 1px solid #d7e3f0;
        }
        .pareto-box td {
            padding: 8px 10px;
            vertical-align: middle;
        }
        .pareto-legend { font-size: 9px; color: #5a7390; line-height: 1.5; }
        .dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 4px;
        }
        .logo { height: 48px; max-width: 120px; }
    </style>
</head>
<body>
    @php
        $result = static function (?string $value): string {
            return match ($value) {
                'approved' => 'Aprobado',
                'rejected' => 'Desaprobado',
                default => 'Pendiente',
            };
        };
        $fmtDate = static function ($date, $time = null): string {
            if (! $date) {
                return '—';
            }
            $text = $date->format('d/m/Y');
            if ($time) {
                $text .= ' '.substr((string) $time, 0, 5);
            }

            return $text;
        };
        $statusLabel = 'Borrador';
        $statusClass = 'badge-seal';
        if ($checklist->sealed_at) {
            $statusLabel = 'SELLADO';
            $statusClass = 'badge-seal';
        } elseif ($checklist->coordinator_status === 'reviewed') {
            $statusLabel = 'REVISADO';
            $statusClass = 'badge-rev';
        } elseif ($checklist->coordinator_status === 'observed') {
            $statusLabel = 'OBSERVADO';
            $statusClass = 'badge-obs';
        } elseif ($checklist->first_result === 'approved') {
            $statusLabel = '1RA APROBADA';
            $statusClass = 'badge-ok';
        }
        $paretoChart = $paretoChart ?? ['percent' => 0, 'scored' => 0, 'remaining' => 0, 'total' => 0, 'svg' => ''];
        $paretoPercent = (float) ($paretoChart['percent'] ?? 0);
        $effectiveFirstResult = \App\Support\ParetoPassThreshold::resolveResult(
            $paretoPercent,
            $checklist->first_result,
        );
        $effectiveSecondResult = $checklist->second_result;
        $passThreshold = \App\Support\ParetoPassThreshold::MIN_PERCENT;
    @endphp

    <table class="header">
        <tr>
            <td style="width: 90px;">
                @if (! empty($logoSrc))
                    <img class="logo" src="{{ $logoSrc }}" alt="Agrovision">
                @endif
            </td>
            <td>
                <h1>Informe de inspección {{ strtoupper($checklist->template->type ?? '') }}</h1>
                <div class="muted">
                    {{ $checklist->template->code ?? '' }} · {{ $checklist->template->name ?? '' }}
                </div>
                <div style="margin-top: 4px;">
                    <span class="badge {{ $statusClass }}">{{ $statusLabel }}</span>
                    @if ($checklist->sealed_at)
                        <span class="muted">
                            {{ $checklist->sealed_at->timezone(config('app.timezone'))->format('d/m/Y H:i') }}
                        </span>
                    @endif
                </div>
            </td>
            <td style="text-align: right; width: 160px;">
                <div style="font-size: 16px; font-weight: bold;">{{ $checklist->plate_number }}</div>
                <div class="muted">{{ $checklist->period?->name ?? 'Periodo' }}</div>
            </td>
        </tr>
    </table>

    <table class="pareto-box">
        <tr>
            <td style="width: 130px; text-align: center;">
                {!! $paretoChart['svg'] !!}
            </td>
            <td>
                <div style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">Pareto (1ra inspección)</div>
                <div class="pareto-legend">
                    <div><span class="dot" style="background:#15803d;"></span>Cumple (SÍ): {{ number_format($paretoChart['scored'], 2) }}%</div>
                    <div><span class="dot" style="background:#dbe4ef;"></span>No cumple / pendiente: {{ number_format($paretoChart['remaining'], 2) }}%</div>
                    <div style="margin-top: 4px; color:#1a2b4c;">
                        <strong>Resultado: {{ number_format($paretoPercent, 2) }}%</strong>
                        de {{ number_format($paretoChart['total'], 2) }}%
                        · Umbral {{ number_format($passThreshold, 0) }}%
                        @if ($paretoPercent < $passThreshold)
                            <span style="color:#b91c1c;">(Desaprobado)</span>
                        @else
                            <span style="color:#15803d;">(≥ {{ number_format($passThreshold, 0) }}%)</span>
                        @endif
                    </div>
                </div>
            </td>
        </tr>
    </table>

    <h2>Datos generales</h2>
    <table class="meta">
        <tr>
            <td><span class="label">Conductor</span>{{ $checklist->driver_name ?: '—' }}</td>
            <td><span class="label">Proveedor</span>{{ $checklist->provider ?: '—' }}</td>
            <td><span class="label">Empresa transporte</span>{{ $checklist->transport_company ?: '—' }}</td>
            <td><span class="label">Lugar</span>{{ $checklist->location ?: '—' }}</td>
        </tr>
        <tr>
            <td><span class="label">Vehículo</span>{{ $checklist->vehicle_info ?: '—' }}</td>
            <td><span class="label">Licencia</span>{{ $checklist->license_number ?: '—' }}</td>
            <td><span class="label">Clase / categoría</span>{{ $checklist->license_class ?: '—' }}</td>
            <td>
                <span class="label">Revalidación</span>
                {{ $checklist->license_revalidation_on?->format('d/m/Y') ?: '—' }}
            </td>
        </tr>
        <tr>
            <td>
                <span class="label">1ra inspección</span>
                {{ $fmtDate($checklist->first_inspected_on, $checklist->first_inspected_time) }}
            </td>
            <td>
                <span class="label">Resultado 1ra</span>
                {{ $result($effectiveFirstResult) }}
            </td>
            <td>
                <span class="label">2da inspección</span>
                {{ $fmtDate($checklist->second_inspected_on, $checklist->second_inspected_time) }}
            </td>
            <td>
                <span class="label">Resultado 2da</span>
                {{ $result($effectiveSecondResult) }}
            </td>
        </tr>
    </table>

    <h2>Exigencias</h2>
    <table class="items">
        <thead>
            <tr>
                <th style="width: 52%;">Ítem</th>
                <th style="width: 12%;">1ra</th>
                <th style="width: 12%;">2da</th>
                <th style="width: 24%;">Observaciones</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($rows as $row)
                <tr>
                    <td class="{{ $row['is_child'] ? 'child' : '' }}">
                        <span class="num">{{ $row['item_number'] }}</span>
                        {{ $row['label'] }}
                    </td>
                    <td>
                        @if ($row['first_value'] === 'yes')
                            <span class="badge badge-ok">SÍ</span>
                        @elseif ($row['first_value'] === 'no')
                            <span class="badge badge-no">NO</span>
                        @else
                            —
                        @endif
                    </td>
                    <td>
                        @if ($row['second_value'] === 'yes')
                            <span class="badge badge-ok">SÍ</span>
                        @elseif ($row['second_value'] === 'no')
                            <span class="badge badge-no">NO</span>
                        @else
                            —
                        @endif
                    </td>
                    <td>{{ $row['observations'] ?: '—' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    @if ($checklist->additional_observations)
        <h2>Observaciones adicionales</h2>
        <p>{{ $checklist->additional_observations }}</p>
    @endif

    @if ($photos->isNotEmpty())
        <h2>Evidencias fotográficas</h2>
        <table class="photos">
            @foreach ($photos->chunk(2) as $chunk)
                <tr>
                    @foreach ($chunk as $photo)
                        <td>
                            <div class="muted" style="margin-bottom: 4px;">
                                {{ $photo->inspection_pass === 'second' ? '2da' : '1ra' }} inspección
                                @if ($photo->captured_at)
                                    · {{ $photo->captured_at->timezone(config('app.timezone'))->format('d/m/Y H:i:s') }}
                                @endif
                                @if ($photo->latitude && $photo->longitude)
                                    · GPS {{ number_format((float) $photo->latitude, 5) }},
                                    {{ number_format((float) $photo->longitude, 5) }}
                                @endif
                            </div>
                            @if (! empty($photo->image_src))
                                <img class="photo-img" src="{{ $photo->image_src }}" alt="Foto">
                            @endif
                        </td>
                    @endforeach
                    @if ($chunk->count() === 1)
                        <td></td>
                    @endif
                </tr>
            @endforeach
        </table>
    @endif

    @if ($checklist->coordinator_status)
        <h2>Respuesta del coordinador</h2>
        <table class="meta">
            <tr>
                <td>
                    <span class="label">Estado</span>
                    {{ $checklist->coordinator_status === 'reviewed' ? 'Revisado' : 'Observado' }}
                </td>
                <td>
                    <span class="label">Enviado</span>
                    {{ $checklist->sent_to_coordinator_at?->timezone(config('app.timezone'))->format('d/m/Y H:i') ?: '—' }}
                </td>
                <td>
                    <span class="label">Recibido por</span>
                    {{ $checklist->coordinator_signer_name ?: '—' }}
                </td>
                <td>
                    <span class="label">Respondido</span>
                    {{ $checklist->coordinator_responded_at?->timezone(config('app.timezone'))->format('d/m/Y H:i') ?: '—' }}
                </td>
            </tr>
        </table>
        @if ($checklist->coordinator_action_plan)
            <p style="margin-top: 6px;"><strong>Plan de acción / descargo:</strong><br>{{ $checklist->coordinator_action_plan }}</p>
        @endif
        @if (! empty($coordinatorSignatureSrc))
            <div style="margin-top: 6px;">
                <div class="muted" style="margin-bottom: 3px;">Firma de recibido</div>
                <img class="sig-img" src="{{ $coordinatorSignatureSrc }}" alt="Firma coordinador">
            </div>
        @endif
    @endif

    <h2>Firmas / responsables</h2>
    <table class="sig-grid">
        @foreach ($signatures->chunk(2) as $chunk)
            <tr>
                @foreach ($chunk as $signature)
                    <td>
                        <div class="sig-label">{{ $signature['label'] }}</div>
                        <div class="sig-name">{{ $signature['signer_name'] ?: '—' }}</div>
                        @if (! empty($signature['image_src']))
                            <img class="sig-img" src="{{ $signature['image_src'] }}" alt="Firma">
                        @else
                            <div class="sig-empty">Sin firma</div>
                        @endif
                        @if (! empty($signature['signed_at']))
                            <div class="muted" style="margin-top: 4px;">Firmado: {{ $signature['signed_at'] }}</div>
                        @endif
                    </td>
                @endforeach
                @if ($chunk->count() === 1)
                    <td></td>
                @endif
            </tr>
        @endforeach
    </table>

    <div class="footer">
        Documento generado automáticamente · Agrovision ·
        {{ now()->timezone(config('app.timezone'))->format('d/m/Y H:i') }}
    </div>
</body>
</html>
