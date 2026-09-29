<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 0; }
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
        .sig {
            position: absolute;
        }
        .sig img {
            width: 100%;
            height: 18mm;
            object-fit: contain;
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

        @if ($signature)
            <div class="sig" style="left: {{ $signatureBox['x'] }}%; top: {{ $signatureBox['y'] }}%; width: {{ $signatureBox['w'] }}%;">
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
