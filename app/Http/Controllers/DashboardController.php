<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use App\Models\UserFavoriteOrganization;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        if($request->user()->role === 'admin') {
            $totalOrg =  Organization::get()->count();
        }else{
            // $organization = Organization::where('user_id', $request->user()->id)->first();
            // dd($request->user()->organizations);
            $organization =  $request->user()->organization ?? null;

            // dd($request->user()->organizations);
            if ($organization) {
                $totalFav = UserFavoriteOrganization::where('organization_id', $organization->id)->count();
            }
        }

        $request->user()->load('interestedTopics');

        // dd($request->user()->interestedTopics->map(function ($topic) {
        //     return [
        //         'id' => $topic->id,
        //         'name' => $topic->name,
        //     ];
        // }));


        return Inertia::render('dashboard', [
            'totalOrg' => $totalOrg ?? 0,
            'orgInfo' => $organization ?? null,
            'totalFav' => $totalFav ?? 0,
            'topics' => $request->user()->interestedTopics->map(function ($topic) {
                return [
                    'id' => $topic->id,
                    'name' => $topic->name,
                ];
            }),
        ]);
    }


    public function getUserTopic(Request $request)
    {
        return $request->user()->interestedTopics()->get();
    }

    public function destroyUserTopic(Request $request, $topicId)
    {
        $request->user()->interestedTopics()->detach($topicId);

        return redirect()->back()->with('success', 'Topic removed successfully');
    }
}
