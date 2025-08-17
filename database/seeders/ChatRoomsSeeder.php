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
        $userId = 1; // Assuming user with ID 1 is the admin/creator

        // Define the main topic categories
        $mainTopics = [
            'Educational' => [
                'description' => 'Groups focused on learning and knowledge sharing',
                'rooms' => [
                    'Education & Youth Services',
                    'Food Security & Hunger Relief',
                    'Affordable Housing & Homelessness',
                    'Mental Health Advocacy',
                    'Environmental Sustainability & Climate Justice',
                    'Healthcare Access & Wellness',
                    'Data, Impact Measurement & Reporting',
                    'AI & Innovation for Nonprofits',
                ]
            ],
            'Professional' => [
                'description' => 'Groups for career development and professional networking',
                'rooms' => [
                    'General Nonprofit Operations',
                    'Fundraising Strategies & Grants',
                    '501(c)(3) Compliance & Legal Help',
                    'Board Development & Governance',
                    'Nonprofit Tech & Digital Tools',
                    'CRM & Donor Management Systems',
                    'Nonprofit Finance & Accounting',
                    'Grant Writers United',
                    'Small Nonprofit Leadership Circle',
                    'Startup Nonprofits & Founders Forum',
                    'Global Nonprofit Exchange (International Work)',
                    'Partnerships & Cross-Sector Collaboration',
                    'Women in Nonprofit Leadership',
                    'Corporate Social Responsibility Partnerships',
                ]
            ],
            'Cultural' => [
                'description' => 'Groups focused on cultural exchange and diversity',
                'rooms' => [
                    'Racial Equity & Social Justice',
                    'Faith-Based Nonprofit Networks',
                    'Youth-Led Nonprofit Organizations',
                ]
            ],
            'Social' => [
                'description' => 'Groups for social interaction and community building',
                'rooms' => [
                    'Volunteer Recruitment & Retention',
                    'Marketing & Social Media for Nonprofits',
                    'Event Planning for Nonprofits',
                    'Animal Welfare & Rescue',
                    'Disaster Relief & Emergency Response',
                    'Nonprofit Storytelling & Communications',
                ]
            ]
        ];

        // First create all rooms with their descriptions
        $allRooms = [
            // General Nonprofit Operations
            'General Nonprofit Operations' => 'Discussions about general nonprofit management and operations',
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

        // First create all rooms
        foreach ($allRooms as $roomName => $description) {
            ChatRoom::updateOrCreate(
                ['name' => $roomName],
                [
                    'description' => $description,
                    'type' => 'public',
                    'created_by' => $userId,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now
                ]
            );
        }

        // Then create topics and associate rooms
        foreach ($mainTopics as $topicName => $topicData) {
            $topic = ChatTopic::updateOrCreate(
                ['name' => $topicName],
                [
                    'description' => $topicData['description'],
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now
                ]
            );

            foreach ($topicData['rooms'] as $roomName) {
                $room = ChatRoom::where('name', $roomName)->first();
                if ($room) {
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
    }
}
