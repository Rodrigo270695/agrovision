<?php

namespace App\Http\Controllers;

use App\Support\PlateReportBuilder;
use App\Support\PlateReportExporter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PlateReportController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('plate-report/index', [
            'plates' => '',
            'rows' => [],
            'summary' => null,
            'truncated' => false,
            'plateCount' => 0,
        ]);
    }

    public function search(Request $request, PlateReportBuilder $builder): Response
    {
        $plates = $this->plates($request);
        $report = $builder->build($plates);

        return Inertia::render('plate-report/index', [
            'plates' => $plates,
            'rows' => $report['rows'],
            'summary' => $report['summary'],
            'truncated' => $report['truncated'],
            'plateCount' => $report['plate_count'],
        ]);
    }

    public function excel(Request $request, PlateReportBuilder $builder, PlateReportExporter $exporter): StreamedResponse
    {
        $report = $builder->build($this->plates($request));

        return $exporter->download($report['rows']);
    }

    private function plates(Request $request): string
    {
        $validated = $request->validate([
            'plates' => ['required', 'string', 'max:30000'],
        ], [
            'plates.required' => 'Pega al menos una placa.',
        ]);

        return $validated['plates'];
    }
}
