<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SellerSkillsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $skills = [
            'Agile project coordination',
            'AI process integration',
            'API integration support',
            'Audit readiness support',
            'Automation workflows',
            'Brand development',
            'Brand messaging alignment',
            'Budget forecasting',
            'Business development',
            'Campaign performance analysis',
            'Cash flow tracking',
            'Change management support',
            'Client onboarding',
            'Cloud infrastructure planning',
            'Coaching and mentoring',
            'Community engagement',
            'Community outreach',
            'Competitive analysis',
            'Compliance documentation',
            'Conflict resolution',
            'Content creation',
            'Contract negotiation',
            'Copywriting',
            'Creative brief drafting',
            'CRM administration',
            'Cross-cultural communication',
            'Cybersecurity awareness',
            'Data analytics',
            'Database structuring',
            'Decision support analysis',
            'Digital marketing execution',
            'Email campaign setup',
            'Ethical governance guidance',
            'Executive communication',
            'Financial modeling',
            'Fundraising coordination',
            'Grant writing',
            'Impact measurement',
            'Investor communications',
            'Market research',
            'Negotiation support',
            'Nonprofit compliance support',
            'Operational reporting',
            'Operations management',
            'Organizational structuring',
            'Partnership outreach',
            'Payment systems integration',
            'Performance tracking',
            'Podcast production support',
            'Presentation design',
            'Process documentation',
            'Process optimization',
            'Product roadmapping',
            'Program development',
            'Public relations outreach',
            'Quality assurance review',
            'Reporting dashboards',
            'Resource allocation',
            'Risk assessment',
            'Social enterprise planning',
            'Social media management',
            'Software requirements gathering',
            'Stakeholder management',
            'Storytelling development',
            'Strategic planning',
            'System architecture review',
            'Tax documentation preparation',
            'Team leadership',
            'Timeline planning',
            'User acceptance testing',
            'UX/UI review',
            'Vendor coordination',
            'Video coordination',
            'Volunteer coordination',
            'Workshop facilitation',
        ];

        foreach ($skills as $skill) {
            \App\Models\SellerSkill::create(['name' => $skill]);
        }
    }
}
