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
            'week' => ['nullable', 'integer', 'min:1', 'max:53'],
            'week_year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
            'template' => ['nullable', 'string', 'max:50', Rule::exists('checklist_templates', 'type')->where('is_active', true)],
        ]);

        $template = $validated['template'] ?? 'tdp';
        $range = ReportPeriod::range(
            $validated['date_from'] ?? null,
            $validated['date_to'] ?? null,
            $request->boolean('all_dates'),
        );

        $week = isset($validated['week']) ? (int) $validated['week'] : null;
        $weekYear = isset($validated['week_year']) ? (int) $validated['week_year'] : null;

        $payload = $this->report->build($template, $range, $week, $weekYear);

        return Inertia::render('reports/observations-index', [
            ...$payload,
            'range_label' => $range['label'],
            'templates' => ChecklistTemplate::query()
                ->where('is_active', true)
                ->orderBy('type')
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
                'week' => $week,
                'week_year' => $weekYear,
                'template' => $template,
            ],
        ]);
    }
}
