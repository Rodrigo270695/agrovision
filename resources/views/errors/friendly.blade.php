<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title ?? 'Error' }} · Agrovisión</title>
    <style>
        body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, sans-serif; background: #f1f5f9; color: #1a2b4c; }
        .wrap { max-width: 28rem; margin: 0 auto; padding: 2.5rem 1.25rem; }
        .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 12px 40px -24px rgba(15,31,58,.25); }
        h1 { font-size: 1.25rem; margin: 0 0 .5rem; }
        p { font-size: .9375rem; line-height: 1.5; color: #475569; margin: 0 0 1rem; }
        .code { font-size: .75rem; color: #94a3b8; margin-bottom: 1rem; }
        a.btn { display: inline-block; padding: .5rem 1rem; border-radius: .75rem; background: #1a2b4c; color: #fff; text-decoration: none; font-size: .875rem; font-weight: 600; }
        a.btn:hover { background: #243a5c; }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="card">
            <h1>{{ $title ?? 'No se pudo completar' }}</h1>
            @if (! empty($status))
                <p class="code">Código {{ $status }}</p>
            @endif
            <p>{{ $message ?? 'Intenta de nuevo más tarde.' }}</p>
            <a class="btn" href="{{ $back_url ?? url('/') }}">{{ $back_label ?? 'Volver' }}</a>
        </div>
    </div>
</body>
</html>