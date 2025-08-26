<?php

namespace Database\Seeders;

use App\Models\ChatRoom;
use App\Models\ChatTopic;
use App\Models\ChatRoomTopic;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class ChatRoomsSeeder extends Seeder
{
    public function run()
    {
        $now = Carbon::now();
        $userId = 1; // Assuming user with ID 9 is the admin/creator

        // Define all topics with their descriptions
        $topics = [
            // General Nonprofit Operations
            'Fundraising Strategies & Grants' => 'Share and learn about fundraising techniques and grant opportunities',
            '501(c)(3) Compliance & Legal Help' => 'Discuss legal compliance and 501(c)(3) requirements',
            'Board Development & Governance' => 'Topics related to nonprofit board management and governance',
            'Volunteer Recruitment & Retention' => 'Strategies for finding and keeping great volunteers',
            'Marketing & Social Media for Nonprofits' => 'Promoting your nonprofit through marketing and social media',
            'Nonprofit Tech & Digital Tools' => 'Technology solutions for nonprofit organizations',
            'CRM & Donor Management Systems' => 'Discussion about donor management and CRM systems',
            'Nonprofit Finance & Accounting' => 'Financial management for nonprofit organizations',
            'Grant Writers United' => 'For professional grant writers to share tips and opportunities',
            'Event Planning for Nonprofits' => 'Planning and executing successful nonprofit events',

            // Cause-Specific Groups
            'Education & Youth Services' => 'For organizations focused on education and youth development',
            'Food Security & Hunger Relief' => 'Organizations working to combat hunger and improve food security',
            'Affordable Housing & Homelessness' => 'Addressing housing issues and homelessness',
            'Mental Health Advocacy' => 'For mental health organizations and advocates',
            'Environmental Sustainability & Climate Justice' => 'Environmental organizations and climate action groups',
            'Racial Equity & Social Justice' => 'Organizations working toward racial equity and social justice',
            'Healthcare Access & Wellness' => 'Nonprofits focused on healthcare access and wellness programs',
            'Animal Welfare & Rescue' => 'For animal rescue and welfare organizations',
            'Disaster Relief & Emergency Response' => 'Organizations involved in disaster response and emergency relief',
            'Faith-Based Nonprofit Networks' => 'For faith-based organizations to connect and collaborate',

            // Capacity-Building & Collaboration
            'Small Nonprofit Leadership Circle' => 'For leaders of small nonprofit organizations',
            'Startup Nonprofits & Founders Forum' => 'For new nonprofit founders and startup organizations',
            'Global Nonprofit Exchange (International Work)' => 'For organizations working internationally',
            'Partnerships & Cross-Sector Collaboration' => 'Building partnerships across sectors',
            'Data, Impact Measurement & Reporting' => 'Measuring and reporting nonprofit impact',
            'Nonprofit Storytelling & Communications' => 'Effective communication strategies for nonprofits',
            'AI & Innovation for Nonprofits' => 'Leveraging AI and innovation in the nonprofit sector',
            'Youth-Led Nonprofit Organizations' => 'For organizations led by young people',
            'Women in Nonprofit Leadership' => 'Supporting women leaders in the nonprofit sector',
            'Corporate Social Responsibility Partnerships' => 'Building partnerships between nonprofits and corporations',
        ];

        foreach ($topics as $name => $description) {
            // Create or update the topic
            $topic = ChatTopic::updateOrCreate(
                ['name' => $name],
                [
                    'description' => $description,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now
                ]
            );

            // Create or update the corresponding chat room
            $room = ChatRoom::updateOrCreate(
                ['name' => $name],
                [
                    'description' => $description,
                    'type' => 'public',
                    'created_by' => $userId,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now
                ]
            );

            // Create the relationship between topic and room
            ChatRoomTopic::updateOrCreate(
                [
                    'chat_room_id' => $room->id,
                    'topic_id' => $topic->id
                ],
                [
                    'created_at' => $now,
                    'updated_at' => $now
                ]
            );
        }
    }
}
