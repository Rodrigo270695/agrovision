<?php

namespace App\Http\Controllers;

use App\Http\Requests\ParetoRequest;
use App\Models\Pareto;
use App\Services\ParetoChecklistSync;
use App\Support\IndexedRedirect;
use App\Support\ParetoCheckTypes;
use App\Support\PermissionCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ParetoController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'template_type' => ['nullable', Rule::in(['tdp', 'tdc', 'all'])],
            'sort' => ['nullable', Rule::in(['sort_order', 'item_number', 'label', 'weight', 'created_at'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', Rule::in([10, 25, 50, 100])],
        ]);

        PermissionCatalog::syncToDatabase();

        $search = trim((string) ($validated['search'] ?? ''));
        $templateType = $validated['template_type'] ?? 'tdp';
        $sort = $validated['sort'] ?? 'sort_order';
        $direction = $validated['direction'] ?? 'asc';
        $perPage = (int) ($validated['per_page'] ?? 50);

        $query = Pareto::query()->with('parent:id,item_number,label');

        if ($templateType !== 'all') {
            $query->where('template_type', $templateType);
        }

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('label', 'ilike', "%{$search}%")
                    ->orWhere('item_number', 'ilike', "%{$search}%");
            });
        }

        $query->orderBy($sort, $direction)->orderBy('id');

        $items = $query->paginate($perPage)->withQueryString();

        $weightScope = Pareto::query()->where('is_active', true);
        if ($templateType !== 'all') {
            $weightScope->where('template_type', $templateType);
        }

        $weightTotal = (float) (clone $weightScope)->sum('weight');

        return Inertia::render('pareto/index', [
            'items' => $items,
            'filters' => [
                'search' => $search,
                'template_type' => $templateType,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
            'checkTypeOptions' => collect(ParetoCheckTypes::labels())
                ->map(fn (string $label, string $value) => compact('value', 'label'))
                ->values()
                ->all(),
            'parentOptions' => Pareto::query()
                ->when($templateType !== 'all', fn ($q) => $q->where('template_type', $templateType))
                ->whereNull('parent_id')
                ->orderBy('sort_order')
                ->get(['id', 'item_number', 'label', 'template_type']),
            'stats' => [
                'total' => (clone $weightScope)->count(),
                'weight_total' => round($weightTotal, 2),
                'weight_ok' => abs($weightTotal - 100) < 0.01,
                'observation' => (clone $weightScope)->where('check_type', ParetoCheckTypes::OBSERVATION)->count(),
                'expiry' => (clone $weightScope)->where('check_type', ParetoCheckTypes::EXPIRY)->count(),
            ],
        ]);
    }

    public function store(ParetoRequest $request): RedirectResponse
    {
        $data = $request->validated();
        if (! isset($data['sort_order']) || $data['sort_order'] === null) {
            $data['sort_order'] = (int) Pareto::query()
                ->where('template_type', $data['template_type'])
                ->max('sort_order') + 1;
        }

        Pareto::query()->create($data);
        $this->syncChecklist($data['template_type']);

        return IndexedRedirect::toIndex($request, 'pareto.index', [
            'type' => 'success',
            'message' => 'Ítem Pareto creado. Revisa que los pesos sumen 100%.',
        ]);
    }

    public function update(ParetoRequest $request, Pareto $pareto): RedirectResponse
    {
        $data = $request->validated();
        $pareto->update($data);
        $this->syncChecklist($data['template_type'] ?? $pareto->template_type);

        return IndexedRedirect::toIndex($request, 'pareto.index', [
            'type' => 'success',
            'message' => 'Ítem Pareto actualizado.',
        ]);
    }

    public function destroy(Request $request, Pareto $pareto): RedirectResponse
    {
        if ($pareto->children()->exists()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No se puede eliminar un ítem con subítems. Elimina primero los hijos.',
            ]);
        }

        $templateType = $pareto->template_type;
        $pareto->delete();
        $this->syncChecklist($templateType);

        return IndexedRedirect::toIndex($request, 'pareto.index', [
            'type' => 'success',
            'message' => 'Ítem Pareto eliminado.',
        ]);
    }

    public function redistribute(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'template_type' => ['required', Rule::in(['tdp', 'tdc'])],
        ]);

        $items = Pareto::query()
            ->where('template_type', $validated['template_type'])
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $count = $items->count();

        if ($count === 0) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No hay ítems activos para redistribuir.',
            ]);
        }

        $base = round(100 / $count, 2);
        $assigned = 0.0;

        foreach ($items as $index => $item) {
            $isLast = $index === $count - 1;
            $weight = $isLast ? round(100 - $assigned, 2) : $base;

            if (! $isLast) {
                $assigned += $base;
            }

            $item->update(['weight' => $weight]);
        }

        $this->syncChecklist($validated['template_type']);

        return back()->with('toast', [
            'type' => 'success',
            'message' => "Pesos redistribuidos equitativamente ({$count} ítems = 100%).",
        ]);
    }

    private function syncChecklist(string $templateType): void
    {
        try {
            app(ParetoChecklistSync::class)->syncTemplate($templateType);
        } catch (\Throwable) {
            // La plantilla puede no existir aún; el sync estricto ocurre al crear inspecciones.
        }
    }
}
