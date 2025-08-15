<?php

namespace App\Http\Controllers;

use App\Models\ChatTopic;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UsersInterestedTopicsController extends Controller
{
    public function userSelect()
    {
        $topics = ChatTopic::all();
        return Inertia::render('Frontend/InterestedTopic', [
            'topics' => $topics,
            'initialSelected' => auth()->user()->topics->pluck('id')->toArray()
        ]);
    }

    public function orgSelect()
    {
        $topics = ChatTopic::all();
        return Inertia::render('Settings/InterestedTopic', [
            'topics' => $topics,
            'initialSelected' => auth()->user()->topics->pluck('id')->toArray()
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'topics' => 'required|array|min:1',
            'topics.*' => 'exists:topics,id',
        ]);

        auth()->user()->topics()->sync($request->topics);

        return redirect()->intended('/chat');
    }
}
