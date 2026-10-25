@php
    $pdfLogoHeight = $pdfLogoHeight ?? \App\Support\PdfLogo::HEIGHT_PX;
    $pdfLogoMaxWidth = $pdfLogoMaxWidth ?? \App\Support\PdfLogo::MAX_WIDTH_PX;
@endphp
.logo { height: {{ $pdfLogoHeight }}px; max-width: {{ $pdfLogoMaxWidth }}px; width: auto; }
