<?php

namespace App\Http\Controllers;

use App\Models\ChecklistTemplate;
use App\Support\ProviderComplianceReport;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProviderComplianceReportController extends Controller
{
    public function __construct(
        private readonly ProviderComplianceReport $report,
    ) {}

    public function __invoke(Request $request): Response
    {
        $validated = $request->validate([
            'year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
            'week' => ['nullable', 'integer', 'min:1', 'max:53'],
            'template' => ['nullable', 'string', 'max:50', Rule::exists('checklist_templates', 'type')->where('is_active', true)],
        ]);

        $year = (int) ($validated['year'] ?? CarbonImmutable::now()->isoWeekYear());
        $week = (int) ($validated['week'] ?? CarbonImmutable::now()->isoWeek());
        $template = $validated['template'] ?? 'tdp';

        $payload = $this->report->build($year, $week, $template);

        return Inertia::render('reports/provider-compliance', [
            ...$payload,
            'templates' => ChecklistTemplate::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get(['type', 'name'])
                ->map(fn ($row) => [
                    'value' => $row->type,
                    'label' => $row->displayLabel(),
                ])
                ->values()
                ->all(),
            'filters' => [
                'year' => $payload['year'],
                'week' => $payload['week'],
                'template' => $template,
            ],
        ]);
    }
}
