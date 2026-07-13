<?php

namespace App\Services;

use App\Models\ChecklistTemplate;
use App\Models\Driver;
use App\Models\Inspection;
use App\Models\InspectionAnswer;
use App\Models\InspectionAttempt;
use App\Models\InspectionEvidence;
use App\Models\InspectionSignature;
use App\Models\TransportCompany;
use App\Models\Vehicle;
use App\Support\MediaDataUri;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InspectionStoreService
{
    /**
     * Guarda solo la 1ra inspección.
     *
     * @param  array<string, mixed>  $data
     */
    public function storeFirst(array $data, int $userId): Inspection
    {
        $template = ChecklistTemplate::query()
            ->where('short_code', $data['template_short_code'])
            ->where('is_active', true)
            ->firstOrFail();

        $version = $template->publishedVersion();

        if ($version === null) {
            throw ValidationException::withMessages([
                'template_short_code' => 'No hay una versión publicada del checklist.',
            ]);
        }

        $version->load(['items']);

        return DB::transaction(function () use ($data, $userId, $template, $version) {
            $company = TransportCompany::query()->firstOrCreate(
                ['legal_name' => $data['company_name']],
                ['trade_name' => $data['company_name'], 'is_active' => true],
            );

            $plate = $this->normalizePlate($data['plate']);

            $driver = Driver::query()->updateOrCreate(
                ['license_number' => $data['license_number']],
                [
                    'full_name' => $data['driver_name'],
                    'license_class' => $data['license_class'] ?? null,
                    'license_revalidation_date' => $data['license_revalidation_date'] ?? null,
                    'is_active' => true,
                ],
            );

            $vehicle = Vehicle::query()->updateOrCreate(
                ['plate' => $plate],
                [
                    'brand' => $data['brand'] ?? null,
                    'model' => $data['model'] ?? null,
                    'year' => $data['year'] ?? null,
                    'unit_type' => $template->unit_type,
                    'ownership_type' => $data['ownership_type'] ?? null,
                    'transport_company_id' => $company->id,
                    'is_active' => true,
                ],
            );

            $brandModelYear = trim(implode(' / ', array_filter([
                $data['brand'] ?? null,
                $data['model'] ?? null,
                isset($data['year']) ? (string) $data['year'] : null,
            ])));

            $result = $data['attempt_result'];
            $isApproved = $result === 'aprobado';

            $inspection = Inspection::query()->create([
                'checklist_template_version_id' => $version->id,
                'vehicle_id' => $vehicle->id,
                'driver_id' => $driver->id,
                'transport_company_id' => $company->id,
                'location' => $data['location'] ?? null,
                'additional_observations' => $data['additional_observations'] ?? null,
                'vehicle_plate_snapshot' => $plate,
                'vehicle_brand_model_year_snapshot' => $brandModelYear !== '' ? $brandModelYear : null,
                'driver_name_snapshot' => $data['driver_name'],
                'driver_license_snapshot' => $data['license_number'],
                'driver_license_class_snapshot' => $data['license_class'] ?? null,
                'driver_license_revalidation_snapshot' => $data['license_revalidation_date'] ?? null,
                'company_name_snapshot' => $data['company_name'],
                'status' => $isApproved ? 'cerrada' : 'pendiente_reinspeccion',
                'is_locked' => false,
                'inspected_by' => $userId,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);

            $attempt = $this->createAttempt(
                $inspection,
                1,
                $data['attempt_date'],
                $data['attempt_time'],
                $result,
            );

            $this->storeAnswers($attempt, $version->items, $data['answers']);
            $this->storeSignatures($inspection, $data['signatures'] ?? [], $userId);
            $this->storePhotos($inspection, $data['photos'] ?? [], $userId);

            if ($isApproved) {
                $this->lockInspection($inspection, $userId);
            }

            return $inspection->fresh(['attempts.answers', 'signatures', 'evidences', 'vehicle', 'driver']);
        });
    }

    /**
     * Registra la 2da inspección sobre una existente pendiente.
     *
     * @param  array<string, mixed>  $data
     */
    public function storeSecond(Inspection $inspection, array $data, int $userId): Inspection
    {
        $inspection->load(['attempts', 'templateVersion.items']);

        if ($inspection->attempts->contains('attempt_number', 2)) {
            throw ValidationException::withMessages([
                'inspection' => 'Esta inspección ya tiene una 2da evaluación.',
            ]);
        }

        $first = $inspection->attempts->firstWhere('attempt_number', 1);

        if ($first === null || $first->result !== 'desaprobado') {
            throw ValidationException::withMessages([
                'inspection' => 'Solo se puede re-inspeccionar unidades desaprobadas en la 1ra evaluación.',
            ]);
        }

        return DB::transaction(function () use ($inspection, $data, $userId) {
            $inspection->update([
                'is_locked' => false,
                'integrity_hash' => null,
                'closed_at' => null,
                'closed_by' => null,
                'additional_observations' => $data['additional_observations']
                    ?? $inspection->additional_observations,
                'updated_by' => $userId,
            ]);

            $attempt = $this->createAttempt(
                $inspection,
                2,
                $data['attempt_date'],
                $data['attempt_time'],
                $data['attempt_result'],
            );

            $this->storeAnswers($attempt, $inspection->templateVersion->items, $data['answers']);
            $this->storeSignatures($inspection, $data['signatures'] ?? [], $userId, replace: true);
            $this->storePhotos($inspection, $data['photos'] ?? [], $userId);

            $inspection->update([
                'status' => 'cerrada',
                'updated_by' => $userId,
            ]);

            $this->lockInspection($inspection->fresh(['attempts.answers', 'signatures']), $userId);

            return $inspection->fresh(['attempts.answers', 'signatures', 'evidences', 'vehicle', 'driver']);
        });
    }

    /**
     * @param  iterable<int, \App\Models\ChecklistItem>  $items
     * @param  list<array{item_id: string, complies?: string|null, observation?: string|null, expiry_date?: string|null}>  $answers
     */
    private function storeAnswers(InspectionAttempt $attempt, iterable $items, array $answers): void
    {
        $answerableItemIds = collect($items)
            ->where('is_group', false)
            ->pluck('id')
            ->all();

        foreach ($answers as $answer) {
            if (! in_array($answer['item_id'], $answerableItemIds, true)) {
                continue;
            }

            InspectionAnswer::query()->create([
                'inspection_attempt_id' => $attempt->id,
                'checklist_item_id' => $answer['item_id'],
                'complies' => $answer['complies'] ?? null,
                'observation' => $answer['observation'] ?? null,
                'expiry_date' => $answer['expiry_date'] ?? null,
            ]);
        }
    }

    /**
     * @param  list<array{role: string, signer_name: string, signature_data?: string|null}>  $signatures
     */
    private function storeSignatures(
        Inspection $inspection,
        array $signatures,
        int $userId,
        bool $replace = false,
    ): void {
        foreach ($signatures as $signature) {
            if (blank($signature['signer_name'] ?? null) || blank($signature['signature_data'] ?? null)) {
                continue;
            }

            $stored = MediaDataUri::store(
                $signature['signature_data'],
                "inspections/{$inspection->id}/signatures",
                $signature['role'],
            );

            $payload = [
                'signer_name' => $signature['signer_name'],
                'signer_user_id' => $userId,
                'signature_path' => $stored['path'],
                'signed_at' => now(),
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ];

            if ($replace) {
                InspectionSignature::query()->updateOrCreate(
                    [
                        'inspection_id' => $inspection->id,
                        'role' => $signature['role'],
                    ],
                    $payload,
                );

                continue;
            }

            InspectionSignature::query()->create([
                'inspection_id' => $inspection->id,
                'role' => $signature['role'],
                ...$payload,
            ]);
        }
    }

    /**
     * @param  list<array{data_url: string, latitude?: float|null, longitude?: float|null, accuracy?: float|null, captured_at?: string|null, checklist_item_id?: string|null}>  $photos
     */
    private function storePhotos(Inspection $inspection, array $photos, int $userId): void
    {
        foreach ($photos as $index => $photo) {
            if (blank($photo['data_url'] ?? null)) {
                continue;
            }

            $stored = MediaDataUri::store(
                $photo['data_url'],
                "inspections/{$inspection->id}/photos",
                'evidence_'.$index,
            );

            InspectionEvidence::query()->create([
                'inspection_id' => $inspection->id,
                'checklist_item_id' => $photo['checklist_item_id'] ?? null,
                'file_path' => $stored['path'],
                'file_mime' => $stored['mime'],
                'file_size_bytes' => $stored['size'],
                'checksum_sha256' => $stored['checksum'],
                'caption' => 'Evidencia fotográfica con geolocalización',
                'latitude' => $photo['latitude'] ?? null,
                'longitude' => $photo['longitude'] ?? null,
                'accuracy' => $photo['accuracy'] ?? null,
                'captured_at' => isset($photo['captured_at'])
                    ? Carbon::parse($photo['captured_at'])
                    : now(),
                'uploaded_by' => $userId,
            ]);
        }
    }

    private function createAttempt(
        Inspection $inspection,
        int $number,
        string $date,
        string $time,
        string $result,
    ): InspectionAttempt {
        return InspectionAttempt::query()->create([
            'inspection_id' => $inspection->id,
            'attempt_number' => $number,
            'inspected_at' => Carbon::parse("{$date} {$time}"),
            'result' => $result,
        ]);
    }

    private function lockInspection(Inspection $inspection, int $userId): void
    {
        $payload = $inspection->load(['attempts.answers', 'signatures'])->toArray();
        $hash = hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR));

        $inspection->update([
            'is_locked' => true,
            'integrity_hash' => $hash,
            'closed_at' => now(),
            'closed_by' => $userId,
            'status' => 'cerrada',
        ]);
    }

    private function normalizePlate(string $plate): string
    {
        return strtoupper((string) preg_replace('/\s+/', '', $plate));
    }
}
