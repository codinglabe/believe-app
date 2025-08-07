<?php

namespace App\Http\Controllers;

use App\Models\Topic;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;

class TopicController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $filters = $request->only(['search']);

        $topics = Topic::query()
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->where('name', 'like', '%' . $search . '%');
            })
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('admin/topic/Index', [
            'topics' => $topics,
            'filters' => $filters,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:topics,name',
        ]);

        Topic::create($validated);

        return redirect()->route('topics.index')->with('success', 'Topic created successfully!');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Topic $topic)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:topics,name,' . $topic->id,
        ]);

        $topic->update($validated);

        return redirect()->route('topics.index')->with('success', 'Topic updated successfully!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Topic $topic)
    {
        try {
            // Check if the topic is associated with any courses
            if ($topic->courses()->exists()) {
                return redirect()->back()->with('error', 'Cannot delete topic: It is associated with existing courses.');
            }
            $topic->delete();
            return redirect()->route('topics.index')->with('success', 'Topic deleted successfully!');
        } catch (\Exception $e) {
            Log::error("Error deleting topic: " . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to delete topic. An unexpected error occurred.');
        }
    }
}
