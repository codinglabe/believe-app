<?php

namespace App\Http\Controllers\Livestock;

use App\Http\Controllers\BaseController;
use App\Models\AnimalHealthRecord;
use App\Models\LivestockAnimal;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HealthRecordController extends BaseController
{
    /**
     * Display health records for an animal.
     */
    public function index(Request $request, $animalId): Response
    {
        $user = $request->user('livestock');
        $animal = LivestockAnimal::findOrFail($animalId);

        // Check ownership
        if ($animal->current_owner_livestock_user_id !== $user->id && $animal->livestock_user_id !== $user->id) {
            abort(403);
        }

        $records = $animal->healthRecords()
            ->orderBy('record_date', 'desc')
            ->paginate(12);

        return Inertia::render('Livestock/HealthRecords/Index', [
            'animal' => $animal->load('primaryPhoto'),
            'records' => $records,
        ]);
    }

    /**
     * Show the form for creating a new health record.
     */
    public function create(Request $request, $animalId): Response
    {
        $user = $request->user('livestock');
        $animal = LivestockAnimal::findOrFail($animalId);

        // Check ownership
        if ($animal->current_owner_livestock_user_id !== $user->id && $animal->livestock_user_id !== $user->id) {
            abort(403);
        }

        return Inertia::render('Livestock/HealthRecords/Create', [
            'animal' => $animal->load('primaryPhoto'),
        ]);
    }

    /**
     * Store a newly created health record.
     */
    public function store(Request $request, $animalId)
    {
        $user = $request->user('livestock');
        $animal = LivestockAnimal::findOrFail($animalId);

        // Check ownership
        if ($animal->current_owner_livestock_user_id !== $user->id && $animal->livestock_user_id !== $user->id) {
            abort(403);
        }

        $validated = $request->validate([
            'record_type' => 'required|in:vaccination,treatment,checkup,surgery,other',
            'description' => 'required|string',
            'medication' => 'nullable|string|max:255',
            'vet_name' => 'nullable|string|max:255',
            'record_date' => 'required|date',
            'document_files' => 'nullable|array',
        ]);

        $animal->healthRecords()->create($validated);

        return redirect()->route('health.index', $animalId)
            ->with('success', 'Health record added successfully.');
    }

    /**
     * Display the specified health record.
     */
    public function show(Request $request, $animalId, $id): Response
    {
        $user = $request->user('livestock');
        $animal = LivestockAnimal::findOrFail($animalId);
        $record = AnimalHealthRecord::findOrFail($id);

        // Check ownership
        if ($animal->current_owner_livestock_user_id !== $user->id && $animal->livestock_user_id !== $user->id) {
            abort(403);
        }

        return Inertia::render('Livestock/HealthRecords/Show', [
            'animal' => $animal->load('primaryPhoto'),
            'record' => $record,
        ]);
    }

    /**
     * Show the form for editing the specified health record.
     */
    public function edit(Request $request, $animalId, $id): Response
    {
        $user = $request->user('livestock');
        $animal = LivestockAnimal::findOrFail($animalId);
        $record = AnimalHealthRecord::findOrFail($id);

        // Check ownership
        if ($animal->current_owner_livestock_user_id !== $user->id && $animal->livestock_user_id !== $user->id) {
            abort(403);
        }

        return Inertia::render('Livestock/HealthRecords/Edit', [
            'animal' => $animal->load('primaryPhoto'),
            'record' => $record,
        ]);
    }

    /**
     * Update the specified health record.
     */
    public function update(Request $request, $animalId, $id)
    {
        $user = $request->user('livestock');
        $animal = LivestockAnimal::findOrFail($animalId);
        $record = AnimalHealthRecord::findOrFail($id);

        // Check ownership
        if ($animal->current_owner_livestock_user_id !== $user->id && $animal->livestock_user_id !== $user->id) {
            abort(403);
        }

        $validated = $request->validate([
            'record_type' => 'required|in:vaccination,treatment,checkup,surgery,other',
            'description' => 'required|string',
            'medication' => 'nullable|string|max:255',
            'vet_name' => 'nullable|string|max:255',
            'record_date' => 'required|date',
            'document_files' => 'nullable|array',
        ]);

        $record->update($validated);

        return redirect()->route('health.index', $animalId)
            ->with('success', 'Health record updated successfully.');
    }

    /**
     * Remove the specified health record.
     */
    public function destroy(Request $request, $animalId, $id)
    {
        $user = $request->user('livestock');
        $animal = LivestockAnimal::findOrFail($animalId);
        $record = AnimalHealthRecord::findOrFail($id);

        // Check ownership
        if ($animal->current_owner_livestock_user_id !== $user->id && $animal->livestock_user_id !== $user->id) {
            abort(403);
        }

        $record->delete();

        return redirect()->route('health.index', $animalId)
            ->with('success', 'Health record deleted successfully.');
    }
}
