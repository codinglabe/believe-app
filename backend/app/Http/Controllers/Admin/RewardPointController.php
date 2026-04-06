<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RewardPointController extends Controller
{
    /**
     * Display the reward point management page.
     */
    public function index()
    {
        $hourlyRewardRate = (float) AdminSetting::get('volunteer_hourly_reward_points', 10.00);

        return Inertia::render('admin/reward-points/Index', [
            'rewardSettings' => [
                'hourly_reward_points' => $hourlyRewardRate,
            ],
        ]);
    }

    /**
     * Update the reward point settings.
     */
    public function update(Request $request)
    {
        $request->validate([
            'hourly_reward_points' => ['required', 'numeric', 'min:0', 'max:10000'],
        ]);

        AdminSetting::set('volunteer_hourly_reward_points', $request->input('hourly_reward_points'), 'float');

        return redirect()->back()->with('success', 'Reward point settings updated successfully.');
    }
}

