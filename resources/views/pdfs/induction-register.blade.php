<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Registro de Inducción {{ $induction->acta_number }}</title>
    <style>
        @page { margin: 10px 12px 14px; size: A4 portrait; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 7.5px; color: #111; }
        table { border-collapse: collapse; width: 100%; }
        .bordered td, .bordered th { border: 1px solid #222; }
        .hdr td { vertical-align: middle; padding: 3px 5px; }
        .logo { height: 28px; }
        .title { font-size: 10px; font-weight: bold; text-align: center; text-transform: uppercase; line-height: 1.2; }
        .meta { font-size: 7.5px; line-height: 1.35; }
        .cell { padding: 2px 4px; vertical-align: middle; }
        .label { font-weight: bold; text-transform: uppercase; }
        .check { display: inline-block; width: 8px; height: 8px; border: 1px solid #222; text-align: center; line-height: 8px; font-size: 7px; font-weight: bold; }
        .item { display: inline-block; margin: 0 7px 1px 0; white-space: nowrap; }
        .att th { font-size: 7px; padding: 3px 3px; text-align: center; text-transform: uppercase; background: #fff; }
        .att td { padding: 3px 3px; vertical-align: middle; height: 18px; }
        .sig { max-height: 36px; max-width: 140px; }
        .center { text-align: center; }
        .expositor { padding: 8px 4px 2px; text-align: center; line-height: 1.3; }
    </style>
</head>
<body>
@php
    $mark = static fn (bool $ok) => $ok ? 'X' : '';
    $box = static function (bool $ok, string $label) use ($mark) {
        return '<span class="item"><span class="check">'.$mark($ok).'</span> '.e($label).'</span>';
    };
    $cats = collect($induction->categories ?? []);
    $sessionAt = $induction->session_date ?? $induction->scheduled_at ?? null;
    $sessionCarbon = $sessionAt ? \Carbon\Carbon::parse($sessionAt) : null;
    $fmtSessionDate = $sessionCarbon ? $sessionCarbon->format('d-m-Y') : '—';
    $fmtTime = static function ($value) {
        if (! $value) {
            return '—';
        }

        return substr((string) $value, 0, 5);
    };
    $acta = $induction->acta_number ?: str_pad((string) $induction->id, 6, '0', STR_PAD_LEFT);
    $rows = collect($attendees);
    $minRows = 12;
    $blank = max(0, $minRows - $rows->count());
@endphp

<table class="bordered hdr">
    <tr>
        <td style="width: 16%;" class="center">
            @if ($logoSrc)
                <img class="logo" src="{{ $logoSrc }}" alt="Logo">
            @endif
        </td>
        <td style="width: 58%;" class="title">
            Formato<br>
            Registro de Inducción, Capacitación,<br>
            Entrenamiento y Simulacro
        </td>
        <td style="width: 26%;" class="meta">
            <strong>Código:</strong> {{ $induction->document_code ?: '—' }}<br>
            <strong>Revisión:</strong> {{ $induction->document_revision ?: '—' }}<br>
            <strong>Fecha:</strong> {{ $fmtSessionDate }}<br>
            <strong>Página:</strong> 1 de 1
        </td>
    </tr>
</table>

<table class="bordered" style="margin-top: 3px;">
    <tr>
        <td class="cell" style="text-align: right;"><span class="label">Código de acta:</span> {{ $acta }}</td>
    </tr>
</table>

<table class="bordered" style="margin-top: 3px;">
    <tr>
        <td class="cell"><span class="label">Tema:</span> {{ $induction->title }}</td>
    </tr>
    <tr>
        <td class="cell"><span class="label">Temario:</span> {{ $induction->temario ?: '—' }}</td>
    </tr>
</table>

<table class="bordered" style="margin-top: 3px;">
    <tr>
        <td class="cell" style="width: 68%;">
            <span class="label">Actividad:</span>
            @foreach ($activityLabels as $key => $label)
                {!! $box(($induction->activity ?? '') === $key, $label) !!}
            @endforeach
        </td>
        <td class="cell">
            <span class="label">Acción correctiva:</span>
            {!! $box((bool) $induction->corrective_action, 'Sí') !!}
            {!! $box(! $induction->corrective_action, 'No') !!}
        </td>
    </tr>
    <tr>
        <td class="cell">
            <span class="label">Modalidad de la capacitación:</span>
            @foreach ($modalityLabels as $key => $label)
                {!! $box(($induction->modality ?? '') === $key, $label) !!}
            @endforeach
        </td>
        <td class="cell">
            <span class="label">Escuela:</span>
            @foreach ($schoolLabels as $key => $label)
                {!! $box(($induction->school ?? '') === $key, $label) !!}
            @endforeach
        </td>
    </tr>
    <tr>
        <td class="cell" colspan="2">
            <span class="label">Categorías:</span>
            @foreach ($categoryLabels as $key => $label)
                @php
                    $text = $label;
                    if ($key === 'otros' && $induction->category_other) {
                        $text .= ': '.$induction->category_other;
                    }
                @endphp
                {!! $box($cats->contains($key), $text) !!}
            @endforeach
        </td>
    </tr>
</table>

<table class="bordered" style="margin-top: 3px;">
    <tr>
        <td class="cell" style="width: 25%;"><span class="label">Fecha:</span> {{ $fmtSessionDate }}</td>
        <td class="cell" style="width: 25%;"><span class="label">Hora inicio:</span> {{ $fmtTime($induction->start_time) }}</td>
        <td class="cell" style="width: 25%;"><span class="label">Hora término:</span> {{ $fmtTime($induction->end_time) }}</td>
        <td class="cell"><span class="label">Tiempo estimado:</span> {{ $induction->estimated_minutes ? $induction->estimated_minutes.' minutos' : '—' }}</td>
    </tr>
    <tr>
        <td class="cell"><span class="label">Sede:</span> {{ $induction->sede ?: '—' }}</td>
        <td class="cell"><span class="label">Departamento:</span> {{ $induction->department ?: '—' }}</td>
        <td class="cell" colspan="2"><span class="label">Área:</span> {{ $induction->area ?: '—' }}</td>
    </tr>
    <tr>
        <td class="cell"><span class="label">Sección:</span> {{ $induction->section ?: '—' }}</td>
        <td class="cell"><span class="label">Zona:</span> {{ $induction->zone ?: '—' }}</td>
        <td class="cell" colspan="2"><span class="label">Grupo objetivo:</span> {{ $induction->target_group ?: '—' }}</td>
    </tr>
    <tr>
        <td class="cell" colspan="2"><span class="label">Cultivo:</span> {{ $induction->crop ?: '—' }}</td>
        <td class="cell" colspan="2"><span class="label">Unidad:</span> {{ $induction->org_unit ?: '—' }}</td>
    </tr>
</table>

<table style="margin-top: 6px;">
    <tr>
        <td class="expositor" style="width: 50%;">
            <strong>{{ $induction->speaker_name ?: '—' }}</strong><br>
            <span class="label">Nombre del expositor</span>
        </td>
        <td class="expositor">
            <strong>{{ $induction->speaker_institution ?: '—' }}</strong><br>
            <span class="label">Institución de procedencia</span>
        </td>
    </tr>
</table>

<table class="bordered att" style="margin-top: 4px;">
    <thead>
        <tr>
            <th style="width: 6%;">N°</th>
            <th style="width: 14%;">DNI</th>
            <th style="width: 28%;">Área / Cargo</th>
            <th style="width: 34%;">Apellidos y nombres</th>
            <th style="width: 18%;">Firma</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($rows as $row)
            <tr>
                <td class="center">{{ $row['n'] }}</td>
                <td class="center">{{ $row['dni'] ?: '—' }}</td>
                <td class="center">{{ $row['area_cargo'] }}</td>
                <td>{{ $row['name'] }}</td>
                <td class="center">
                    @if (! empty($row['signature_src']))
                        <img class="sig" style="max-height: 16px;" src="{{ $row['signature_src'] }}" alt="Firma">
                    @endif
                </td>
            </tr>
        @endforeach
        @if ($rows->isEmpty())
            <tr>
                <td colspan="5" class="center" style="padding: 8px;">No hay asistentes firmados.</td>
            </tr>
        @endif
        @for ($i = 0; $i < $blank; $i++)
            <tr>
                <td class="center">{{ $rows->count() + $i + 1 }}</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
            </tr>
        @endfor
    </tbody>
</table>

<table style="margin-top: 16px;">
    <tr>
        <td style="width: 55%; text-align: center; vertical-align: bottom;">
            @if (! empty($speakerSignatureSrc))
                <img class="sig" src="{{ $speakerSignatureSrc }}" alt="Firma del expositor">
            @else
                <div style="height: 36px;"></div>
            @endif
            <div style="border-top: 1px solid #111; width: 220px; margin: 2px auto 0;"></div>
            <div style="margin-top: 3px; font-size: 8px; font-weight: bold;">FIRMA DEL EXPOSITOR</div>
        </td>
        <td style="width: 45%;"></td>
    </tr>
</table>
</body>
</html>
