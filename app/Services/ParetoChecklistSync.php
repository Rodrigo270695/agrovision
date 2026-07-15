<?php

namespace App\Services;

use App\Models\ChecklistItem;
use App\Models\ChecklistTemplate;
use App\Models\Pareto;
use App\Support\ParetoCheckTypes;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ParetoChecklistSync
{
    /**
     * Valida que los pesos activos de Pareto sumen 100% para la plantilla.
     *
     * @throws RuntimeException
     */
    public function assertWeightsAreComplete(string $templateType): float
    {
        $total = $this->activeWeightTotal($templateType);

        if (abs($total - 100) >= 0.01) {
            throw new RuntimeException(
                'Los pesos Pareto de '.strtoupper($templateType).
                " deben sumar 100% (actual: {$total}%). Ajusta el catálogo Pareto antes de continuar."
            );
        }

        if ($this->activeItems($templateType)->isEmpty()) {
            throw new RuntimeException(
                'No hay ítems Pareto activos para '.strtoupper($templateType).'.'
            );
        }

        return $total;
    }

    public function activeWeightTotal(string $templateType): float
    {
        return round((float) Pareto::query()
            ->where('template_type', $templateType)
            ->where('is_active', true)
            ->sum('weight'), 2);
    }

    /**
     * Sincroniza checklist_items desde el catálogo Pareto activo.
     *
     * @return list<ChecklistItem>
     */
    public function syncTemplate(string $templateType): array
    {
        $template = ChecklistTemplate::query()
            ->where('type', $templateType)
            ->where('is_active', true)
            ->first();

        if (! $template) {
            throw new RuntimeException(
                'No existe plantilla activa de checklist para '.strtoupper($templateType).'.'
            );
        }

        $paretoItems = $this->activeItems($templateType);

        return DB::transaction(function () use ($template, $paretoItems) {
            $checklistByParetoId = ChecklistItem::query()
                ->where('template_id', $template->id)
                ->whereNotNull('pareto_id')
                ->get()
                ->keyBy('pareto_id');

            $parentChecklistIds = [];
            $synced = [];

            // Primero padres, luego hijos (mantiene parent_id correcto).
            $ordered = $paretoItems->sortBy([
                fn (Pareto $item) => $item->parent_id === null ? 0 : 1,
                fn (Pareto $item) => $item->sort_order,
                fn (Pareto $item) => $item->id,
            ])->values();

            foreach ($ordered as $pareto) {
                $parentId = null;
                if ($pareto->parent_id !== null) {
                    $parentId = $parentChecklistIds[$pareto->parent_id] ?? null;
                }

                $existing = $checklistByParetoId->get($pareto->id)
                    ?? $this->findLegacyMatch($template->id, $pareto, $parentId);

                $payload = [
                    'template_id' => $template->id,
                    'pareto_id' => $pareto->id,
                    'parent_id' => $parentId,
                    'item_number' => $pareto->item_number,
                    'label' => $pareto->label,
                    'sort_order' => $pareto->sort_order,
                    'has_expiry' => $pareto->check_type === ParetoCheckTypes::EXPIRY,
                    'check_type' => $pareto->check_type,
                    'weight' => $pareto->weight,
                ];

                if ($existing) {
                    $existing->update($payload);
                    $item = $existing->fresh();
                } else {
                    $item = ChecklistItem::query()->create($payload);
                }

                if ($pareto->parent_id === null) {
                    $parentChecklistIds[$pareto->id] = $item->id;
                }

                $synced[] = $item;
            }

            return $synced;
        });
    }

    /**
     * Sync + validación de peso. Devuelve ítems listos para crear answers.
     *
     * @return list<ChecklistItem>
     */
    public function syncForInspection(string $templateType): array
    {
        $this->assertWeightsAreComplete($templateType);

        return $this->syncTemplate($templateType);
    }

    /**
     * @return \Illuminate\Support\Collection<int, Pareto>
     */
    private function activeItems(string $templateType)
    {
        return Pareto::query()
            ->where('template_type', $templateType)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();
    }

    private function findLegacyMatch(int $templateId, Pareto $pareto, ?int $parentChecklistId): ?ChecklistItem
    {
        return ChecklistItem::query()
            ->where('template_id', $templateId)
            ->whereNull('pareto_id')
            ->where('item_number', $pareto->item_number)
            ->when(
                $pareto->parent_id === null,
                fn ($q) => $q->whereNull('parent_id'),
                fn ($q) => $q->where('parent_id', $parentChecklistId),
            )
            ->orderBy('id')
            ->first();
    }
}
