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
        .bg, .mark, .block, .sig, .logo, .qr { position: absolute; overflow: hidden; }
        .bg { left: 0; top: 0; width: 297mm; height: 210mm; overflow: hidden; }
        .mark { opacity: 0.18; }
        .block { margin: 0; padding: 0; white-space: pre-wrap; overflow: visible; line-height: 1.2; }
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
            <img class="mark" src="{{ $watermark['src'] }}" alt="" style="left: {{ $watermark['left'] }}mm; top: {{ $watermark['top'] }}mm; width: {{ $watermark['width'] }}mm; height: {{ $watermark['height'] }}mm;">
        @endif

        @foreach ($logos as $logo)
            <img class="logo" src="{{ $logo['src'] }}" alt="" style="left: {{ $logo['left'] }}mm; top: {{ $logo['top'] }}mm; width: {{ $logo['width'] }}mm; height: {{ $logo['height'] }}mm;">
        @endforeach

        @if (! empty($signature))
            <img class="sig" src="{{ $signature['src'] }}" alt="" style="left: {{ $signature['left'] }}mm; top: {{ $signature['top'] }}mm; width: {{ $signature['width'] }}mm; height: {{ $signature['height'] }}mm;">
        @endif

        @if (! empty($stamp))
            <img class="sig" src="{{ $stamp['src'] }}" alt="" style="left: {{ $stamp['left'] }}mm; top: {{ $stamp['top'] }}mm; width: {{ $stamp['width'] }}mm; height: {{ $stamp['height'] }}mm;">
        @endif

        @foreach ($blocks as $block)
            <div
                class="block"
                style="left: {{ $block['x'] }}%; top: {{ ((float) $block['y'] / 100) * 210 }}mm; width: {{ $block['w'] }}%; text-align: {{ $block['align'] }}; font-size: {{ $block['size'] }}pt; line-height: 1.2; font-weight: {{ $block['weight'] }}; color: {{ $block['color'] }}; font-family: {{ $block['font'] }};"
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
