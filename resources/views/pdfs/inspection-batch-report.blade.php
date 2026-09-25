<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Paquete de inspecciones {{ $batch->inspected_on->format('d/m/Y') }}</title>
    <style>
        @page { margin: 22px 24px; size: A4 portrait; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #1a2b4c; line-height: 1.35; }
        table { border-collapse: collapse; width: 100%; }
        .hdr td { border: 1px solid #1a2b4c; vertical-align: middle; padding: 8px 10px; }
        .logo { height: 36px; }
        .title { font-size: 13px; font-weight: bold; text-align: center; text-transform: uppercase; }
        .meta { font-size: 9px; line-height: 1.45; }
        h2 { font-size: 11px; margin: 14px 0 6px; text-transform: uppercase; color: #1a2b4c; }
        .summary span { display: inline-block; margin-right: 16px; font-size: 10px; }
        .grid th, .grid td { border: 1px solid #c5d5e6; padding: 4px 5px; vertical-align: top; }
        .grid th { background: #1a2b4c; color: #fff; font-size: 8px; text-transform: uppercase; }
        .ok { color: #166534; font-weight: bold; }
        .no { color: #b91c1c; font-weight: bold; }
        .pill-ok { background: #dcfce7; color: #166534; font-weight: bold; text-align: center; }
        .pill-no { background: #fee2e2; color: #b91c1c; font-weight: bold; text-align: center; }
        .unit { page-break-inside: avoid; margin-top: 10px; }
        .unit h3 { margin: 0 0 4px; font-size: 10px; }
        .sig { margin-top: 16px; border-top: 1px solid #c5d5e6; padding-top: 8px; }
        .sig img { height: 56px; }
        .footer { margin-top: 12px; font-size: 8px; color: #5a7390; }
    </style>
</head>
<body>
<table class="hdr">
    <tr>
        <td style="width: 18%; text-align: center;">
            @if (! empty($logoSrc))
                <img class="logo" src="{{ $logoSrc }}" alt="Logo">
            @else
                <strong>Agrovision</strong>
            @endif
        </td>
        <td class="title">Paquete de inspecciones</td>
        <td style="width: 32%;" class="meta">
            <strong>Fecha:</strong> {{ $batch->inspected_on->format('d/m/Y') }}<br>
            <strong>Coordinador:</strong> {{ $batch->coordinator?->name ?? '—' }}<br>
            <strong>Inspecciones:</strong> {{ $rows->count() }}<br>
            <strong>Estado:</strong> {{ $batch->isSigned() ? 'Firmado' : 'Pendiente de firma' }}
        </td>
    </tr>
</table>

<div class="summary" style="margin-top: 10px;">
    <span class="ok">Conformes: {{ $conformes }}</span>
    <span class="no">Con faltantes: {{ $faltantes }}</span>
    <span>Firma masiva: una sola firma del coordinador cubre este paquete.</span>
</div>

<h2>Resumen</h2>
<table class="grid">
    <thead>
        <tr>
            <th style="width: 4%;">N°</th>
            <th style="width: 12%;">Placa</th>
            <th style="width: 24%;">Conductor</th>
            <th style="width: 28%;">Proveedor</th>
            <th style="width: 8%;">OK</th>
            <th style="width: 8%;">NO</th>
            <th style="width: 16%;">Estado</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($rows as $index => $row)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>{{ $row['plate_number'] ?: '—' }}</td>
                <td>{{ $row['driver_name'] ?: '—' }}</td>
                <td>{{ $row['provider'] ?: '—' }}</td>
                <td class="ok">{{ $row['ok'] }}</td>
                <td class="{{ $row['fail'] > 0 ? 'no' : '' }}">{{ $row['fail'] }}</td>
                <td class="{{ $row['conforme'] ? 'pill-ok' : 'pill-no' }}">
                    {{ $row['conforme'] ? 'CONFORME' : 'FALTA' }}
                </td>
            </tr>
        @endforeach
    </tbody>
</table>

@foreach ($rows as $row)
    <div class="unit">
        <h3>
            {{ $row['plate_number'] ?: 'Sin placa' }}
            · {{ $row['driver_name'] ?: 'Sin conductor' }}
            · <span class="{{ $row['conforme'] ? 'ok' : 'no' }}">{{ $row['conforme'] ? 'CONFORME' : 'FALTA' }}</span>
        </h3>
        <table class="grid">
            <thead>
                <tr>
                    <th style="width: 8%;">Ítem</th>
                    <th>Descripción</th>
                    <th style="width: 12%;">Resultado</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($row['items'] as $item)
                    <tr>
                        <td>{{ $item['number'] }}</td>
                        <td>{{ $item['label'] }}</td>
                        <td class="{{ $item['value'] === 'yes' ? 'pill-ok' : ($item['value'] === 'no' ? 'pill-no' : '') }}">
                            @if ($item['value'] === 'yes')
                                OK
                            @elseif ($item['value'] === 'no')
                                NO
                            @else
                                —
                            @endif
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>
@endforeach

<div class="sig">
    <strong>Firma masiva del coordinador</strong><br>
    @if ($batch->isSigned())
        {{ $batch->signer_name }} · {{ $batch->signed_at?->timezone(config('app.timezone'))->format('d/m/Y H:i') }}
        · cubre las {{ $rows->count() }} inspecciones del {{ $batch->inspected_on->format('d/m/Y') }}.
        @if ($signatureSrc)
            <div><img src="{{ $signatureSrc }}" alt="Firma"></div>
        @endif
    @else
        Pendiente. El coordinador firma una sola vez para todo el paquete.
    @endif
</div>

<div class="footer">
    Documento generado automáticamente · Agrovision · Paquete {{ $batch->id }}
</div>
</body>
</html>
