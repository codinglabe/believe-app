<?php

namespace App\Http\Controllers\CareAlliance;

use App\Http\Controllers\Controller;
use App\Models\CareAlliance;
use App\Models\CareAllianceCampaign;
use App\Models\CareAllianceCampaignSplit;
use App\Models\CareAllianceMembership;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CareAllianceCampaignManageController extends Controller
{
    private function alliance(Request $request): CareAlliance
    {
        return CareAlliance::where('creator_user_id', $request->user()->id)->firstOrFail();
    }

    public function store(Request $request)
    {
        $alliance = $this->alliance($request);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:10000',
            'status' => ['nullable', Rule::in(['draft', 'active', 'closed'])],
            'alliance_fee_bps_override' => 'nullable|integer|min:0|max:10000',
            'splits' => 'required|array|min:1',
            'splits.*.organization_id' => 'nullable|integer|exists:organizations,id',
            'splits.*.is_alliance_fee' => 'boolean',
            'splits.*.percent_bps' => 'required|integer|min:0|max:10000',
        ]);

        $splits = $validated['splits'];
        $sum = 0;
        foreach ($splits as $row) {
            $sum += (int) $row['percent_bps'];
        }
        if ($sum !== 10000) {
            throw ValidationException::withMessages([
                'campaign' => 'Percent splits must total exactly 100%.',
            ]);
        }

        $orgIds = [];
        foreach ($splits as $row) {
            $isFee = ! empty($row['is_alliance_fee']);
            if ($isFee) {
                continue;
            }
            $oid = $row['organization_id'] ?? null;
            if (! $oid) {
                throw ValidationException::withMessages([
                    'campaign' => 'Each non-fee row must reference an organization.',
                ]);
            }
            $orgIds[] = (int) $oid;
        }

        $activeMembers = CareAllianceMembership::query()
            ->where('care_alliance_id', $alliance->id)
            ->where('status', 'active')
            ->whereIn('organization_id', $orgIds)
            ->pluck('organization_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        foreach (array_unique($orgIds) as $oid) {
            if (! in_array($oid, $activeMembers, true)) {
                throw ValidationException::withMessages([
                    'campaign' => 'All organizations in the split must be active members of this alliance.',
                ]);
            }
        }

        DB::beginTransaction();
        try {
            $campaign = CareAllianceCampaign::create([
                'care_alliance_id' => $alliance->id,
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'status' => $validated['status'] ?? 'draft',
                'alliance_fee_bps_override' => $validated['alliance_fee_bps_override'] ?? null,
            ]);

            foreach ($splits as $row) {
                $isFee = ! empty($row['is_alliance_fee']);
                CareAllianceCampaignSplit::create([
                    'care_alliance_campaign_id' => $campaign->id,
                    'organization_id' => $isFee ? null : ($row['organization_id'] ?? null),
                    'is_alliance_fee' => $isFee,
                    'percent_bps' => (int) $row['percent_bps'],
                ]);
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();

            throw ValidationException::withMessages([
                'campaign' => 'Could not create campaign.',
            ]);
        }

        return redirect()->route('care-alliance.workspace.campaigns')->with('success', 'Campaign created.');
    }
}
