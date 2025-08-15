<?php

namespace App\Http\Controllers;

use App\Models\ChatTopic;
use App\Models\Topic;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;

class ChatTopicController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $filters = $request->only(['search']);

        $topics = ChatTopic::query()
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->where('name', 'like', '%' . $search . '%');
            })
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('admin/chat-topic/index', [
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
            'name' => 'required|string|max:255|unique:chat_topics,name',
            'description' => 'nullable|string',
        ]);

        ChatTopic::create($validated);

        return redirect()->route('chat-group-topics.index')->with('success', 'Topic created successfully!');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, int $id)
    {
        $topic =  ChatTopic::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:chat_topics,name,' . $topic->id,
            'description' => 'nullable|string',
        ]);

        $topic->update($validated);

        return redirect()->route('chat-group-topics.index')->with('success', 'Topic updated successfully!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(int $id)
    {
        try {
            // Removed 'canBeDeleted' from withCount since it's not a relationship
            $topic = ChatTopic::withCount(['chatRooms', 'users'])->findOrFail($id);

            // Check if the topic can be deleted using the method
            if (!$topic->canBeDeleted()) {
                $message = 'Cannot delete topic: ';
                $reasons = [];

                if ($topic->chat_rooms_count > 0) {
                    $reasons[] = "it is associated with {$topic->chat_rooms_count} group(s)";
                }
                if ($topic->users_count > 0) {
                    $reasons[] = "it has {$topic->users_count} user(s) subscribed";
                }

                return redirect()
                    ->back()
                    ->with('error', $message . implode(' and ', $reasons) . '.');
            }

            $topic->delete();

            return redirect()
                ->route('chat-group-topics.index')
                ->with('success', 'Topic deleted successfully!');

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return redirect()
                ->back()
                ->with('error', 'Topic not found.');

        } catch (\Exception $e) {
            \Log::error("Error deleting topic ID {$id}: " . $e->getMessage());
            return redirect()
                ->back()
                ->with('error', 'Failed to delete topic. Please try again later.');
        }
    }
}
