<?php

namespace App\Http\Controllers;

use App\Models\Unit;
use App\Models\UnitDocument;
use App\Support\SystemRoles;
use App\Support\UnitDocumentTypes;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UnitDocumentController extends Controller
{
    public function store(Request $request, Unit $unit): RedirectResponse
    {
        $this->ensureCanAccessUnit($unit);

        $validated = $request->validate([
            'type' => ['required', 'string', Rule::in(UnitDocumentTypes::keys())],
            'title' => ['nullable', 'string', 'max:255'],
            'expires_at' => ['nullable', 'date'],
            'file' => [
                'required',
                'file',
                'mimes:jpeg,jpg,png,webp,pdf',
                'max:10240',
            ],
        ], [
            'type.required' => 'Selecciona el tipo de documento.',
            'type.in' => 'El tipo de documento no es válido.',
            'file.required' => 'Debes seleccionar un archivo.',
            'file.mimes' => 'El archivo debe ser imagen (JPG, PNG, WEBP) o PDF.',
            'file.max' => 'El archivo no puede superar los 10 MB.',
            'expires_at.date' => 'La fecha de vencimiento no es válida.',
        ]);

        $file = $request->file('file');
        $type = $validated['type'];
        $directory = "units/{$unit->id}/{$type}";
        $path = $file->store($directory, 'public');

        $title = isset($validated['title']) ? trim((string) $validated['title']) : null;

        if ($title === '') {
            $title = null;
        }

        UnitDocument::query()->create([
            'unit_id' => $unit->id,
            'type' => $type,
            'title' => $title,
            'original_name' => $file->getClientOriginalName(),
            'path' => $path,
            'disk' => 'public',
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'expires_at' => $validated['expires_at'] ?? null,
            'uploaded_by' => Auth::id(),
        ]);

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Documento subido correctamente.',
        ]);
    }

    public function download(Unit $unit, UnitDocument $document): StreamedResponse
    {
        $this->ensureDocumentBelongsToUnit($unit, $document);
        $this->ensureCanAccessUnit($unit);

        if (! Storage::disk($document->disk)->exists($document->path)) {
            abort(404, 'El archivo no existe.');
        }

        return Storage::disk($document->disk)->download(
            $document->path,
            $document->original_name,
        );
    }

    public function destroy(Unit $unit, UnitDocument $document): RedirectResponse
    {
        $this->ensureDocumentBelongsToUnit($unit, $document);
        $this->ensureCanAccessUnit($unit);

        $document->delete();

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Documento eliminado correctamente.',
        ]);
    }

    private function ensureDocumentBelongsToUnit(Unit $unit, UnitDocument $document): void
    {
        if ((int) $document->unit_id !== (int) $unit->id) {
            abort(404);
        }
    }

    private function ensureCanAccessUnit(Unit $unit): void
    {
        if (
            SystemRoles::currentIsScopedCoordinator()
            && (int) $unit->coordinator_id !== (int) Auth::id()
        ) {
            abort(403, 'No tienes acceso a esta unidad.');
        }
    }
}
