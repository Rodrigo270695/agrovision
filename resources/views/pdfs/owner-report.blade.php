<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Reporte consolidado</title>
    <style>
        @page { margin: 18px 20px; size: A4 landscape; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #1a2b4c; }
        h1 { font-size: 16px; margin: 0 0 4px; }
        .meta { color: #5a7390; margin-bottom: 10px; }
        h2 { font-size: 11px; margin: 14px 0 6px; text-transform: uppercase; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #c5d5e6; padding: 4px 6px; }
        th { background: #1a2b4c; color: #fff; font-size: 8px; text-transform: uppercase; }
        .num { text-align: center; }
        .ok { background: #dcfce7; }
        .mid { background: #fef3c7; }
        .bad { background: #fee2e2; }
        .muted { background: #f1f5f9; }
        .cards td { border: 1px solid #d7e3f0; background: #f8fafc; width: 16.6%; text-align: center; }
        .cards strong { display: block; font-size: 14px; margin-top: 2px; }
    </style>
</head>
<body>
    <h1>Reporte consolidado · {{ $company }}</h1>
    <p class="meta">{{ $filters['label'] }} · Generado {{ $generatedAt }} (hora Perú)</p>

    <table class="cards">
        <tr>
            <td>En meta del periodo<strong>{{ $summary['met_today'] }}/{{ $summary['with_quota'] }}</strong></td>
            <td>Inspecciones<strong>{{ $summary['inspections'] }}</strong></td>
            <td>Demora promedio<strong>{{ $summary['avg_minutes'] === null ? '—' : $summary['avg_minutes'].' min' }}</strong></td>
            <td>Capacitaciones<strong>{{ $summary['sessions'] }}</strong></td>
            <td>Llegaron<strong>{{ $summary['arrived'] }}/{{ $summary['cited'] }}</strong></td>
            <td>Firma y huella<strong>{{ $summary['signed'] }}</strong></td>
        </tr>
    </table>

    <h2>Cuota de inspectores</h2>
    <table>
        <thead>
            <tr>
                <th>Inspector</th>
                <th>Cuota diaria</th>
                <th>Hoy</th>
                <th>En el periodo</th>
                <th>Días en meta</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($quotas as $row)
                <tr class="{{ $row['tone'] }}">
                    <td>{{ $row['name'] }}</td>
                    <td class="num">{{ $row['daily_quota'] ?? '—' }}</td>
                    <td class="num">{{ $row['today'] }}</td>
                    <td class="num">{{ $row['period'] }}</td>
                    <td class="num">{{ $row['days_met'] }}/{{ $row['days_with_work'] }}</td>
                </tr>
            @empty
                <tr><td colspan="5">No hay inspectores.</td></tr>
            @endforelse
        </tbody>
    </table>

    <h2>Capacitaciones</h2>
    <table>
        <thead>
            <tr>
                <th>Sesión</th>
                <th>Fecha</th>
                <th>Responsable</th>
                <th>Citados</th>
                <th>Llegaron</th>
                <th>Firma y huella</th>
                <th>No asistieron</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($inductions as $row)
                <tr class="{{ $row['tone'] }}">
                    <td>{{ $row['title'] }}</td>
                    <td>{{ $row['when'] }} · {{ $row['status'] }}</td>
                    <td>{{ $row['facilitator'] }}</td>
                    <td class="num">{{ $row['cited'] }}</td>
                    <td class="num">{{ $row['arrived'] }}</td>
                    <td class="num">{{ $row['signed'] }}</td>
                    <td class="num">{{ $row['absent'] }}</td>
                </tr>
            @empty
                <tr><td colspan="7">No hay capacitaciones en el periodo.</td></tr>
            @endforelse
        </tbody>
    </table>

    <h2>Inspecciones por inspector</h2>
    <table>
        <thead>
            <tr>
                <th>Inspector</th>
                <th>Inspecciones</th>
                <th>Cuota</th>
                <th>Días en meta</th>
                <th>Demora promedio</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($inspectors as $row)
                <tr class="{{ $row['tone'] }}">
                    <td>{{ $row['name'] }}</td>
                    <td class="num">{{ $row['total'] }}</td>
                    <td class="num">{{ $row['quota'] ?? '—' }}</td>
                    <td class="num">{{ $row['days_met'] }}/{{ $row['days_with_work'] }}</td>
                    <td class="num">{{ $row['avg_minutes'] === null ? '—' : $row['avg_minutes'].' min' }}</td>
                </tr>
            @empty
                <tr><td colspan="5">No hay inspecciones en el periodo.</td></tr>
            @endforelse
        </tbody>
    </table>

    <h2>Duración de cada inspección</h2>
    <table>
        <thead>
            <tr>
                <th>Placa</th>
                <th>Inspector</th>
                <th>1ra empezó</th>
                <th>1ra terminó</th>
                <th>Demora 1ra</th>
                <th>Resultado 1ra</th>
                <th>2da</th>
                <th>Resultado 2da</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>
            @forelse (array_slice($details, 0, 80) as $row)
                <tr>
                    <td>{{ $row['plate'] }}</td>
                    <td>{{ $row['inspector'] }}</td>
                    <td>{{ $row['first_at'] }}</td>
                    <td>{{ $row['first_finished'] }}</td>
                    <td>{{ $row['first_duration'] }}</td>
                    <td>{{ $row['first_result'] }}</td>
                    <td>{{ $row['second_at'] }}</td>
                    <td>{{ $row['second_result'] }}</td>
                    <td>{{ $row['status'] }}</td>
                </tr>
            @empty
                <tr><td colspan="9">No hay inspecciones en el periodo.</td></tr>
            @endforelse
        </tbody>
    </table>
    @if ($details_total > 80)
        <p class="meta">Se listan 80 de {{ $details_total }} inspecciones.</p>
    @endif
</body>
</html>
