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
use Throwable;

class CareAllianceCampaignManageController extends Controller
{
    private function alliance(Request $request): CareAlliance
    {
        return CareAlliance::where('creator_user_id', $request->user()->id)->firstOrFail();
    }

    private function campaignForAlliance(Request $request, CareAllianceCampaign $campaign): CareAllianceCampaign
    {
        $alliance = $this->alliance($request);
        if ((int) $campaign->care_alliance_id !== (int) $alliance->id) {
            abort(404);
        }

        return $campaign;
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedCampaignAttributes(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:10000',
            'status' => ['nullable', Rule::in(['draft', 'active', 'closed'])],
            'alliance_fee_bps_override' => 'nullable|integer|min:0|max:10000',
            'primary_action_category_ids' => 'nullable|array|max:8',
            'primary_action_category_ids.*' => 'integer|exists:primary_action_categories,id',
            'splits' => 'required|array|min:1',
            'splits.*.organization_id' => 'nullable|integer|exists:organizations,id',
            'splits.*.is_alliance_fee' => 'boolean',
            'splits.*.percent_bps' => 'required|integer|min:0|max:10000',
        ]);
    }

    /**
     * Normalize split rows so `is_alliance_fee` is a real bool (JSON / validated data can use strings like "false"
     * which break checks based on empty()).
     *
     * @param  array<int, array<string, mixed>>  $splits
     * @return array<int, array{organization_id: int|null, is_alliance_fee: bool, percent_bps: int}>
     */
    private function normalizeValidatedSplits(array $splits): array
    {
        $out = [];
        foreach ($splits as $row) {
            $isFee = filter_var($row['is_alliance_fee'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $orgId = null;
            if (! $isFee) {
                if (array_key_exists('organization_id', $row) && $row['organization_id'] !== null && $row['organization_id'] !== '') {
                    $orgId = (int) $row['organization_id'];
                }
            }
            $out[] = [
                'organization_id' => $orgId,
                'is_alliance_fee' => $isFee,
                'percent_bps' => (int) $row['percent_bps'],
            ];
        }

        return $out;
    }

    /**
     * @param  array<int, array{organization_id: int|null, is_alliance_fee: bool, percent_bps: int}>  $splits
     */
    private function assertSplitsValid(array $splits, CareAlliance $alliance): void
    {
        $sum = 0;
        foreach ($splits as $row) {
            $sum += $row['percent_bps'];
        }
        if ($sum !== 10000) {
            throw ValidationException::withMessages([
                'campaign' => 'Percent splits must total exactly 100%.',
            ]);
        }

        $orgIds = [];
        foreach ($splits as $row) {
            if ($row['is_alliance_fee']) {
                continue;
            }
            $oid = $row['organization_id'];
            if (! $oid) {
                throw ValidationException::withMessages([
                    'campaign' => 'Each non-fee row must reference an organization.',
                ]);
            }
            $orgIds[] = $oid;
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
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function persistCampaignSplitsAndCategories(
        CareAllianceCampaign $campaign,
        array $validated,
        CareAlliance $alliance,
    ): void {
        $splits = $validated['splits'];
        $allowedCategoryIds = $alliance->primaryActionCategories()
            ->pluck('primary_action_categories.id')
            ->map(fn ($id) => (int) $id)
            ->all();
        $catIds = array_values(array_unique(array_map('intval', $validated['primary_action_category_ids'] ?? [])));
        $catIds = array_values(array_filter($catIds, fn (int $id) => in_array($id, $allowedCategoryIds, true)));

        $campaign->splits()->delete();

        foreach ($splits as $row) {
            $isFee = $row['is_alliance_fee'];
            CareAllianceCampaignSplit::create([
                'care_alliance_campaign_id' => $campaign->id,
                'organization_id' => $isFee ? null : $row['organization_id'],
                'is_alliance_fee' => $isFee,
                'percent_bps' => $row['percent_bps'],
            ]);
        }

        $campaign->primaryActionCategories()->sync($catIds);
    }

    public function store(Request $request)
    {
        $alliance = $this->alliance($request);
        $validated = $this->validatedCampaignAttributes($request);
        $validated['splits'] = $this->normalizeValidatedSplits($validated['splits']);
        $this->assertSplitsValid($validated['splits'], $alliance);

        try {
            DB::transaction(function () use ($alliance, $validated) {
                $campaign = CareAllianceCampaign::create([
                    'care_alliance_id' => $alliance->id,
                    'name' => $validated['name'],
                    'description' => $validated['description'] ?? null,
                    'status' => $validated['status'] ?? 'draft',
                    'alliance_fee_bps_override' => $validated['alliance_fee_bps_override'] ?? null,
                ]);

                $this->persistCampaignSplitsAndCategories($campaign, $validated, $alliance);
            });
        } catch (ValidationException $e) {
            throw $e;
        } catch (Throwable $e) {
            report($e);

            throw ValidationException::withMessages([
                'campaign' => config('app.debug') ? $e->getMessage() : 'Could not create campaign.',
            ]);
        }

        return redirect()->route('care-alliance.workspace.campaigns', ['tab' => 'list'])
            ->with('success', 'Campaign created.');
    }

    public function update(Request $request, CareAllianceCampaign $campaign)
    {
        $alliance = $this->alliance($request);
        $campaign = $this->campaignForAlliance($request, $campaign);

        $validated = $this->validatedCampaignAttributes($request);
        $validated['splits'] = $this->normalizeValidatedSplits($validated['splits']);
        $this->assertSplitsValid($validated['splits'], $alliance);

        try {
            DB::transaction(function () use ($campaign, $validated, $alliance) {
                $campaign->update([
                    'name' => $validated['name'],
                    'description' => $validated['description'] ?? null,
                    'status' => $validated['status'] ?? 'draft',
                    'alliance_fee_bps_override' => $validated['alliance_fee_bps_override'] ?? null,
                ]);

                $this->persistCampaignSplitsAndCategories($campaign, $validated, $alliance);
            });
        } catch (ValidationException $e) {
            throw $e;
        } catch (Throwable $e) {
            report($e);

            throw ValidationException::withMessages([
                'campaign' => config('app.debug') ? $e->getMessage() : 'Could not update campaign.',
            ]);
        }

        return redirect()->route('care-alliance.workspace.campaigns', ['tab' => 'list'])
            ->with('success', 'Campaign updated.');
    }

    public function destroy(Request $request, CareAllianceCampaign $campaign)
    {
        $this->campaignForAlliance($request, $campaign);

        if ($campaign->donations()->exists()) {
            throw ValidationException::withMessages([
                'campaign' => 'Campaigns that have received donations cannot be deleted. Set status to closed instead.',
            ]);
        }

        try {
            $campaign->delete();
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'campaign' => 'Could not delete campaign.',
            ]);
        }

        return redirect()->route('care-alliance.workspace.campaigns', ['tab' => 'list'])
            ->with('success', 'Campaign deleted.');
    }
}
