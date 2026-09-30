<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 0; }
        {!! \App\Support\CertificateFonts::pdfFaceCss() !!}
        html, body { margin: 0; padding: 0; }
        .sheet {
            position: relative;
            width: 297mm;
            height: 210mm;
            overflow: hidden;
            background: #fff;
        }
        .bg {
            position: absolute;
            left: 0;
            top: 0;
            width: 297mm;
            height: 210mm;
        }
        .block {
            position: absolute;
            margin: 0;
            line-height: 1.25;
            white-space: pre-wrap;
        }
        .sig, .logo {
            position: absolute;
        }
        .sig img,
        .logo img {
            width: 100%;
        }
        .qr {
            position: absolute;
        }
        .qr img {
            width: 100%;
            height: 100%;
        }
    </style>
</head>
<body>
    @php
        $signatureBox = $signatureBox ?? ['x' => 38, 'y' => 72, 'w' => 24, 'h' => 12];
        $logoBox = $logoBox ?? ['x' => 4, 'y' => 4, 'w' => 16, 'h' => 12];
        $qrBox = $qrBox ?? ['x' => 84, 'y' => 74, 'size' => 12];
        $signatureHeight = ((float) ($signatureBox['h'] ?? 12)) * 2.1;
        $logoHeight = ((float) ($logoBox['h'] ?? 12)) * 2.1;
    @endphp
    <div class="sheet">
        @if (! empty($background))
            <img class="bg" src="{{ $background }}" alt="">
        @endif

        @foreach ($blocks as $block)
            <div
                class="block"
                style="left: {{ $block['x'] }}%; top: {{ $block['y'] }}%; width: {{ $block['w'] }}%; text-align: {{ $block['align'] }}; font-size: {{ $block['size'] }}pt; font-weight: {{ $block['weight'] }}; color: {{ $block['color'] }}; font-family: {{ $block['font'] }};"
            >{{ $block['text'] }}</div>
        @endforeach

        @if (! empty($logo))
            <div class="logo" style="left: {{ $logoBox['x'] ?? 4 }}%; top: {{ $logoBox['y'] ?? 4 }}%; width: {{ $logoBox['w'] ?? 16 }}%; height: {{ $logoHeight }}mm;">
                <img src="{{ $logo }}" alt="Logo" style="height: {{ $logoHeight }}mm;">
            </div>
        @endif

        @if (! empty($signature))
            <div class="sig" style="left: {{ $signatureBox['x'] ?? 38 }}%; top: {{ $signatureBox['y'] ?? 72 }}%; width: {{ $signatureBox['w'] ?? 24 }}%; height: {{ $signatureHeight }}mm;">
                <img src="{{ $signature }}" alt="Firma" style="height: {{ $signatureHeight }}mm;">
            </div>
        @endif

        @if (! empty($qr))
            <div class="qr" style="left: {{ $qrBox['x'] ?? 84 }}%; top: {{ $qrBox['y'] ?? 74 }}%; width: {{ $qrBox['size'] ?? 12 }}%; height: {{ ((float) ($qrBox['size'] ?? 12)) * 2.97 }}mm;">
                <img src="{{ $qr }}" alt="QR">
            </div>
        @endif
    </div>
</body>
</html>
