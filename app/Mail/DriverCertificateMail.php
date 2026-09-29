<?php

namespace App\Mail;

use App\Models\Certificate;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DriverCertificateMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Certificate $certificate,
        public string $pdfBinary,
        public string $verifyUrl,
    ) {}

    public function envelope(): Envelope
    {
        $course = $this->certificate->course_title ?: 'inducción';

        return new Envelope(
            subject: 'Certificado · '.$course,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.driver-certificate',
        );
    }

    /**
     * @return list<Attachment>
     */
    public function attachments(): array
    {
        $code = $this->certificate->code ?: 'certificado';

        return [
            Attachment::fromData(fn () => $this->pdfBinary, 'certificado-'.$code.'.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
