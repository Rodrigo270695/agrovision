<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; color: #1a2b4c; line-height: 1.5;">
    <p>Hola {{ $coordinatorName }},</p>
    <p>
        Se programó la inducción <strong>{{ $induction->title }}</strong>
        @if ($induction->session_date)
            para el {{ $induction->session_date->format('d/m/Y') }}
        @endif
        @if ($induction->sede || $induction->location)
            en {{ $induction->sede ?: $induction->location }}
        @endif
        .
    </p>
    <p>Conductores a tu cargo en esta inducción:</p>
    <ul>
        @foreach ($drivers as $driver)
            <li>
                {{ $driver['name'] }}
                @if ($driver['dni'])
                    · DNI {{ $driver['dni'] }}
                @endif
                @if ($driver['plate'])
                    · placa {{ $driver['plate'] }}
                @endif
            </li>
        @endforeach
    </ul>
    <p>Adjuntamos los reglamentos en PDF de esta capacitación.</p>
</body>
</html>
