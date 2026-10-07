<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OwnerReportMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $company,
        public string $pdfBinary,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reporte consolidado · '.$this->company,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.owner-report',
        );
    }

    /**
     * @return list<Attachment>
     */
    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->pdfBinary, 'reporte-consolidado.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
