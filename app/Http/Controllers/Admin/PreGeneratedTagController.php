<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PreGeneratedTag;
use App\Models\LivestockAnimal;
use App\Models\FractionalAsset;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PreGeneratedTagController extends Controller
{
    /**
     * Display a listing of pre-generated tags.
     */
    public function index(Request $request)
    {
        // Only show fractional listings with null livestock_animal_id (auto-generated tags that need assignment)
        $query = \App\Models\FractionalListing::whereNull('livestock_animal_id')
            ->where('status', 'active')
            ->with('fractionalAsset');

        // Apply filters
        if ($request->has('country_code') && $request->country_code !== '') {
            $query->where('country_code', strtoupper($request->country_code));
        }

        if ($request->has('search') && $request->search !== '') {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('tag_number', 'like', "%{$search}%")
                  ->orWhere('country_code', 'like', "%{$search}%");
            });
        }

        // Paginate listings
        $tags = $query->orderBy('created_at', 'desc')
            ->paginate(20)
            ->withQueryString()
            ->through(function($listing) {
                return [
                    'id' => $listing->id,
                    'listing_id' => $listing->id,
                    'country_code' => $listing->country_code,
                    'tag_number' => $listing->tag_number,
                    'status' => 'needs_assignment',
                    'created_at' => $listing->created_at->toDateTimeString(),
                    'animal' => null,
                    'fractional_asset_id' => $listing->fractional_asset_id,
                    'fractionalAsset' => $listing->fractionalAsset ? [
                        'id' => $listing->fractionalAsset->id,
                        'name' => $listing->fractionalAsset->name,
                    ] : null,
                ];
            });

        // Stats
        $stats = [
            'total' => \App\Models\FractionalListing::whereNull('livestock_animal_id')->where('status', 'active')->count(),
            'available' => 0,
            'assigned' => 0,
            'needs_assignment' => \App\Models\FractionalListing::whereNull('livestock_animal_id')->where('status', 'active')->count(),
        ];

        // Get available animals for assignment - buyer's animals without active fractional listings
        $user = $request->user('livestock');
        $availableAnimals = [];
        
        if ($user) {
            $availableAnimals = LivestockAnimal::where('current_owner_livestock_user_id', $user->id)
                ->whereDoesntHave('fractionalListing', function($query) {
                    $query->where('status', 'active');
                })
                ->select('id', 'species', 'breed', 'ear_tag', 'sex')
                ->orderBy('created_at', 'desc')
                ->limit(200)
                ->get()
                ->toArray();
        }

        return Inertia::render('admin/Livestock/PreGeneratedTags', [
            'tags' => $tags,
            'stats' => $stats,
            'availableAnimals' => $availableAnimals,
            'filters' => $request->only(['status', 'country_code', 'search']),
        ]);
    }

    /**
     * Store a newly created pre-generated tag.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'country_code' => 'required|string|size:2',
            'tag_number' => 'required|string|max:50|unique:pre_generated_tags,tag_number',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        PreGeneratedTag::create([
            'country_code' => strtoupper($request->country_code),
            'tag_number' => $request->tag_number,
            'status' => 'available',
        ]);

        return back()->with('success', 'Pre-generated tag created successfully.');
    }

    /**
     * Generate multiple tags at once.
     */
    public function generate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'country_code' => 'required|string|size:2',
            'count' => 'required|integer|min:1|max:100',
            'start_number' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $countryCode = strtoupper($request->country_code);
        $count = $request->count;
        $startNumber = $request->start_number ?? 1;

        // Get existing tag numbers for this country
        $existingTags = PreGeneratedTag::where('country_code', $countryCode)
            ->whereNotNull('tag_number')
            ->pluck('tag_number')
            ->toArray();

        // Extract numbers from existing tags
        $existingNumbers = [];
        foreach ($existingTags as $tag) {
            if (preg_match('/^' . preg_quote($countryCode, '/') . '-(\d+)$/i', $tag, $matches)) {
                $existingNumbers[] = (int)$matches[1];
            }
        }

        // Find starting number
        $nextNumber = $startNumber;
        if (!empty($existingNumbers)) {
            $maxNumber = max($existingNumbers);
            if ($startNumber <= $maxNumber) {
                $nextNumber = $maxNumber + 1;
            }
        }

        $generated = [];
        $errors = [];

        for ($i = 0; $i < $count; $i++) {
            $tagNumber = $countryCode . '-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
            
            // Check if tag already exists
            if (PreGeneratedTag::where('tag_number', $tagNumber)->exists()) {
                $errors[] = "Tag {$tagNumber} already exists";
                $nextNumber++;
                continue;
            }

            try {
                PreGeneratedTag::create([
                    'country_code' => $countryCode,
                    'tag_number' => $tagNumber,
                    'status' => 'available',
                ]);
                $generated[] = $tagNumber;
                $nextNumber++;
            } catch (\Exception $e) {
                $errors[] = "Failed to create tag {$tagNumber}: " . $e->getMessage();
            }
        }

        $message = "Generated " . count($generated) . " tag(s) successfully.";
        if (!empty($errors)) {
            $message .= " " . count($errors) . " error(s) occurred.";
        }

        return back()->with('success', $message)->with('errors', $errors);
    }

    /**
     * Assign an animal to a fractional listing.
     */
    public function assign(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'livestock_animal_id' => 'required|exists:livestock_animals,id',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $animal = LivestockAnimal::findOrFail($request->livestock_animal_id);
        
        // Verify buyer owns this animal
        $user = $request->user('livestock');
        if ($user && $animal->current_owner_livestock_user_id !== $user->id) {
            return back()->withErrors(['error' => 'You can only assign animals that you own.']);
        }

        // Get the fractional listing
        $listing = \App\Models\FractionalListing::findOrFail($id);

        if ($listing->livestock_animal_id !== null) {
            return back()->withErrors(['error' => 'This listing already has an animal assigned.']);
        }

        DB::transaction(function() use ($listing, $animal) {
            // Check if animal already has an active listing (with some tokens sold)
            $existingListing = \App\Models\FractionalListing::where('livestock_animal_id', $animal->id)
                ->where('status', 'active')
                ->first();

            if ($existingListing) {
                // Animal already has a listing, just update this listing with the animal
                $listing->update([
                    'livestock_animal_id' => $animal->id,
                    'livestock_user_id' => $animal->current_owner_livestock_user_id,
                ]);
            } else {
                // Animal doesn't have a listing yet, assign this listing to the animal
                $listing->update([
                    'livestock_animal_id' => $animal->id,
                    'livestock_user_id' => $animal->current_owner_livestock_user_id,
                ]);
            }

            // Update or create pre-generated tag for this listing
            PreGeneratedTag::updateOrCreate(
                [
                    'tag_number' => $listing->tag_number,
                ],
                [
                    'country_code' => $listing->country_code,
                    'fractional_asset_id' => $listing->fractional_asset_id,
                    'livestock_animal_id' => $animal->id,
                    'status' => 'assigned',
                ]
            );
        });

        return back()->with('success', 'Animal assigned to tag successfully.');
    }

    /**
     * Unassign an animal from a fractional listing.
     */
    public function unassign($id)
    {
        $listing = \App\Models\FractionalListing::findOrFail($id);

        if ($listing->livestock_animal_id === null) {
            return back()->withErrors(['error' => 'This listing does not have an animal assigned.']);
        }

        DB::transaction(function() use ($listing) {
            // Update fractional listing
            $listing->update([
                'livestock_animal_id' => null,
            ]);

            // Update pre-generated tag if exists
            $preGeneratedTag = PreGeneratedTag::where('tag_number', $listing->tag_number)->first();
            if ($preGeneratedTag) {
                $preGeneratedTag->update([
                    'livestock_animal_id' => null,
                    'status' => 'available',
                ]);
            }
        });

        return back()->with('success', 'Animal unassigned from tag successfully.');
    }

    /**
     * Delete a pre-generated tag.
     */
    public function destroy($id)
    {
        $tag = PreGeneratedTag::findOrFail($id);

        if ($tag->isAssigned()) {
            return back()->withErrors(['error' => 'Cannot delete an assigned tag. Unassign it first.']);
        }

        $tag->delete();

        return back()->with('success', 'Tag deleted successfully.');
    }
}
