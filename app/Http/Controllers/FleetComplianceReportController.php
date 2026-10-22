<?php

namespace App\Http\Controllers;

use App\Support\FleetComplianceDetailReport;
use App\Support\ReportPeriod;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class FleetComplianceReportController extends Controller
{
    public function __construct(
        private readonly FleetComplianceDetailReport $report,
    ) {}

    public function __invoke(Request $request): Response
    {
        $validated = $request->validate([
            'tab' => ['nullable', Rule::in(['rc', 'gps'])],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'all_dates' => ['nullable', 'boolean'],
        ]);

        $tab = $validated['tab'] ?? 'rc';
        $range = ReportPeriod::range(
            $validated['date_from'] ?? null,
            $validated['date_to'] ?? null,
            $request->boolean('all_dates'),
        );

        $payload = $this->report->build($tab, $range);

        return Inertia::render('fleet-compliance/index', [
            ...$payload,
            'filters' => [
                'tab' => $tab,
                'date_from' => $range['from'],
                'date_to' => $range['to'],
            ],
            'range_label' => $range['label'],
        ]);
    }
}
