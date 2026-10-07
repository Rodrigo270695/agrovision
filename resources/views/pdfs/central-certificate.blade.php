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
        .block { margin: 0; padding: 0; white-space: pre-wrap; overflow: visible; }
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
            @php
                $markW = $widthMm($watermarkBox['w']);
                $markH = $heightMm($watermarkBox['h']);
            @endphp
            <div class="mark" style="left: {{ $watermarkBox['x'] }}%; top: {{ $watermarkBox['y'] }}%; width: {{ $markW }}mm; height: {{ $markH }}mm;">
                <img src="{{ $watermark }}" alt="" style="width: {{ $markW }}mm; height: {{ $markH }}mm;">
            </div>
        @endif

        @foreach ($logos as $logo)
            @php
                $logoW = $widthMm($logo['w']);
                $logoH = $heightMm($logo['h']);
            @endphp
            <div class="logo" style="left: {{ $logo['x'] }}%; top: {{ $logo['y'] }}%; width: {{ $logoW }}mm; height: {{ $logoH }}mm;">
                <img src="{{ $logo['src'] }}" alt="" style="width: {{ $logoW }}mm; height: {{ $logoH }}mm;">
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
            >{!! preg_replace('/\*\*(.+?)\*\*/s', '<strong>$1</strong>', e($block['text'])) !!}</div>
        @endforeach

        @if (! empty($signature))
            @php
                $signW = $widthMm($signatureBox['w']);
                $signH = $heightMm($signatureBox['h']);
            @endphp
            <div class="sig" style="left: {{ $signatureBox['x'] }}%; top: {{ $signatureBox['y'] }}%; width: {{ $signW }}mm; height: {{ $signH }}mm;">
                <img src="{{ $signature }}" alt="" style="width: {{ $signW }}mm; height: {{ $signH }}mm;">
            </div>
        @endif

        @if (! empty($stamp))
            @php
                $stampW = $widthMm($stampBox['w']);
                $stampH = $heightMm($stampBox['h']);
            @endphp
            <div class="sig" style="left: {{ $stampBox['x'] }}%; top: {{ $stampBox['y'] }}%; width: {{ $stampW }}mm; height: {{ $stampH }}mm;">
                <img src="{{ $stamp }}" alt="" style="width: {{ $stampW }}mm; height: {{ $stampH }}mm;">
            </div>
        @endif

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
