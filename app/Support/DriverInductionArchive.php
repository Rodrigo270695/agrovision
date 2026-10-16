<?php

namespace App\Support;

use App\Models\Induction;
use App\Models\InductionAttendee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

final class DriverInductionArchive
{
    /**
     * @param  list<array{dni: string, induction_id: int}>  $items
     * @param  list<string>  $include
     */
    public function respond(array $items, array $include, bool $grouped): Response|BinaryFileResponse|JsonResponse
    {
        @set_time_limit(300);
        @ini_set('memory_limit', '1024M');

        $files = $this->files($items, $include, $grouped);

        if ($files === []) {
            return response()->json([
                'message' => 'No hay documentos para descargar con esa selección.',
            ], 422);
        }

        if (count($files) === 1) {
            $file = $files[0];

            return InductionDocumentPackage::pdfInline(
                $file['binary'],
                basename($file['path']),
                true,
            );
        }

        if (! class_exists(ZipArchive::class)) {
            abort(500, 'El servidor no puede armar el archivo comprimido.');
        }

        $path = storage_path('app/consulta-conductores-'.Str::random(8).'.zip');
        $zip = new ZipArchive;

        if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            abort(500, 'No se pudo crear el archivo.');
        }

        $used = [];

        foreach ($files as $file) {
            $name = $file['path'];
            $base = $name;
            $i = 2;

            while (isset($used[$name])) {
                $name = preg_replace('/\.pdf$/i', '_'.$i.'.pdf', $base) ?: $base.'_'.$i;
                $i++;
            }

            $used[$name] = true;
            $zip->addFromString($name, $file['binary']);
        }

        $zip->close();

        return response()
            ->download($path, 'consulta-conductores.zip')
            ->deleteFileAfterSend(true);
    }

    public function preview(string $dni, int $inductionId, string $doc): Response|JsonResponse
    {
        @set_time_limit(180);
        @ini_set('memory_limit', '1024M');

        $files = $this->files([
            ['dni' => $dni, 'induction_id' => $inductionId],
        ], [$doc], false);

        if ($files === []) {
            return response()->json([
                'message' => 'No se pudo generar ese documento.',
            ], 422);
        }

        return InductionDocumentPackage::pdfInline(
            $files[0]['binary'],
            basename($files[0]['path']),
            false,
        );
    }

    /**
     * @param  list<array{dni: string, induction_id: int}>  $items
     * @param  list<string>  $include
     * @return list<array{path: string, binary: string}>
     */
    private function files(array $items, array $include, bool $grouped): array
    {
        $include = array_values(array_intersect($include, ['acta', 'risst', 'ritran']));

        if ($include === [] || $items === []) {
            return [];
        }

        $pairs = [];

        foreach ($items as $item) {
            $dni = InductionDocumentPackage::digits($item['dni'] ?? '');
            $inductionId = (int) ($item['induction_id'] ?? 0);

            if ($dni === '' || $inductionId < 1) {
                continue;
            }

            $pairs[] = ['dni' => $dni, 'induction_id' => $inductionId];
        }

        if ($pairs === []) {
            return [];
        }

        $inductionIds = array_values(array_unique(array_column($pairs, 'induction_id')));
        $dnis = array_values(array_unique(array_column($pairs, 'dni')));
        $inductions = Induction::query()
            ->with(['attendees' => fn ($q) => $q->orderBy('driver_name'), 'period'])
            ->whereIn('id', $inductionIds)
            ->get()
            ->keyBy('id');

        $highlightByInduction = [];

        foreach ($pairs as $pair) {
            $highlightByInduction[$pair['induction_id']][$pair['dni']] = $pair['dni'];
        }

        $actas = [];
        $files = [];
        $seenReceipt = [];

        foreach ($pairs as $pair) {
            $induction = $inductions->get($pair['induction_id']);

            if (! $induction instanceof Induction) {
                continue;
            }

            $attendee = $induction->attendees->first(
                fn (InductionAttendee $row) => InductionDocumentPackage::digits($row->driver_dni) === $pair['dni'],
            );

            if ($attendee === null) {
                continue;
            }

            $folder = $this->driverFolder($attendee).'/'.$this->inductionFolder($induction);

            if (in_array('acta', $include, true) && ! isset($actas[$induction->id])) {
                $highlight = array_values($highlightByInduction[$induction->id] ?? [$pair['dni']]);
                $binary = InductionDocumentPackage::actaBinary($induction, $highlight);
                $actaName = $this->actaFilename($induction);
                $actas[$induction->id] = true;
                $files[] = [
                    'path' => $grouped
                        ? 'Actas/'.$actaName
                        : $folder.'/'.$actaName,
                    'binary' => $binary,
                ];
            }

            foreach (['risst' => 'RISST', 'ritran' => 'RITRAN'] as $kind => $label) {
                if (! in_array($kind, $include, true)) {
                    continue;
                }

                $receiptKey = $kind.'-'.$attendee->id;

                if (isset($seenReceipt[$receiptKey])) {
                    continue;
                }

                $seenReceipt[$receiptKey] = true;
                $files[] = [
                    'path' => $folder.'/'.$label.'.pdf',
                    'binary' => InductionDocumentPackage::receiptBinary($induction, $kind, [$attendee]),
                ];
            }
        }

        return $files;
    }

    private function driverFolder(InductionAttendee $attendee): string
    {
        $dni = InductionDocumentPackage::digits($attendee->driver_dni) ?: 'sin_dni';
        $name = $this->safe($attendee->driver_name) ?: 'sin_nombre';

        return $dni.'_'.$name;
    }

    private function inductionFolder(Induction $induction): string
    {
        $date = $induction->session_date
            ?? $induction->scheduled_at?->timezone(config('app.timezone'));
        $day = $date?->format('Y-m-d') ?: 'sin_fecha';
        $activity = InductionFormOptions::activities()[(string) $induction->activity] ?? 'actividad';
        $title = $this->safe($induction->title) ?: 'induccion';

        return $day.'_'.$this->safe($activity).'_'.$title;
    }

    private function actaFilename(Induction $induction): string
    {
        $acta = $induction->acta_number ?: str_pad((string) $induction->id, 6, '0', STR_PAD_LEFT);

        return 'Acta_'.$this->safe($acta).'_'.$this->safe($induction->title).'.pdf';
    }

    private function safe(?string $value): string
    {
        $value = Str::ascii((string) $value);
        $value = preg_replace('/[^A-Za-z0-9]+/', '_', $value) ?: '';

        return trim($value, '_') ?: '';
    }
}
