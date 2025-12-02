<?php

namespace App\Http\Controllers;

use App\Models\ChatTopic;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UsersInterestedTopicsController extends Controller
{
    public function userSelect()
    {
        return Inertia::render('frontend/user-profile/interested-topic', [
            'topics' => ChatTopic::active()->get(), // or ->get() if you want all
            'initialSelected' => auth()->user()
                ->interestedTopics
                ->pluck('id')
                ->toArray(),
        ]);
    }

    public function orgSelect()
    {
        $topics = ChatTopic::all();
        return Inertia::render('admin/chat-topic/topic-select', [
            'topics' => $topics,
            'initialSelected' => auth()->user()->interestedTopics->pluck('id')->toArray()
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'topics' => 'required|array|min:1',
            'topics.*' => 'exists:chat_topics,id',
        ], [
            'topics.required' => 'Please select at least one topic.',
            'topics.min' => 'Please select at least one topic.',
            'topics.*.exists' => 'One or more selected topics are invalid.',
        ]);

        auth()->user()->interestedTopics()->sync($request->topics);

        return redirect()
            ->route("chat.index")
            ->with('success', 'Your interests have been updated successfully!');
    }
}
