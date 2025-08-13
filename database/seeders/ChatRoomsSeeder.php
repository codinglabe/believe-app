<?php

namespace Database\Seeders;

use App\Models\ChatRoom;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class ChatRoomsSeeder extends Seeder
{
    public function run()
    {
        $now = Carbon::now();
        $userId = 1; // Assuming user with ID 1 is the admin/creator

        $chatRooms = [
            // General Nonprofit Operations
            [
                'name' => 'General Nonprofit Operations',
                'description' => 'Discussions about general nonprofit management and operations',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Fundraising Strategies & Grants',
                'description' => 'Share and learn about fundraising techniques and grant opportunities',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => '501(c)(3) Compliance & Legal Help',
                'description' => 'Discuss legal compliance and 501(c)(3) requirements',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Board Development & Governance',
                'description' => 'Topics related to nonprofit board management and governance',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Volunteer Recruitment & Retention',
                'description' => 'Strategies for finding and keeping great volunteers',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Marketing & Social Media for Nonprofits',
                'description' => 'Promoting your nonprofit through marketing and social media',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Nonprofit Tech & Digital Tools',
                'description' => 'Technology solutions for nonprofit organizations',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'CRM & Donor Management Systems',
                'description' => 'Discussion about donor management and CRM systems',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Nonprofit Finance & Accounting',
                'description' => 'Financial management for nonprofit organizations',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Grant Writers United',
                'description' => 'For professional grant writers to share tips and opportunities',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Event Planning for Nonprofits',
                'description' => 'Planning and executing successful nonprofit events',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],

            // Cause-Specific Groups
            [
                'name' => 'Education & Youth Services',
                'description' => 'For organizations focused on education and youth development',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Food Security & Hunger Relief',
                'description' => 'Organizations working to combat hunger and improve food security',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Affordable Housing & Homelessness',
                'description' => 'Addressing housing issues and homelessness',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Mental Health Advocacy',
                'description' => 'For mental health organizations and advocates',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Environmental Sustainability & Climate Justice',
                'description' => 'Environmental organizations and climate action groups',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Racial Equity & Social Justice',
                'description' => 'Organizations working toward racial equity and social justice',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Healthcare Access & Wellness',
                'description' => 'Nonprofits focused on healthcare access and wellness programs',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Animal Welfare & Rescue',
                'description' => 'For animal rescue and welfare organizations',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Disaster Relief & Emergency Response',
                'description' => 'Organizations involved in disaster response and emergency relief',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Faith-Based Nonprofit Networks',
                'description' => 'For faith-based organizations to connect and collaborate',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],

            // Capacity-Building & Collaboration
            [
                'name' => 'Small Nonprofit Leadership Circle',
                'description' => 'For leaders of small nonprofit organizations',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Startup Nonprofits & Founders Forum',
                'description' => 'For new nonprofit founders and startup organizations',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Global Nonprofit Exchange (International Work)',
                'description' => 'For organizations working internationally',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Partnerships & Cross-Sector Collaboration',
                'description' => 'Building partnerships across sectors',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Data, Impact Measurement & Reporting',
                'description' => 'Measuring and reporting nonprofit impact',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Nonprofit Storytelling & Communications',
                'description' => 'Effective communication strategies for nonprofits',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'AI & Innovation for Nonprofits',
                'description' => 'Leveraging AI and innovation in the nonprofit sector',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Youth-Led Nonprofit Organizations',
                'description' => 'For organizations led by young people',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Women in Nonprofit Leadership',
                'description' => 'Supporting women leaders in the nonprofit sector',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ],
            [
                'name' => 'Corporate Social Responsibility Partnerships',
                'description' => 'Building partnerships between nonprofits and corporations',
                'type' => 'public',
                'created_by' => $userId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now
            ]
        ];

        // Insert all chat rooms
        ChatRoom::insert($chatRooms);
    }
}
