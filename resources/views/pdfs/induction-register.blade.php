<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Registro de Inducción {{ $induction->acta_number }}</title>
    <style>
        @page { margin: 12px 14px; size: A4 landscape; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 8px; color: #111; }
        table { border-collapse: collapse; width: 100%; }
        .bordered td, .bordered th { border: 1px solid #222; }
        .hdr td { vertical-align: middle; padding: 4px 6px; }
        .logo { height: 34px; }
        .title { font-size: 12px; font-weight: bold; text-align: center; text-transform: uppercase; line-height: 1.25; }
        .meta { font-size: 8px; line-height: 1.4; }
        .section { margin-top: 5px; }
        .label { font-size: 7px; font-weight: bold; text-transform: uppercase; color: #333; }
        .cell { padding: 3px 5px; vertical-align: top; }
        .check { display: inline-block; width: 9px; height: 9px; border: 1px solid #222; text-align: center; line-height: 9px; font-size: 8px; margin-right: 2px; }
        .on { background: #1a2b4c; color: #fff; }
        .att th { font-size: 8px; padding: 5px 4px; text-align: left; border-bottom: 1px solid #222; text-transform: uppercase; }
        .att td { padding: 6px 4px 8px; vertical-align: bottom; border-bottom: 1px solid #999; }
        .sig { max-height: 28px; max-width: 110px; }
        .page-break { page-break-before: always; }
        .muted { color: #555; }
        .line-title { font-size: 9px; font-weight: bold; margin: 4px 0 8px; text-transform: uppercase; }
    </style>
</head>
<body>
@php
    $checked = static fn (bool $ok) => $ok ? 'on' : '';
    $mark = static fn (bool $ok) => $ok ? 'X' : '';
    $cats = collect($induction->categories ?? []);
    $sessionAt = $induction->session_date ?? $induction->scheduled_at ?? null;
    $sessionCarbon = $sessionAt ? \Carbon\Carbon::parse($sessionAt) : null;
    // Encabezado y cuerpo: fecha en que se dictó (dd-mm-yyyy)
    $fmtSessionDate = $sessionCarbon ? $sessionCarbon->format('d-m-Y') : '—';
    $fmtTime = static function ($value) {
        if (! $value) {
            return '—';
        }

        return substr((string) $value, 0, 5);
    };
    $acta = $induction->acta_number ?: str_pad((string) $induction->id, 6, '0', STR_PAD_LEFT);
@endphp

{{-- HOJA 1: formato de inducción --}}
<table class="bordered hdr">
    <tr>
        <td style="width: 14%; text-align: center;">
            @if ($logoSrc)
                <img class="logo" src="{{ $logoSrc }}" alt="Agrovision">
            @else
                <strong>AGROVISION</strong>
            @endif
        </td>
        <td style="width: 58%;" class="title">
            Formato - Registro de Inducción, Capacitación,<br>
            Entrenamiento y Simulacro
        </td>
        <td style="width: 28%;" class="meta">
            <strong>Código:</strong> {{ $induction->document_code ?: '—' }}<br>
            <strong>Revisión:</strong> {{ $induction->document_revision ?: '—' }}<br>
            <strong>Fecha:</strong> {{ $fmtSessionDate }}<br>
            <strong>Página:</strong> 1 de 3<br>
            <strong>N° Acta:</strong> {{ $acta }}
        </td>
    </tr>
</table>

<table class="bordered section">
    <tr>
        <td class="cell" style="width: 12%;"><span class="label">Tema</span></td>
        <td class="cell" colspan="3"><strong>{{ $induction->title }}</strong></td>
    </tr>
    <tr>
        <td class="cell"><span class="label">Temario</span></td>
        <td class="cell" colspan="3">{{ $induction->temario ?: '—' }}</td>
    </tr>
</table>

<table class="bordered section">
    <tr>
        <td class="cell" colspan="5"><span class="label">Actividad</span></td>
    </tr>
    <tr>
        @foreach ($activityLabels as $key => $label)
            <td class="cell">
                <span class="check {{ $checked(($induction->activity ?? '') === $key) }}">{{ $mark(($induction->activity ?? '') === $key) }}</span>
                {{ $label }}
            </td>
        @endforeach
    </tr>
</table>

<table class="bordered section">
    <tr>
        <td class="cell" style="width: 34%;">
            <span class="label">Acción correctiva</span><br>
            <span class="check {{ $checked((bool) $induction->corrective_action) }}">{{ $mark((bool) $induction->corrective_action) }}</span> SI
            &nbsp;
            <span class="check {{ $checked(! $induction->corrective_action) }}">{{ $mark(! $induction->corrective_action) }}</span> NO
        </td>
        <td class="cell" style="width: 33%;">
            <span class="label">Modalidad</span><br>
            @foreach ($modalityLabels as $key => $label)
                <span class="check {{ $checked(($induction->modality ?? '') === $key) }}">{{ $mark(($induction->modality ?? '') === $key) }}</span> {{ $label }}
                &nbsp;
            @endforeach
        </td>
        <td class="cell">
            <span class="label">Escuela</span><br>
            @foreach ($schoolLabels as $key => $label)
                <span class="check {{ $checked(($induction->school ?? '') === $key) }}">{{ $mark(($induction->school ?? '') === $key) }}</span> {{ $label }}
                @if (! $loop->last) &nbsp; @endif
            @endforeach
        </td>
    </tr>
</table>

<table class="bordered section">
    <tr>
        <td class="cell" colspan="4"><span class="label">Categorías</span></td>
    </tr>
    <tr>
        @php $i = 0; @endphp
        @foreach ($categoryLabels as $key => $label)
            @if ($i > 0 && $i % 4 === 0)
                </tr><tr>
            @endif
            <td class="cell" style="width: 25%;">
                <span class="check {{ $checked($cats->contains($key)) }}">{{ $mark($cats->contains($key)) }}</span>
                {{ $label }}
                @if ($key === 'otros' && $induction->category_other)
                    : {{ $induction->category_other }}
                @endif
            </td>
            @php $i++; @endphp
        @endforeach
        @while ($i % 4 !== 0)
            <td class="cell"></td>
            @php $i++; @endphp
        @endwhile
    </tr>
</table>

<table class="bordered section">
    <tr>
        <td class="cell"><span class="label">Fecha</span><br>{{ $fmtSessionDate }}</td>
        <td class="cell"><span class="label">Hora inicio</span><br>{{ $fmtTime($induction->start_time) }}</td>
        <td class="cell"><span class="label">Hora término</span><br>{{ $fmtTime($induction->end_time) }}</td>
        <td class="cell"><span class="label">Tiempo estimado</span><br>{{ $induction->estimated_minutes ? $induction->estimated_minutes.' minutos' : '—' }}</td>
    </tr>
    <tr>
        <td class="cell"><span class="label">Sede</span><br>{{ $induction->sede ?: '—' }}</td>
        <td class="cell"><span class="label">Departamento</span><br>{{ $induction->department ?: '—' }}</td>
        <td class="cell"><span class="label">Área</span><br>{{ $induction->area ?: '—' }}</td>
        <td class="cell"><span class="label">Sección</span><br>{{ $induction->section ?: '—' }}</td>
    </tr>
    <tr>
        <td class="cell"><span class="label">Zona</span><br>{{ $induction->zone ?: '—' }}</td>
        <td class="cell"><span class="label">Grupo objetivo</span><br>{{ $induction->target_group ?: '—' }}</td>
        <td class="cell"><span class="label">Cultivo</span><br>{{ $induction->crop ?: '—' }}</td>
        <td class="cell"><span class="label">Unidad</span><br>{{ $induction->org_unit ?: '—' }}</td>
    </tr>
    <tr>
        <td class="cell" colspan="2">
            <span class="label">Nombre del expositor</span><br>{{ $induction->speaker_name ?: '—' }}
        </td>
        <td class="cell" colspan="2">
            <span class="label">Institución de procedencia</span><br>{{ $induction->speaker_institution ?: '—' }}
        </td>
    </tr>
    <tr>
        <td class="cell" colspan="4">
            <span class="label">Firma del expositor</span><br>
            @if (! empty($speakerSignatureSrc))
                <img class="sig" style="max-height: 40px;" src="{{ $speakerSignatureSrc }}" alt="Firma expositor">
            @else
                —
            @endif
        </td>
    </tr>
</table>

{{-- HOJA 2: lista de asistentes --}}
<div class="page-break">
    <table class="bordered hdr">
        <tr>
            <td style="width: 14%; text-align: center;">
                @if ($logoSrc)
                    <img class="logo" src="{{ $logoSrc }}" alt="Agrovision">
                @else
                    <strong>AGROVISION</strong>
                @endif
            </td>
            <td style="width: 58%;" class="title">
                Formato - Registro de Inducción, Capacitación,<br>
                Entrenamiento y Simulacro
            </td>
            <td style="width: 28%;" class="meta">
                <strong>Código:</strong> {{ $induction->document_code ?: '—' }}<br>
                <strong>Revisión:</strong> {{ $induction->document_revision ?: '—' }}<br>
                <strong>Fecha:</strong> {{ $fmtSessionDate }}<br>
                <strong>Página:</strong> 2 de 3<br>
                <strong>N° Acta:</strong> {{ $acta }}
            </td>
        </tr>
    </table>

    <div class="line-title">Asistentes (orden alfabético)</div>

    <table class="att" style="width: 100%;">
        <thead>
            <tr>
                <th style="width: 6%;">N°</th>
                <th style="width: 14%;">DNI</th>
                <th style="width: 26%;">Área / Cargo</th>
                <th style="width: 36%;">Apellidos y Nombres</th>
                <th style="width: 18%;">Firma</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($attendees as $row)
                <tr>
                    <td>{{ $row['n'] }}</td>
                    <td>{{ $row['dni'] ?: '—' }}</td>
                    <td>{{ $row['area_cargo'] }}</td>
                    <td><strong>{{ $row['name'] }}</strong></td>
                    <td>
                        @if (! empty($row['signature_src']))
                            <img class="sig" src="{{ $row['signature_src'] }}" alt="Firma">
                        @endif
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" class="muted" style="text-align: center; padding: 16px;">
                        No hay asistentes firmados.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>

{{-- HOJA 3: foto de verificación --}}
<div class="page-break">
    <table class="bordered hdr">
        <tr>
            <td style="width: 14%; text-align: center;">
                @if ($logoSrc)
                    <img class="logo" src="{{ $logoSrc }}" alt="Agrovision">
                @else
                    <strong>AGROVISION</strong>
                @endif
            </td>
            <td style="width: 58%;" class="title">
                Formato - Registro de Inducción, Capacitación,<br>
                Entrenamiento y Simulacro
            </td>
            <td style="width: 28%;" class="meta">
                <strong>Código:</strong> {{ $induction->document_code ?: '—' }}<br>
                <strong>Revisión:</strong> {{ $induction->document_revision ?: '—' }}<br>
                <strong>Fecha:</strong> {{ $fmtSessionDate }}<br>
                <strong>Página:</strong> 3 de 3<br>
                <strong>N° Acta:</strong> {{ $acta }}
            </td>
        </tr>
    </table>

    <div class="line-title">Foto de verificación</div>
    <p class="muted" style="margin: 0 0 10px;">
        Evidencia fotográfica de la capacitación / inducción realizada.
    </p>

    <div style="text-align: center; padding: 8px 0;">
        @if (! empty($verificationPhotoSrc))
            <img
                src="{{ $verificationPhotoSrc }}"
                alt="Foto de verificación"
                style="max-width: 92%; max-height: 420px; border: 1px solid #999;"
            >
        @else
            <div class="muted" style="padding: 40px; border: 1px dashed #999;">
                Sin foto de verificación.
            </div>
        @endif
    </div>
</div>
</body>
</html>
