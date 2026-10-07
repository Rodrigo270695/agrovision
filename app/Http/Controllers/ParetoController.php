<?php

namespace App\Http\Controllers;

use App\Http\Requests\ParetoRequest;
use App\Models\ChecklistSignatureRole;
use App\Models\ChecklistTemplate;
use App\Models\Pareto;
use App\Services\ParetoChecklistSync;
use App\Support\IndexedRedirect;
use App\Support\ParetoCheckTypes;
use App\Support\PermissionCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ParetoController extends Controller
{
    public function index(Request $request): Response
    {
        $templateOptions = ChecklistTemplate::options();
        $templateTypes = array_column($templateOptions, 'value');

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'template_type' => ['nullable', Rule::in([...$templateTypes, 'all'])],
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

        $query = Pareto::query()
            ->select('pareto.*')
            ->with('parent:id,item_number,label,sort_order')
            ->leftJoin('pareto as pareto_parents', 'pareto.parent_id', '=', 'pareto_parents.id');

        if ($templateType !== 'all') {
            $query->where('pareto.template_type', $templateType);
        }

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('pareto.label', 'ilike', "%{$search}%")
                    ->orWhere('pareto.item_number', 'ilike', "%{$search}%");
            });
        }

        $directionSql = $direction === 'desc' ? 'desc' : 'asc';
        $familySort = match ($sort) {
            'label' => 'COALESCE(pareto_parents.label, pareto.label)',
            'item_number' => 'COALESCE(pareto_parents.item_number, pareto.item_number)',
            'weight' => 'COALESCE(pareto_parents.weight, pareto.weight)',
            'created_at' => 'COALESCE(pareto_parents.created_at, pareto.created_at)',
            default => 'COALESCE(pareto_parents.sort_order, pareto.sort_order)',
        };

        $query
            ->orderByRaw($familySort.' '.$directionSql)
            ->orderByRaw('CASE WHEN pareto.parent_id IS NULL THEN 0 ELSE 1 END')
            ->orderBy('pareto.sort_order')
            ->orderBy('pareto.id');

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
            'templates' => $templateOptions,
            'parentOptions' => Pareto::query()
                ->whereNull('parent_id')
                ->orderBy('sort_order')
                ->orderBy('id')
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
            $siblingQuery = Pareto::query()->where('template_type', $data['template_type']);

            if (! empty($data['parent_id'])) {
                $siblingQuery->where('parent_id', $data['parent_id']);
            } else {
                $siblingQuery->whereNull('parent_id');
            }

            $data['sort_order'] = (int) $siblingQuery->max('sort_order') + 1;
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

    public function storeTemplate(Request $request): RedirectResponse
    {
        $name = trim((string) $request->input('name'));

        if ($name === '' || mb_strlen($name) > 80) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'El nombre de la plantilla debe tener entre 1 y 80 caracteres.',
            ]);
        }

        if ($this->templateLabelExists($name)) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Ya existe una plantilla con ese nombre.',
            ]);
        }

        $type = $this->uniqueTemplateType($name);
        $template = ChecklistTemplate::query()->create([
            'type' => $type,
            'code' => $this->uniqueTemplateCode(),
            'name' => $name,
            'label' => $name,
            'version' => '1',
            'is_active' => true,
        ]);

        $roles = ChecklistSignatureRole::query()
            ->whereHas('template', fn ($query) => $query->where('type', 'tdp'))
            ->orderBy('sort_order')
            ->pluck('label');

        if ($roles->isEmpty()) {
            $roles = collect([
                'Conductor de la unidad',
                'Mecánico de mantenimiento',
                'Jefe del área de transporte',
                'V°B° SST',
            ]);
        }

        foreach ($roles->values() as $index => $label) {
            ChecklistSignatureRole::query()->create([
                'template_id' => $template->id,
                'label' => $label,
                'sort_order' => $index + 1,
            ]);
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => "Plantilla {$name} creada. Ya puedes agregarle ítems.",
        ]);
    }

    public function updateTemplate(Request $request, ChecklistTemplate $template): RedirectResponse
    {
        $name = trim((string) $request->input('name'));

        if ($name === '' || mb_strlen($name) > 80) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'El nombre de la plantilla debe tener entre 1 y 80 caracteres.',
            ]);
        }

        if ($this->templateLabelExists($name, $template->id)) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Ya existe una plantilla con ese nombre.',
            ]);
        }

        $previous = $template->displayLabel();
        $attributes = ['label' => $name];

        if (trim((string) $template->name) === $previous) {
            $attributes['name'] = $name;
        }

        $template->update($attributes);

        return back()->with('toast', [
            'type' => 'success',
            'message' => "La plantilla ahora se llama {$name}.",
        ]);
    }

    public function redistribute(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'template_type' => [
                'required',
                'string',
                'max:50',
                Rule::exists('checklist_templates', 'type')->where('is_active', true),
            ],
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

    private function templateLabelExists(string $name, ?int $ignoreId = null): bool
    {
        return ChecklistTemplate::query()
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->whereRaw('lower(label) = ?', [mb_strtolower($name)])
            ->exists();
    }

    private function uniqueTemplateType(string $name): string
    {
        $base = Str::slug($name, '_');
        $base = substr($base, 0, 40);
        $base = $base !== '' ? $base : 'plantilla';
        $type = $base;
        $suffix = 2;

        while (ChecklistTemplate::query()->where('type', $type)->exists()) {
            $type = substr($base, 0, 36).'_'.$suffix;
            $suffix++;
        }

        return $type;
    }

    private function uniqueTemplateCode(): string
    {
        $max = ChecklistTemplate::query()
            ->pluck('code')
            ->map(function (string $code): int {
                preg_match('/(\d+)$/', $code, $matches);

                return isset($matches[1]) ? (int) $matches[1] : 0;
            })
            ->max();

        $next = ((int) $max) + 1;

        do {
            $code = 'PE-F-SST-'.str_pad((string) $next, 3, '0', STR_PAD_LEFT);
            $next++;
        } while (ChecklistTemplate::query()->where('code', $code)->exists());

        return $code;
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
