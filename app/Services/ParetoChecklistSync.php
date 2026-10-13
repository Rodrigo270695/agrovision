<?php

namespace App\Services;

use App\Models\ChecklistItem;
use App\Models\ChecklistTemplate;
use App\Models\Pareto;
use App\Support\ParetoCheckTypes;
use Illuminate\Support\Collection;
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

            $byCatalogOrder = fn (Pareto $item) => sprintf('%010d-%010d', (int) $item->sort_order, (int) $item->id);
            $parents = $paretoItems
                ->filter(fn (Pareto $item) => $item->parent_id === null)
                ->sortBy($byCatalogOrder)
                ->values();
            $children = $paretoItems
                ->filter(fn (Pareto $item) => $item->parent_id !== null)
                ->sortBy($byCatalogOrder)
                ->values();

            $parentChecklistIds = [];
            $syncedByPareto = [];

            foreach ($parents->concat($children) as $pareto) {
                $parentId = $pareto->parent_id !== null
                    ? ($parentChecklistIds[$pareto->parent_id] ?? null)
                    : null;

                $existing = $checklistByParetoId->get($pareto->id)
                    ?? $this->findLegacyMatch($template->id, $pareto, $parentId);

                $payload = [
                    'template_id' => $template->id,
                    'pareto_id' => $pareto->id,
                    'item_number' => $pareto->item_number,
                    'label' => $pareto->label,
                    'sort_order' => $pareto->sort_order,
                    'has_expiry' => $pareto->check_type === ParetoCheckTypes::EXPIRY,
                    'check_type' => $pareto->check_type,
                    'weight' => $pareto->weight,
                    'allows_photo' => (bool) $pareto->allows_photo,
                ];

                if ($pareto->parent_id === null || $parentId !== null) {
                    $payload['parent_id'] = $parentId;
                }

                if ($existing) {
                    $existing->update($payload);
                    $item = $existing->fresh();
                } else {
                    $item = ChecklistItem::query()->create($payload);
                }

                if ($pareto->parent_id === null) {
                    $parentChecklistIds[$pareto->id] = $item->id;
                }

                $syncedByPareto[$pareto->id] = $item;
            }

            foreach ($children as $pareto) {
                $item = $syncedByPareto[$pareto->id] ?? null;
                $parentId = $parentChecklistIds[$pareto->parent_id] ?? null;

                if (! $item || $parentId === null || (int) $item->parent_id === (int) $parentId) {
                    continue;
                }

                $item->update(['parent_id' => $parentId]);
                $syncedByPareto[$pareto->id] = $item->fresh();
            }

            return array_values($syncedByPareto);
        });
    }

    /**
     * El catálogo Pareto manda el padre (Botiquín → a, b, c).
     * Las inspecciones ya creadas siguen apuntando al ítem suelto si el padre se asignó después.
     *
     * @param  Collection<int, ChecklistItem|null>  $items
     */
    public function nestInspectionItems(Collection $items, ?string $templateType = null): void
    {
        /** @var Collection<int, ChecklistItem> $items */
        $items = $items
            ->filter(fn ($item) => $item instanceof ChecklistItem)
            ->unique('id')
            ->values();

        if ($items->isEmpty()) {
            return;
        }

        $templateId = (int) $items->first()->template_id;

        if ($templateType === null || $templateType === '') {
            $templateType = ChecklistTemplate::query()->whereKey($templateId)->value('type');
        }

        if (! is_string($templateType) || $templateType === '') {
            return;
        }

        $paretos = Pareto::query()->where('template_type', $templateType)->get();

        if ($paretos->isEmpty()) {
            return;
        }

        $paretoById = $paretos->keyBy('id');
        $paretoByKey = [];

        foreach ($paretos as $pareto) {
            $paretoByKey[$this->identityKey($pareto->item_number, $pareto->label)][] = $pareto;
        }

        $templateItems = ChecklistItem::query()
            ->where('template_id', $templateId)
            ->get();
        $byParetoId = $templateItems
            ->filter(fn (ChecklistItem $item) => $item->pareto_id !== null)
            ->keyBy('pareto_id');
        $presentIds = $items->pluck('id')->map(fn ($id) => (int) $id)->all();
        $present = array_fill_keys($presentIds, true);

        foreach ($items as $item) {
            $pareto = $this->matchPareto($item, $paretoById, $paretoByKey);

            if (! $pareto || $pareto->parent_id === null) {
                continue;
            }

            $parentPareto = $paretoById->get($pareto->parent_id);

            if (! $parentPareto) {
                continue;
            }

            $canonical = $byParetoId->get($parentPareto->id);
            $displayParent = ($canonical && isset($present[(int) $canonical->id]))
                ? $canonical
                : $this->findPresentParent($items, $parentPareto);

            $storedParent = $canonical ?? $displayParent;

            if ($storedParent && (int) $item->parent_id !== (int) $storedParent->id) {
                $item->parent_id = $storedParent->id;
                $item->save();
            }

            if ($displayParent && (int) $item->parent_id !== (int) $displayParent->id) {
                $item->parent_id = $displayParent->id;
                $item->syncOriginalAttribute('parent_id');
            }
        }
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

    /**
     * @param  Collection<int, Pareto>  $paretoById
     * @param  array<string, list<Pareto>>  $paretoByKey
     */
    private function matchPareto(ChecklistItem $item, Collection $paretoById, array $paretoByKey): ?Pareto
    {
        if ($item->pareto_id !== null && $paretoById->has($item->pareto_id)) {
            return $paretoById->get($item->pareto_id);
        }

        $matches = $paretoByKey[$this->identityKey($item->item_number, $item->label)] ?? [];

        return count($matches) === 1 ? $matches[0] : null;
    }

    /**
     * @param  Collection<int, ChecklistItem>  $items
     */
    private function findPresentParent(Collection $items, Pareto $parentPareto): ?ChecklistItem
    {
        $key = $this->identityKey($parentPareto->item_number, $parentPareto->label);

        return $items->first(function (ChecklistItem $item) use ($parentPareto, $key) {
            if ($item->pareto_id !== null && (int) $item->pareto_id === (int) $parentPareto->id) {
                return true;
            }

            return $this->identityKey($item->item_number, $item->label) === $key;
        });
    }

    private function identityKey(?string $number, ?string $label): string
    {
        $number = mb_strtolower(trim((string) $number));
        $label = mb_strtolower(trim((string) $label));
        $label = preg_replace('/[^\p{L}\p{N}]+/u', '', $label) ?? '';

        return $number.'|'.$label;
    }
}
