<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class StatusCodesTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $data = [
            ['status_code' => 1, 'status' => 'Unconditional Exemption', 'description' => 'The organization has a permanent, active tax-exempt status.'],
            ['status_code' => 2, 'status' => 'Advance Ruling', 'description' => 'The organization was granted a provisional exemption (usually first 5 years).'],
            ['status_code' => 12, 'status' => 'Termination', 'description' => 'The organization has terminated its exempt status.'],
            ['status_code' => 25, 'status' => 'Revocation of Exemption', 'description' => "The IRS has revoked the organization's tax-exempt status (e.g., for non-filing)."],
            ['status_code' => 34, 'status' => 'Suspension', 'description' => "The organization's tax-exempt status is suspended (often due to sanctions or legal reasons)."],
            ['status_code' => 40, 'status' => 'Status Unclear', 'description' => 'The IRS has an uncertain status for the organization, often pending verification or investigation.'],
        ];

        foreach ($data as $item) {
            \App\Models\StatusCode::updateOrCreate(
                [
                    'status_code' => $item['status_code'],
                    'status' => $item['status'],
                    'description' => $item['description']
                ]
            );
        }
    }
}
