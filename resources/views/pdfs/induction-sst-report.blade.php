<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Informe SST — {{ $induction->title }}</title>
    <style>
        @page { margin: 28px 36px; size: A4 portrait; }
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 12px;
            color: #111;
            line-height: 1.45;
        }
        .logo { height: 52px; max-width: 140px; }
        .header { width: 100%; margin-bottom: 18px; }
        .header td { vertical-align: middle; }
        h1 {
            font-size: 15px;
            text-align: center;
            text-transform: uppercase;
            margin: 8px 0 22px;
            letter-spacing: 0.3px;
        }
        .meta { margin-bottom: 10px; }
        .meta .row { margin: 4px 0; }
        .meta strong { display: inline-block; min-width: 52px; }
        .rule {
            border: 0;
            border-top: 1.5px solid #111;
            margin: 14px 0 18px;
        }
        .intro { margin-bottom: 16px; }
        .fields .row { margin: 7px 0; }
        .fields strong { display: inline-block; min-width: 168px; }
        .footer {
            margin-top: 36px;
            font-size: 9px;
            color: #555;
            border-top: 1px solid #ccc;
            padding-top: 8px;
        }
    </style>
</head>
<body>
@php
    $sessionAt = $induction->session_date ?? $induction->scheduled_at ?? null;
    $sessionCarbon = $sessionAt ? \Carbon\Carbon::parse($sessionAt) : null;
    $fmtLong = $sessionCarbon
        ? $sessionCarbon->locale('es')->translatedFormat('d \\d\\e F \\d\\e Y')
        : '—';
    $fmtShort = $sessionCarbon ? $sessionCarbon->format('d/m/Y') : '—';
    $fmtTime = static function ($value) {
        if (! $value) {
            return '—';
        }

        return substr((string) $value, 0, 5);
    };
    $hora = trim($fmtTime($induction->start_time).' - '.$fmtTime($induction->end_time));
    $acta = $induction->acta_number ?: str_pad((string) $induction->id, 6, '0', STR_PAD_LEFT);
    $participants = is_countable($attendeesCount ?? null)
        ? (int) $attendeesCount
        : (int) ($induction->attendees_count ?? 0);
@endphp

<table class="header">
    <tr>
        <td style="width: 70%;">
            <div style="font-size: 11px; color: #555;">Acta N° {{ $acta }}</div>
        </td>
        <td style="width: 30%; text-align: right;">
            @if (! empty($logoSrc))
                <img class="logo" src="{{ $logoSrc }}" alt="Agrovision">
            @else
                <strong>AGROVISION</strong>
            @endif
        </td>
    </tr>
</table>

<h1>Informe de Seguridad y Salud en el Trabajo</h1>

<div class="meta">
    <div class="row"><strong>Para :</strong> AGROVISION PERÚ S.A.C</div>
    <div class="row"><strong>De :</strong> {{ $induction->speaker_name ?: '—' }}</div>
    <div class="row"><strong>Tema :</strong> {{ $induction->title ?: '—' }}</div>
    <div class="row"><strong>Fecha:</strong> {{ $fmtLong }}</div>
</div>

<hr class="rule">

<p class="intro">
    Por el presente adjunto evidencia de capacitación que se realizó el día {{ $fmtShort }}.
</p>

<div class="fields">
    <div class="row"><strong>Hora:</strong> {{ $hora }}</div>
    <div class="row"><strong>Zona:</strong> {{ $induction->zone ?: ($induction->location ?: '—') }}</div>
    <div class="row"><strong>Cultivo:</strong> {{ $induction->crop ?: '—' }}</div>
    <div class="row"><strong>Tema:</strong> {{ $induction->title ?: '—' }}</div>
    <div class="row"><strong>Temario:</strong> {{ $induction->temario ?: '—' }}</div>
    <div class="row"><strong>Grupo Objetivo:</strong> {{ $induction->target_group ?: '—' }}</div>
    <div class="row"><strong>Expositor:</strong> {{ $induction->speaker_name ?: '—' }}</div>
    <div class="row"><strong>Sede:</strong> {{ $induction->sede ?: ($induction->location ?: '—') }}</div>
    <div class="row"><strong>Departamento:</strong> {{ $induction->department ?: '—' }}</div>
    <div class="row"><strong>Área:</strong> {{ $induction->area ?: '—' }}</div>
    <div class="row"><strong>Sección:</strong> {{ $induction->section ?: '—' }}</div>
    <div class="row"><strong>N° de participantes:</strong> {{ $participants > 0 ? $participants : '—' }}</div>
    <div class="row"><strong>Periodo:</strong> {{ $induction->period?->name ?: '—' }}</div>
    <div class="row"><strong>Código del material del tema:</strong> {{ $induction->document_code ?: 'Sin Material' }}</div>
</div>

<div class="footer">
    Documento generado automáticamente por Agrovision · Inducción / Capacitación SST
</div>
</body>
</html>
