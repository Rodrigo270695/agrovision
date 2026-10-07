<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 0; }
        @if (! empty($embedFonts))
            {!! \App\Support\CertificateFonts::pdfFaceCss() !!}
        @endif
        html, body { margin: 0; padding: 0; }
        .sheet {
            position: relative;
            width: 297mm;
            height: 210mm;
            overflow: hidden;
            background: #fff;
        }
        .bg, .mark, .block, .sig, .logo, .qr { position: absolute; }
        .bg { left: 0; top: 0; width: 297mm; height: 210mm; }
        .mark { opacity: 0.18; }
        .block { margin: 0; padding: 0; white-space: pre-wrap; }
        .sig img, .logo img, .mark img, .qr img { width: 100%; }
    </style>
</head>
<body>
    @php
        $mm = fn ($percent) => ((float) $percent / 100) * 210;
    @endphp
    <div class="sheet">
        @if (! empty($background))
            <img class="bg" src="{{ $background }}" alt="">
        @endif

        @if (! empty($watermark))
            <div class="mark" style="left: {{ $watermarkBox['x'] }}%; top: {{ $watermarkBox['y'] }}%; width: {{ $watermarkBox['w'] }}%; height: {{ $mm($watermarkBox['h']) }}mm;">
                <img src="{{ $watermark }}" alt="">
            </div>
        @endif

        @foreach ($logos as $logo)
            <div class="logo" style="left: {{ $logo['x'] }}%; top: {{ $logo['y'] }}%; width: {{ $logo['w'] }}%; height: {{ $mm($logo['h']) }}mm;">
                <img src="{{ $logo['src'] }}" alt="">
            </div>
        @endforeach

        @foreach ($blocks as $block)
            @php
                $placement = \App\Support\CertificateFonts::pdfPlacement((string) $block['font'], (float) $block['size']);
                $top = ((float) $block['y'] / 100) * 210 - $placement['nudge_mm'];
            @endphp
            <div
                class="block"
                style="left: {{ $block['x'] }}%; top: {{ $top }}mm; width: {{ $block['w'] }}%; text-align: {{ $block['align'] }}; font-size: {{ $block['size'] }}pt; line-height: {{ $placement['line_height'] }}; font-weight: {{ $block['weight'] }}; color: {{ $block['color'] }}; font-family: {{ $block['font'] }};"
            >{{ $block['text'] }}</div>
        @endforeach

        @if (! empty($signature))
            <div class="sig" style="left: {{ $signatureBox['x'] }}%; top: {{ $signatureBox['y'] }}%; width: {{ $signatureBox['w'] }}%; height: {{ $mm($signatureBox['h']) }}mm;">
                <img src="{{ $signature }}" alt="">
            </div>
        @endif

        @if (! empty($stamp))
            <div class="sig" style="left: {{ $stampBox['x'] }}%; top: {{ $stampBox['y'] }}%; width: {{ $stampBox['w'] }}%; height: {{ $mm($stampBox['h']) }}mm;">
                <img src="{{ $stamp }}" alt="">
            </div>
        @endif

        @if (! empty($qr))
            <div class="qr" style="left: {{ $qrBox['x'] }}%; top: {{ $qrBox['y'] }}%; width: {{ $qrBox['size'] }}%; height: {{ $mm($qrBox['size']) }}mm;">
                <img src="{{ $qr }}" alt="">
            </div>
        @endif
    </div>
</body>
</html>
