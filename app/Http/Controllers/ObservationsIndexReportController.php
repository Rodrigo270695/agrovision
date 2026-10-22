<?php

namespace App\Http\Controllers;

use App\Models\ChecklistTemplate;
use App\Support\ObservationsIndexReport;
use App\Support\ReportPeriod;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ObservationsIndexReportController extends Controller
{
    public function __construct(
        private readonly ObservationsIndexReport $report,
    ) {}

    public function __invoke(Request $request): Response
    {
        $validated = $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'all_dates' => ['nullable', 'boolean'],
            'template' => ['nullable', 'string', 'max:50', Rule::exists('checklist_templates', 'type')->where('is_active', true)],
        ]);

        $template = $validated['template'] ?? 'tdp';
        $range = ReportPeriod::range(
            $validated['date_from'] ?? null,
            $validated['date_to'] ?? null,
            $request->boolean('all_dates'),
        );

        $payload = $this->report->build($template, $range);

        return Inertia::render('reports/observations-index', [
            ...$payload,
            'range_label' => $range['label'],
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
                'date_from' => $range['from'],
                'date_to' => $range['to'],
                'template' => $template,
            ],
        ]);
    }
}
