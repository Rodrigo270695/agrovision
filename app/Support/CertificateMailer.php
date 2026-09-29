<?php

namespace App\Support;

use App\Mail\DriverCertificateMail;
use App\Models\Certificate;
use App\Models\CertificateTemplate;
use App\Models\InductionAttendee;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

final class CertificateMailer
{
    /**
     * @param  Collection<int, InductionAttendee>  $attendees
     */
    public static function issue(CertificateTemplate $template, Collection $attendees): int
    {
        $template->loadMissing('induction');
        $induction = $template->induction;

        if (! $induction) {
            return 0;
        }

        $created = 0;
        $issuedOn = CarbonImmutable::now()->startOfDay();
        $expiresOn = $issuedOn->addMonths(max(1, (int) $template->validity_months));
        $custom = collect($template->custom_variables ?? [])
            ->mapWithKeys(fn (array $item) => [($item['key'] ?? '') => (string) ($item['value'] ?? '')])
            ->filter(fn ($value, $key) => $key !== '')
            ->all();

        DB::transaction(function () use ($attendees, $template, $induction, $issuedOn, $expiresOn, $custom, &$created): void {
            foreach ($attendees as $attendee) {
                $exists = Certificate::query()
                    ->where('certificate_template_id', $template->id)
                    ->where('induction_attendee_id', $attendee->id)
                    ->exists();

                if ($exists) {
                    continue;
                }

                $code = self::uniqueCode();
                $values = CertificateRenderer::variables(
                    $template,
                    $induction,
                    $attendee,
                    $issuedOn,
                    $expiresOn,
                    $code,
                    $custom,
                );

                Certificate::query()->create([
                    'certificate_template_id' => $template->id,
                    'induction_id' => $induction->id,
                    'induction_attendee_id' => $attendee->id,
                    'code' => $code,
                    'token' => Str::lower(Str::random(40)),
                    'participant_name' => $values['nombre'],
                    'participant_dni' => $attendee->driver_dni,
                    'course_title' => $values['curso'],
                    'session_on' => $induction->session_date ?? $induction->scheduled_at,
                    'hours' => $values['horas'],
                    'issued_on' => $issuedOn->toDateString(),
                    'expires_on' => $expiresOn->toDateString(),
                    'issuer_name' => $template->issuer_name,
                    'issuer_title' => $template->issuer_title,
                    'variables' => $values,
                ]);

                $created++;
            }
        });

        return $created;
    }

    /**
     * Emite los certificados que falten de quienes asistieron y firmaron, y los envía al correo de la unidad.
     *
     * @return array{issued: int, sent: int, skipped: int, failed: int}
     */
    public static function sendToDrivers(CertificateTemplate $template): array
    {
        $template->loadMissing('induction');
        $induction = $template->induction;
        $result = ['issued' => 0, 'sent' => 0, 'skipped' => 0, 'failed' => 0];

        if (! $induction) {
            return $result;
        }

        $attendees = $induction->attendees()
            ->with('unit:id,email')
            ->where('status', InductionAttendeeStatuses::ATTENDED)
            ->whereNotNull('signature_path')
            ->where('signature_path', '!=', '')
            ->get();

        $result['issued'] = self::issue($template, $attendees);

        $certificates = Certificate::query()
            ->where('certificate_template_id', $template->id)
            ->whereIn('induction_attendee_id', $attendees->pluck('id'))
            ->with('attendee.unit:id,email')
            ->get();

        foreach ($certificates as $certificate) {
            $email = trim((string) ($certificate->attendee?->unit?->email ?? ''));

            if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $result['skipped']++;

                continue;
            }

            try {
                $verifyUrl = route('certificates.verify', $certificate->token);
                Mail::to($email)->send(new DriverCertificateMail(
                    $certificate,
                    CertificatePdf::output($certificate),
                    $verifyUrl,
                ));
                $result['sent']++;
            } catch (\Throwable $exception) {
                report($exception);
                $result['failed']++;
            }
        }

        return $result;
    }

    public static function message(array $result): string
    {
        if ($result['sent'] === 0 && $result['issued'] === 0 && $result['skipped'] === 0 && $result['failed'] === 0) {
            return 'No hay conductores que hayan asistido y firmado.';
        }

        $parts = [];

        if ($result['issued'] > 0) {
            $parts[] = "Se emitieron {$result['issued']} certificado(s)";
        }

        if ($result['sent'] > 0) {
            $parts[] = "se enviaron {$result['sent']} correo(s)";
        }

        if ($result['skipped'] > 0) {
            $parts[] = "{$result['skipped']} conductor(es) no tienen correo en la unidad";
        }

        if ($result['failed'] > 0) {
            $parts[] = "{$result['failed']} correo(s) no se pudieron enviar";
        }

        return implode('. ', $parts).'.';
    }

    private static function uniqueCode(): string
    {
        do {
            $code = 'CODA-'.now()->year.'-'.random_int(1000, 9999);
        } while (Certificate::query()->where('code', $code)->exists());

        return $code;
    }
}
