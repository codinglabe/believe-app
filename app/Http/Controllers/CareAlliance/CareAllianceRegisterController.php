<?php

namespace App\Http\Controllers\CareAlliance;

use App\Http\Controllers\Controller;
use App\Models\BoardMember;
use App\Models\CareAlliance;
use App\Models\ChatTopic;
use App\Models\Organization;
use App\Models\PrimaryActionCategory;
use App\Models\User;
use App\Services\SeoService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class CareAllianceRegisterController extends Controller
{
    public function create(Request $request)
    {
        return Inertia::render('frontend/register/care-alliance', [
            'seo' => SeoService::forPage('register_care_alliance'),
            'primaryActionCategories' => $this->primaryActionCategories(),
        ]);
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    private function primaryActionCategories(): array
    {
        return PrimaryActionCategory::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (PrimaryActionCategory $c) => ['id' => $c->id, 'name' => $c->name])
            ->values()
            ->all();
    }

    public function store(Request $request)
    {
        $pacIds = $request->input('primary_action_category_ids');
        if (! is_array($pacIds)) {
            $pacIds = $pacIds !== null && $pacIds !== '' ? [$pacIds] : [];
        }
        $request->merge([
            'primary_action_category_ids' => array_values(array_unique(array_filter(array_map('intval', $pacIds)))),
        ]);

        $request->merge([
            'website' => $request->filled('website') ? $request->input('website') : null,
            'ein' => $request->filled('ein') ? $request->input('ein') : null,
            'description' => $request->filled('description') ? $request->input('description') : null,
            'city' => $request->filled('city') ? $request->input('city') : null,
            'state' => $request->filled('state') ? $request->input('state') : null,
            'management_fee_percent' => $request->filled('management_fee_percent') ? $request->input('management_fee_percent') : null,
        ]);

        $validator = Validator::make($request->all(), [
            'contact_name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|confirmed|min:8',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'city' => 'nullable|string|max:128',
            'state' => 'nullable|string|max:64',
            'website' => 'nullable|url|max:500',
            'ein' => 'nullable|string|max:32',
            'management_fee_percent' => 'nullable|numeric|min:0|max:100',
            'fund_model' => ['required', Rule::in(['direct', 'campaign_split'])],
            'primary_action_category_ids' => ['required', 'array', 'min:1', 'max:8'],
            'primary_action_category_ids.*' => ['integer', 'distinct', Rule::exists('primary_action_categories', 'id')->where('is_active', true)],
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $validated = $validator->validated();

        Role::findOrCreate('care_alliance', 'web');
        Role::findOrCreate('organization', 'web');

        $baseSlug = Str::slug($validated['name']);
        $slug = $baseSlug ?: 'care-alliance';
        $counter = 1;
        while (CareAlliance::where('slug', $slug)->exists()) {
            $slug = $baseSlug.'-'.$counter;
            $counter++;
        }

        $userSlug = Str::slug($validated['contact_name']).'-'.Str::random(6);
        while (User::where('slug', $userSlug)->exists()) {
            $userSlug = Str::slug($validated['contact_name']).'-'.Str::random(6);
        }

        $feeBps = null;
        if (isset($validated['management_fee_percent']) && $validated['management_fee_percent'] !== null && $validated['management_fee_percent'] !== '') {
            $feeBps = (int) round((float) $validated['management_fee_percent'] * 100);
        }

        try {
            DB::beginTransaction();

            $user = User::create([
                'name' => $validated['contact_name'],
                'slug' => $userSlug,
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => 'organization',
                'organization_role' => 'admin',
            ]);

            $alliance = CareAlliance::create([
                'creator_user_id' => $user->id,
                'slug' => $slug,
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'city' => $validated['city'] ?? null,
                'state' => $validated['state'] ?? null,
                'website' => $validated['website'] ?? null,
                'ein' => $validated['ein'] ?? null,
                'management_fee_bps' => $feeBps,
                'fund_model' => $validated['fund_model'],
                'status' => 'active',
                'balance_cents' => 0,
            ]);

            $alliance->primaryActionCategories()->sync($validated['primary_action_category_ids']);

            $einDigits = ! empty($validated['ein']) ? preg_replace('/\D/', '', $validated['ein']) : '';
            $orgEin = strlen($einDigits) >= 9
                ? substr($einDigits, 0, 9)
                : ('9'.str_pad((string) ($user->id % 100000000), 8, '0', STR_PAD_LEFT));

            $organization = Organization::create([
                'user_id' => $user->id,
                'ein' => $orgEin,
                'name' => $validated['name'],
                'street' => 'N/A',
                'city' => ! empty($validated['city']) ? $validated['city'] : 'N/A',
                'state' => ! empty($validated['state']) ? $validated['state'] : 'N/A',
                'zip' => '00000',
                'email' => $validated['email'],
                'phone' => '0000000000',
                'contact_name' => $validated['contact_name'],
                'contact_title' => 'Care Alliance',
                'website' => $validated['website'] ?? null,
                'description' => $validated['description'] ?? '',
                'mission' => $validated['description'] ?? 'Care Alliance',
                'registration_status' => 'approved',
                'status' => 'Active',
                'tax_period' => Carbon::now()->format('Ym'),
                'is_compliance_locked' => false,
                'has_edited_irs_data' => false,
            ]);

            $organization->primaryActionCategories()->sync($validated['primary_action_category_ids']);

            BoardMember::create([
                'organization_id' => $organization->id,
                'user_id' => $user->id,
                'position' => 'Care Alliance Administrator',
                'appointed_on' => now(),
            ]);

            if (Schema::hasColumn('care_alliances', 'hub_organization_id')) {
                $alliance->update(['hub_organization_id' => $organization->id]);
            }

            $topicIds = ChatTopic::query()->active()->orderBy('id')->limit(12)->pluck('id');
            if ($topicIds->isNotEmpty()) {
                $user->interestedTopics()->sync($topicIds);
            }

            $user->syncRoles(['organization', 'care_alliance']);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();

            return back()
                ->withErrors(['general' => 'Registration failed. Please try again.'])
                ->withInput();
        }

        event(new Registered($user));

        $scheme = $request->getScheme();
        $host = $request->getHost();
        $port = $request->getPort();
        $currentDomain = $scheme.'://'.$host.($port && $port != 80 && $port != 443 ? ':'.$port : '');
        $user->sendEmailVerificationNotification($currentDomain);

        Auth::login($user);

        return redirect()
            ->route('dashboard')
            ->with('success', 'Care Alliance registered successfully!');
    }
}
