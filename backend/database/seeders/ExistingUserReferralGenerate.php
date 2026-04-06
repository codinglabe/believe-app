<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class ExistingUserReferralGenerate extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get users with role 'user' or 'organization' and empty referral_code
        $users = User::whereIn('role', ['user', 'organization'])
                     ->where(function ($query) {
                         $query->whereNull('referral_code')
                               ->orWhere('referral_code', '');
                     })
                     ->get();

        foreach ($users as $user) {
            $user->referral_code = $this->generateUniqueReferralCode();
            $user->save();
        }
    }

    /**
     * Generate a unique referral code
     */
    private function generateUniqueReferralCode(): string
    {
        do {
            $code = substr(bin2hex(random_bytes(8)), 0, 12);
        } while (User::where('referral_code', $code)->exists());

        return $code;
    }
}
