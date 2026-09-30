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
            height: 100%;
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
    <div class="sheet">
        @if ($background)
            <img class="bg" src="{{ $background }}" alt="">
        @endif

        @foreach ($blocks as $block)
            <div
                class="block"
                style="left: {{ $block['x'] }}%; top: {{ $block['y'] }}%; width: {{ $block['w'] }}%; text-align: {{ $block['align'] }}; font-size: {{ $block['size'] }}pt; font-weight: {{ $block['weight'] }}; color: {{ $block['color'] }}; font-family: {{ $block['font'] }};"
            >{{ $block['text'] }}</div>
        @endforeach

        @if ($logo)
            <div class="logo" style="left: {{ $logoBox['x'] }}%; top: {{ $logoBox['y'] }}%; width: {{ $logoBox['w'] }}%; height: {{ $logoBox['h'] * 2.1 }}mm;">
                <img src="{{ $logo }}" alt="Logo">
            </div>
        @endif

        @if ($signature)
            <div class="sig" style="left: {{ $signatureBox['x'] }}%; top: {{ $signatureBox['y'] }}%; width: {{ $signatureBox['w'] }}%; height: {{ $signatureBox['h'] * 2.1 }}mm;">
                <img src="{{ $signature }}" alt="Firma">
            </div>
        @endif

        @if ($qr)
            <div class="qr" style="left: {{ $qrBox['x'] }}%; top: {{ $qrBox['y'] }}%; width: {{ $qrBox['size'] }}%; height: {{ $qrBox['size'] * 1.414 }}%;">
                <img src="{{ $qr }}" alt="QR">
            </div>
        @endif
    </div>
</body>
</html>
