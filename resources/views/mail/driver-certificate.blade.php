<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; color: #1a2b4c; line-height: 1.5;">
    <p>Hola {{ $certificate->participant_name }},</p>
    <p>
        Adjuntamos tu certificado de <strong>{{ $certificate->course_title }}</strong>.
        Código {{ $certificate->code }}.
        @if ($certificate->expires_on)
            Vence el {{ $certificate->expires_on->format('d/m/Y') }}.
        @endif
    </p>
    <p>
        Puedes verificarlo en
        <a href="{{ $verifyUrl }}">{{ $verifyUrl }}</a>.
    </p>
</body>
</html>
