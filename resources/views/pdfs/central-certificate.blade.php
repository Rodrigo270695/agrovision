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
        .sig, .logo, .mark, .qr { overflow: hidden; }
        .sig img, .logo img, .mark img, .qr img { display: block; }
    </style>
</head>
<body>
    @php
        $widthMm = fn ($percent) => round(((float) $percent / 100) * 297, 2);
        $heightMm = fn ($percent) => round(((float) $percent / 100) * 210, 2);
    @endphp
    <div class="sheet">
        @if (! empty($background))
            <img class="bg" src="{{ $background }}" alt="">
        @endif

        @if (! empty($watermark))
            <div class="mark" style="left: {{ $watermark['left'] }}mm; top: {{ $watermark['top'] }}mm; width: {{ $watermark['width'] }}mm; height: {{ $watermark['height'] }}mm;">
                <img src="{{ $watermark['src'] }}" alt="" style="width: {{ $watermark['width'] }}mm; height: {{ $watermark['height'] }}mm;">
            </div>
        @endif

        @foreach ($logos as $logo)
            <div class="logo" style="left: {{ $logo['left'] }}mm; top: {{ $logo['top'] }}mm; width: {{ $logo['width'] }}mm; height: {{ $logo['height'] }}mm;">
                <img src="{{ $logo['src'] }}" alt="" style="width: {{ $logo['width'] }}mm; height: {{ $logo['height'] }}mm;">
            </div>
        @endforeach

        @if (! empty($signature))
            <div class="sig" style="left: {{ $signature['left'] }}mm; top: {{ $signature['top'] }}mm; width: {{ $signature['width'] }}mm; height: {{ $signature['height'] }}mm;">
                <img src="{{ $signature['src'] }}" alt="" style="width: {{ $signature['width'] }}mm; height: {{ $signature['height'] }}mm;">
            </div>
        @endif

        @if (! empty($stamp))
            <div class="sig" style="left: {{ $stamp['left'] }}mm; top: {{ $stamp['top'] }}mm; width: {{ $stamp['width'] }}mm; height: {{ $stamp['height'] }}mm;">
                <img src="{{ $stamp['src'] }}" alt="" style="width: {{ $stamp['width'] }}mm; height: {{ $stamp['height'] }}mm;">
            </div>
        @endif

        @foreach ($blocks as $block)
            @php
                $placement = \App\Support\CertificateFonts::pdfPlacement((string) $block['font'], (float) $block['size']);
                $top = ((float) $block['y'] / 100) * 210 - $placement['nudge_mm'];
            @endphp
            <div
                class="block"
                style="left: {{ $block['x'] }}%; top: {{ $top }}mm; width: {{ $block['w'] }}%; text-align: {{ $block['align'] }}; font-size: {{ $block['size'] }}pt; line-height: {{ $placement['line_height'] }}; font-weight: {{ $block['weight'] }}; color: {{ $block['color'] }}; font-family: {{ $block['font'] }};"
            >{!! preg_replace('/\*\*(.+?)\*\*/s', '<strong>$1</strong>', e($block['text'])) !!}</div>
        @endforeach

        @if (! empty($qr))
            @php
                $qrMm = $widthMm($qrBox['size']);
            @endphp
            <div class="qr" style="left: {{ $qrBox['x'] }}%; top: {{ $qrBox['y'] }}%; width: {{ $qrMm }}mm; height: {{ $qrMm }}mm;">
                <img src="{{ $qr }}" alt="" style="width: {{ $qrMm }}mm; height: {{ $qrMm }}mm;">
            </div>
        @endif
    </div>
</body>
</html>
