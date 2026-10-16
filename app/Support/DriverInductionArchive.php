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
     * @param  list<array{induction_id: int, include: list<string>, dnis: list<string>}>  $groups
     */
    public function respond(array $groups): Response|BinaryFileResponse|JsonResponse
    {
        @set_time_limit(300);
        @ini_set('memory_limit', '1024M');

        InductionDocumentPackage::resetCaches();
        $files = $this->filesFromGroups($groups);
        InductionDocumentPackage::resetCaches();

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

            if (defined('ZipArchive::CM_STORE')) {
                $zip->setCompressionName($name, ZipArchive::CM_STORE);
            }
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

        $files = $this->filesFromGroups([
            [
                'induction_id' => $inductionId,
                'include' => [$doc],
                'dnis' => [$dni],
            ],
        ]);

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
     * @param  list<array{induction_id: int, include: list<string>, dnis: list<string>}>  $groups
     * @return list<array{path: string, binary: string}>
     */
    private function filesFromGroups(array $groups): array
    {
        $inductionIds = [];

        foreach ($groups as $group) {
            $id = (int) ($group['induction_id'] ?? 0);

            if ($id > 0) {
                $inductionIds[] = $id;
            }
        }

        $inductionIds = array_values(array_unique($inductionIds));

        if ($inductionIds === []) {
            return [];
        }

        $inductions = Induction::query()
            ->with(['attendees' => fn ($q) => $q->orderBy('driver_name'), 'period'])
            ->whereIn('id', $inductionIds)
            ->get()
            ->keyBy('id');

        $files = [];

        foreach ($groups as $group) {
            $induction = $inductions->get((int) ($group['induction_id'] ?? 0));
            $include = array_values(array_intersect($group['include'] ?? [], ['acta', 'risst', 'ritran']));
            $dnis = collect($group['dnis'] ?? [])
                ->map(fn ($dni) => InductionDocumentPackage::digits((string) $dni))
                ->filter()
                ->unique()
                ->values()
                ->all();

            if (! $induction instanceof Induction || $include === [] || $dnis === []) {
                continue;
            }

            $attendees = $induction->attendees
                ->filter(fn (InductionAttendee $row) => in_array(
                    InductionDocumentPackage::digits($row->driver_dni),
                    $dnis,
                    true,
                ))
                ->values();

            if ($attendees->isEmpty()) {
                continue;
            }

            $sessionFolder = $this->inductionFolder($induction);
            $actaBinary = in_array('acta', $include, true)
                ? InductionDocumentPackage::actaBinary($induction, $dnis)
                : null;

            foreach ($attendees as $attendee) {
                $parts = [];

                if (is_string($actaBinary)) {
                    $parts[] = $actaBinary;
                }

                foreach (['risst', 'ritran'] as $kind) {
                    if (! in_array($kind, $include, true)) {
                        continue;
                    }

                    $parts[] = InductionDocumentPackage::receiptBinary($induction, $kind, [$attendee]);
                }

                if ($parts === []) {
                    continue;
                }

                $files[] = [
                    'path' => $this->driverFolder($attendee).'/'.$sessionFolder.'/'.$this->documentFilename($include, $induction),
                    'binary' => count($parts) === 1
                        ? $parts[0]
                        : InductionDocumentPackage::mergePdfs($parts),
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

    /**
     * @param  list<string>  $include
     */
    private function documentFilename(array $include, Induction $induction): string
    {
        $acta = $induction->acta_number ?: str_pad((string) $induction->id, 6, '0', STR_PAD_LEFT);
        $bits = [];

        foreach (['acta' => 'Acta', 'risst' => 'RISST', 'ritran' => 'RITRAN'] as $key => $label) {
            if (in_array($key, $include, true)) {
                $bits[] = $label;
            }
        }

        $name = $bits === [] ? 'Documentos' : implode('_', $bits);

        return $name.'_'.$this->safe($acta).'.pdf';
    }

    private function safe(?string $value): string
    {
        $value = Str::ascii((string) $value);
        $value = preg_replace('/[^A-Za-z0-9]+/', '_', $value) ?: '';

        return trim($value, '_') ?: '';
    }
}
