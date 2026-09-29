<?php

namespace App\Support;

use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;

final class CertificateQr
{
    public static function dataUri(string $url): string
    {
        $options = new QROptions([
            'outputType' => QRCode::OUTPUT_IMAGE_PNG,
            'scale' => 8,
            'outputBase64' => true,
        ]);

        $rendered = (new QRCode($options))->render($url);

        return is_string($rendered) ? $rendered : '';
    }
}
