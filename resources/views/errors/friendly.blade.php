<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title ?? 'Error' }} · Agrovisión</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
            color: #0f1f3a;
            background: linear-gradient(145deg, #1a2b4c 0%, #243a5c 45%, #0f1f3a 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem 1rem;
        }
        .glow-a, .glow-b {
            position: fixed;
            border-radius: 999px;
            filter: blur(72px);
            pointer-events: none;
        }
        .glow-a { width: 18rem; height: 18rem; top: -4rem; right: -3rem; background: rgba(251, 191, 36, 0.18); }
        .glow-b { width: 20rem; height: 20rem; bottom: -5rem; left: -4rem; background: rgba(56, 189, 248, 0.12); }
        .shell { position: relative; width: 100%; max-width: 28rem; z-index: 1; }
        .scene {
            margin-bottom: 1rem;
            padding: 1rem 1rem 1.25rem;
            border-radius: 1rem;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.06);
            backdrop-filter: blur(6px);
        }
        .scene-top {
            display: flex;
            justify-content: space-between;
            font-size: 0.62rem;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: rgba(255,255,255,0.55);
        }
        .road { width: 100%; height: 3.5rem; margin-top: 0.75rem; }
        .icons {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: -0.75rem;
            padding: 0 0.35rem;
        }
        .icon-box {
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 0.85rem;
            border: 1px solid rgba(255,255,255,0.18);
            background: rgba(15, 31, 58, 0.75);
            color: #bae6fd;
        }
        .icon-bus { width: 3.25rem; height: 3.25rem; font-size: 1.45rem; }
        .icon-status { width: 3.75rem; height: 3.75rem; font-size: 1.6rem; background: rgba(255,255,255,0.1); }
        .scene-caption {
            margin: 0.5rem 0 0;
            text-align: center;
            font-size: 0.68rem;
            font-weight: 600;
            letter-spacing: 0.08em;
            color: rgba(186, 230, 253, 0.75);
            text-transform: uppercase;
        }
        .card {
            background: rgba(255,255,255,0.97);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 1rem;
            padding: 1.5rem 1.35rem;
            box-shadow: 0 24px 60px -24px rgba(0,0,0,0.55);
            text-align: center;
        }
        .code {
            font-size: 0.68rem;
            font-weight: 700;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #3b6cb5;
            margin: 0 0 0.35rem;
        }
        h1 { font-size: 1.45rem; margin: 0 0 0.5rem; color: #0f1f3a; }
        .msg { font-size: 0.94rem; line-height: 1.55; color: #475569; margin: 0; }
        .hint {
            margin: 0.85rem 0 0;
            padding: 0.65rem 0.75rem;
            border-radius: 0.75rem;
            border: 1px solid #fde68a;
            background: #fffbeb;
            font-size: 0.78rem;
            line-height: 1.45;
            color: #78350f;
            text-align: left;
        }
        .actions { margin-top: 1.1rem; display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
        a.btn {
            display: inline-block;
            padding: 0.55rem 1rem;
            border-radius: 0.75rem;
            background: #1a2b4c;
            color: #fff;
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 600;
        }
        a.btn:hover { background: #243a5c; }
        a.btn-outline {
            background: #fff;
            color: #1a2b4c;
            border: 1px solid #e2e8f0;
        }
        a.btn-outline:hover { background: #f8fafc; }
    </style>
</head>
<body>
    <div class="glow-a" aria-hidden="true"></div>
    <div class="glow-b" aria-hidden="true"></div>

    <div class="shell" role="alert">
        <div class="scene" aria-hidden="true">
            <div class="scene-top">
                <span>Agrovisión</span>
                <span>
                    @if(($status ?? 0) === 404)
                        Fuera de ruta
                    @elseif(($status ?? 0) === 403)
                        Acceso restringido
                    @elseif(in_array($status ?? 0, [401, 419], true))
                        Control de acceso
                    @elseif(($status ?? 0) === 503)
                        Obra en pista
                    @elseif(($status ?? 0) >= 500)
                        Parada técnica
                    @else
                        Aviso en ruta
                    @endif
                </span>
            </div>
            <svg class="road" viewBox="0 0 320 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 40 C60 28, 120 48, 180 34 C230 22, 270 30, 312 26" stroke="rgba(255,255,255,0.28)" stroke-width="6" stroke-linecap="round"/>
                <path d="M8 40 C60 28, 120 48, 180 34 C230 22, 270 30, 312 26" stroke="#fbbf24" stroke-width="2" stroke-dasharray="10 14" stroke-linecap="round" opacity="0.9"/>
            </svg>
            <div class="icons">
                <div class="icon-box icon-bus" title="Flota">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect x="3" y="7" width="18" height="11" rx="2" stroke="currentColor" stroke-width="1.6"/>
                        <path d="M3 12h18M7 18v2M17 18v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                        <circle cx="7.5" cy="18" r="1.5" fill="currentColor"/>
                        <circle cx="16.5" cy="18" r="1.5" fill="currentColor"/>
                    </svg>
                </div>
                <div class="icon-box icon-status" title="Estado">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        @if(($status ?? 0) === 404)
                            <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" stroke="currentColor" stroke-width="1.6"/>
                            <circle cx="12" cy="11" r="2.2" stroke="currentColor" stroke-width="1.6"/>
                            <path d="M9.5 8.5 6.5 5.5M14.5 8.5l3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                        @elseif(($status ?? 0) === 403)
                            <path d="M12 3 4 7v6c0 4.5 3.4 8.7 8 10 4.6-1.3 8-5.5 8-10V7l-8-4Z" stroke="currentColor" stroke-width="1.6"/>
                            <path d="m9.5 12 1.8 1.8L15 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                        @elseif(($status ?? 0) >= 500)
                            <path d="M14.5 6.5 17 4M4 20l4.5-4.5M15 4h5v5M9 20H4v-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                            <circle cx="9" cy="15" r="5.5" stroke="currentColor" stroke-width="1.6"/>
                        @else
                            <path d="M12 8v5M12 16.5h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                            <path d="M10.2 3.2 2.5 18a1.8 1.8 0 0 0 1.6 2.6h15.8a1.8 1.8 0 0 0 1.6-2.6L13.8 3.2a1.8 1.8 0 0 0-3.6 0Z" stroke="currentColor" stroke-width="1.6"/>
                        @endif
                    </svg>
                </div>
            </div>
            <p class="scene-caption">Flota · inspecciones · campo</p>
        </div>

        <div class="card">
            @if (! empty($status))
                <p class="code">Error {{ $status }}</p>
            @endif
            <h1>{{ $title ?? 'No se pudo completar' }}</h1>
            <p class="msg">{{ $message ?? 'Intenta de nuevo más tarde.' }}</p>
            @if (! empty($hint))
                <p class="hint">{{ $hint }}</p>
            @endif
            <div class="actions">
                <a class="btn" href="{{ $back_url ?? url('/dashboard') }}">{{ $back_label ?? 'Ir al panel' }}</a>
                <a class="btn btn-outline" href="javascript:history.back()">Volver atrás</a>
            </div>
        </div>
    </div>
</body>
</html>