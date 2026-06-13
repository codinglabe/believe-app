<?php

namespace App\Http\Controllers;

use App\Models\ChatTopic;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UsersInterestedTopicsController extends Controller
{
    public function userSelect()
    {
        $topics = ChatTopic::query()
            ->active()
            ->with(['chatRooms' => function ($query) {
                $query->where('is_active', true)->orderBy('id');
            }])
            ->orderBy('id')
            ->get()
            ->map(function (ChatTopic $topic) {
                $room = $topic->chatRooms->firstWhere('type', 'public')
                    ?? $topic->chatRooms->first();

                return [
                    'id' => $topic->id,
                    'name' => $topic->name,
                    'description' => $topic->description,
                    'chat_room_id' => $room?->id,
                ];
            })
            ->values();

        return Inertia::render('frontend/user-profile/interested-topic', [
            'topics' => $topics,
            'initialSelected' => auth()->user()
                ->interestedTopics()
                ->orderBy('chat_topics.id')
                ->pluck('chat_topics.id')
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

        $user = auth()->user();
        $hadTopics = $user->interestedTopics()->exists();

        $user->interestedTopics()->sync($request->topics);

        $successMessage = 'Your group chat interests have been updated.';

        $intended = $request->session()->pull('url.intended');
        if (is_string($intended) && $intended !== '') {
            $host = parse_url($intended, PHP_URL_HOST);
            if ($host === null || $host === $request->getHost()) {
                return redirect()->to($intended)
                    ->with('success', $successMessage);
            }
        }

        if ($hadTopics) {
            return redirect()
                ->route('topics.select')
                ->with('success', $successMessage);
        }

        return redirect()
            ->to(\App\Http\Helpers\AuthRedirectHelper::defaultRedirectForUser($user))
            ->with('success', $successMessage);
    }
}
