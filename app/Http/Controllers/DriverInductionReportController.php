<?php

namespace App\Http\Controllers;

use App\Models\Induction;
use App\Models\Unit;
use App\Support\DriverInductionArchive;
use App\Support\DriverInductionLookup;
use App\Support\InductionReportExporter;
use App\Support\InductionStatuses;
use App\Support\SystemRoles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response as HttpResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DriverInductionReportController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('driver-report/index', [
            'dnis' => '',
            'rows' => [],
            'summary' => null,
            'truncated' => false,
            'dniCount' => 0,
        ]);
    }

    public function search(Request $request, DriverInductionLookup $lookup): Response
    {
        $dnis = $this->dnis($request);
        $report = $lookup->build($dnis);

        return Inertia::render('driver-report/index', [
            'dnis' => $dnis,
            'rows' => $report['rows'],
            'summary' => $report['summary'],
            'truncated' => $report['truncated'],
            'dniCount' => $report['dni_count'],
        ]);
    }

    public function document(Request $request, DriverInductionArchive $archive): HttpResponse|JsonResponse
    {
        $validated = $request->validate([
            'dni' => ['required', 'string', 'max:32'],
            'induction_id' => ['required', 'integer', 'min:1'],
            'doc' => ['required', 'in:acta,risst,ritran'],
        ]);

        try {
            return $archive->preview(
                $validated['dni'],
                (int) $validated['induction_id'],
                $validated['doc'],
            );
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => mb_substr($e->getMessage(), 0, 180),
            ], 500);
        }
    }

    public function excel(
        Request $request,
        DriverInductionLookup $lookup,
        InductionReportExporter $exporter,
    ): StreamedResponse {
        $digits = array_column($lookup->parse($this->dnis($request)), 'key');

        $units = Unit::query()
            ->with([
                'period:id,date,status',
                'coordinatorUser:id,name',
                'coordinatorUser.places.site:id,name',
            ]);

        if ($digits !== []) {
            $placeholders = implode(', ', array_fill(0, count($digits), '?'));
            $units->whereRaw(
                "regexp_replace(coalesce(driver_dni, ''), '[^0-9]', '', 'g') in ({$placeholders})",
                $digits,
            );
        } else {
            $units->whereRaw('1 = 0');
        }

        if (SystemRoles::currentIsScopedCoordinator()) {
            $units->where('coordinator_id', Auth::id());
        }

        $inductions = Induction::query()
            ->with('attendees')
            ->where('status', '!=', InductionStatuses::CANCELLED)
            ->orderBy('scheduled_at')
            ->get();

        return $exporter->download($inductions, $units->get(), $digits);
    }

    public function archive(Request $request, DriverInductionArchive $archive): HttpResponse|BinaryFileResponse|JsonResponse
    {
        $validated = $request->validate([
            'groups' => ['required', 'array', 'min:1'],
            'groups.*.induction_id' => ['required', 'integer', 'min:1'],
            'groups.*.include' => ['required', 'array', 'min:1'],
            'groups.*.include.*' => ['in:acta,risst,ritran'],
            'groups.*.dnis' => ['required', 'array', 'min:1'],
            'groups.*.dnis.*' => ['required', 'string', 'max:32'],
        ], [
            'groups.required' => 'Marca al menos una inducción.',
        ]);

        try {
            return $archive->respond($validated['groups']);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => mb_substr($e->getMessage(), 0, 180),
            ], 500);
        }
    }

    private function dnis(Request $request): string
    {
        $validated = $request->validate([
            'dnis' => ['required', 'string', 'max:30000'],
        ], [
            'dnis.required' => 'Pega al menos un DNI.',
        ]);

        return $validated['dnis'];
    }
}
