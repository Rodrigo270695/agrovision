<?php

namespace App\Mail;

use App\Models\Induction;
use App\Models\InductionRegulation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class InductionRegulationsMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  list<array{name: string, dni: string|null, plate: string|null}>  $drivers
     * @param  Collection<int, InductionRegulation>  $regulations
     */
    public function __construct(
        public Induction $induction,
        public string $coordinatorName,
        public array $drivers,
        public Collection $regulations,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reglamentos · '.$this->induction->title,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.induction-regulations',
        );
    }

    /**
     * @return list<Attachment>
     */
    public function attachments(): array
    {
        $attachments = [];

        foreach ($this->regulations as $regulation) {
            $absolute = Storage::disk('public')->path($regulation->path);

            if (! is_file($absolute)) {
                continue;
            }

            $attachments[] = Attachment::fromPath($absolute)
                ->as($regulation->original_name)
                ->withMime('application/pdf');
        }

        return $attachments;
    }
}
