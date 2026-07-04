<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Services\BrpParticipationSettingsService;
use App\Support\BrpParticipationModule;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RewardPointController extends Controller
{
    /**
     * Display the BRP participation reward management page.
     */
    public function index()
    {
        return Inertia::render('admin/reward-points/Index', [
            'participationModules' => BrpParticipationSettingsService::adminModulesPayload(),
            'volunteerHourlyLegacyRate' => (float) AdminSetting::get('volunteer_hourly_reward_points', 10.00),
        ]);
    }

    /**
     * Update BRP participation settings for all modules.
     */
    public function update(Request $request)
    {
        $moduleKeys = BrpParticipationModule::all();

        $rules = [
            'modules' => ['required', 'array'],
        ];

        foreach ($moduleKeys as $module) {
            $rules["modules.{$module}.enabled"] = ['required', 'boolean'];
            $rules["modules.{$module}.free_award"] = ['required', 'numeric', 'min:0', 'max:10000'];
            $rules["modules.{$module}.prime_award"] = ['required', 'numeric', 'min:0', 'max:10000'];
            $rules["modules.{$module}.money_moves"] = ['required', 'boolean'];
        }

        $validated = $request->validate($rules);

        foreach ($moduleKeys as $module) {
            $payload = $validated['modules'][$module] ?? null;
            if ($payload === null) {
                continue;
            }

            BrpParticipationSettingsService::setModuleSettings(
                $module,
                (bool) $payload['enabled'],
                (float) $payload['free_award'],
                (float) $payload['prime_award'],
                (bool) $payload['money_moves'],
            );
        }

        if ($request->has('volunteer_hourly_legacy_rate')) {
            $request->validate([
                'volunteer_hourly_legacy_rate' => ['nullable', 'numeric', 'min:0', 'max:10000'],
            ]);
            AdminSetting::set(
                'volunteer_hourly_reward_points',
                (float) $request->input('volunteer_hourly_legacy_rate', 0),
                'float',
            );
        }

        return redirect()->back()->with('success', 'BRP participation reward settings updated successfully.');
    }
}
