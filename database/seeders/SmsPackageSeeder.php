<?php

namespace Database\Seeders;

use App\Models\SmsPackage;
use Illuminate\Database\Seeder;

class SmsPackageSeeder extends Seeder
{
    public function run(): void
    {
        if (SmsPackage::query()->exists()) {
            return;
        }

        SmsPackage::create([
            'name' => 'Standard SMS Pack',
            'description' => 'Prepaid SMS credits for newsletter SMS and Email+SMS sends (Twilio).',
            'sms_count' => 1200,
            'price' => 25.00,
            'is_active' => true,
            'sort_order' => 0,
        ]);
    }
}
