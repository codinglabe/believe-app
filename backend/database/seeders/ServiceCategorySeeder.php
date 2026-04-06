<?php

namespace Database\Seeders;

use App\Models\ServiceCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ServiceCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * This seeder creates all service categories from the comprehensive list,
     * with a single "Other" option at the end.
     */
    public function run(): void
    {
        $categories = [
            // Legal Services
            ['name' => 'Business Formation (LLC/Corp Setup)', 'description' => 'Help with forming LLCs, corporations, and other business entities', 'sort_order' => 1],
            ['name' => 'Contract Drafting', 'description' => 'Professional contract drafting services', 'sort_order' => 2],
            ['name' => 'Contract Review', 'description' => 'Expert contract review and analysis', 'sort_order' => 3],
            ['name' => 'Terms & Conditions / Privacy Policy', 'description' => 'Drafting terms of service and privacy policies', 'sort_order' => 4],
            ['name' => 'Employment Agreements', 'description' => 'Employment contract drafting and review', 'sort_order' => 5],
            ['name' => 'Trademark Filing', 'description' => 'Trademark registration and filing services', 'sort_order' => 6],
            ['name' => 'Compliance Audit', 'description' => 'Business compliance auditing services', 'sort_order' => 7],

            // Accounting & Finance
            ['name' => 'Bookkeeping', 'description' => 'Professional bookkeeping services', 'sort_order' => 8],
            ['name' => 'Payroll Setup', 'description' => 'Payroll system setup and management', 'sort_order' => 9],
            ['name' => 'Tax Preparation', 'description' => 'Tax preparation and filing services', 'sort_order' => 10],
            ['name' => 'Financial Statements', 'description' => 'Financial statement preparation and analysis', 'sort_order' => 11],
            ['name' => 'Budgeting & Forecasting', 'description' => 'Budget creation and financial forecasting', 'sort_order' => 12],
            ['name' => 'Audit Preparation', 'description' => 'Audit preparation and support services', 'sort_order' => 13],
            ['name' => 'CFO Advisory', 'description' => 'Chief Financial Officer advisory services', 'sort_order' => 14],

            // Marketing
            ['name' => 'Brand Strategy', 'description' => 'Brand strategy and positioning services', 'sort_order' => 15],
            ['name' => 'Logo Design', 'description' => 'Professional logo design services', 'sort_order' => 16],
            ['name' => 'Website Copywriting', 'description' => 'Website content and copywriting services', 'sort_order' => 17],
            ['name' => 'Ad Campaign Management', 'description' => 'Advertising campaign management and optimization', 'sort_order' => 18],
            ['name' => 'SEO Optimization', 'description' => 'Search engine optimization services', 'sort_order' => 19],
            ['name' => 'Email Marketing Content', 'description' => 'Email marketing content creation', 'sort_order' => 20],
            ['name' => 'Social Media Content', 'description' => 'Social media content creation and management', 'sort_order' => 21],

            // Sales
            ['name' => 'Lead Generation', 'description' => 'Lead generation and prospecting services', 'sort_order' => 22],
            ['name' => 'CRM Setup', 'description' => 'Customer Relationship Management system setup', 'sort_order' => 23],
            ['name' => 'Sales Funnel Design', 'description' => 'Sales funnel design and optimization', 'sort_order' => 24],
            ['name' => 'Cold Outreach Campaigns', 'description' => 'Cold outreach and prospecting campaigns', 'sort_order' => 25],
            ['name' => 'Customer Retention Strategy', 'description' => 'Customer retention strategy development', 'sort_order' => 26],
            ['name' => 'Sales Scripts', 'description' => 'Sales script writing and development', 'sort_order' => 27],

            // Technology
            ['name' => 'Website Development', 'description' => 'Website development and design services', 'sort_order' => 28],
            ['name' => 'E-commerce Store Setup', 'description' => 'E-commerce platform setup and configuration', 'sort_order' => 29],
            ['name' => 'Mobile App Development', 'description' => 'Mobile application development services', 'sort_order' => 30],
            ['name' => 'API Integration', 'description' => 'API integration and development services', 'sort_order' => 31],
            ['name' => 'Cybersecurity Assessment', 'description' => 'Cybersecurity assessment and consulting', 'sort_order' => 32],
            ['name' => 'Cloud Infrastructure Setup', 'description' => 'Cloud infrastructure setup and migration', 'sort_order' => 33],
            ['name' => 'Technical Documentation', 'description' => 'Technical documentation writing services', 'sort_order' => 34],

            // Operations
            ['name' => 'Virtual Assistant Services', 'description' => 'Virtual assistant and administrative support', 'sort_order' => 35],
            ['name' => 'Process Documentation', 'description' => 'Business process documentation services', 'sort_order' => 36],
            ['name' => 'Workflow Automation', 'description' => 'Workflow automation and optimization', 'sort_order' => 37],
            ['name' => 'Vendor Management', 'description' => 'Vendor management and procurement services', 'sort_order' => 38],
            ['name' => 'Project Management', 'description' => 'Project management and coordination services', 'sort_order' => 39],
            ['name' => 'Business SOPs', 'description' => 'Standard Operating Procedures development', 'sort_order' => 40],

            // Design
            ['name' => 'Graphic Design', 'description' => 'Graphic design services', 'sort_order' => 41],
            ['name' => 'UI/UX Design', 'description' => 'User interface and user experience design', 'sort_order' => 42],
            ['name' => 'Presentation Design', 'description' => 'Presentation design and creation', 'sort_order' => 43],
            ['name' => 'Packaging Design', 'description' => 'Product packaging design services', 'sort_order' => 44],
            ['name' => 'Illustrations', 'description' => 'Illustration and artwork services', 'sort_order' => 45],
            ['name' => 'Brand Guidelines', 'description' => 'Brand guideline development and documentation', 'sort_order' => 46],

            // Media Production
            ['name' => 'Video Production', 'description' => 'Video production services', 'sort_order' => 47],
            ['name' => 'Video Editing', 'description' => 'Video editing and post-production services', 'sort_order' => 48],
            ['name' => 'Photography', 'description' => 'Professional photography services', 'sort_order' => 49],
            ['name' => 'Podcast Editing', 'description' => 'Podcast editing and production services', 'sort_order' => 50],
            ['name' => 'Voiceover Recording', 'description' => 'Voiceover recording and production', 'sort_order' => 51],
            ['name' => 'Motion Graphics', 'description' => 'Motion graphics and animation services', 'sort_order' => 52],

            // Human Resources
            ['name' => 'Recruitment Services', 'description' => 'Recruitment and talent acquisition services', 'sort_order' => 53],
            ['name' => 'Job Description Writing', 'description' => 'Job description writing and optimization', 'sort_order' => 54],
            ['name' => 'Employee Handbook', 'description' => 'Employee handbook development', 'sort_order' => 55],
            ['name' => 'Performance Management Setup', 'description' => 'Performance management system setup', 'sort_order' => 56],
            ['name' => 'HR Compliance Consulting', 'description' => 'HR compliance and consulting services', 'sort_order' => 57],
            ['name' => 'Training Materials', 'description' => 'Training material development and creation', 'sort_order' => 58],

            // Consulting
            ['name' => 'Business Strategy Consulting', 'description' => 'Business strategy and consulting services', 'sort_order' => 59],
            ['name' => 'Market Research', 'description' => 'Market research and analysis services', 'sort_order' => 60],
            ['name' => 'Competitive Analysis', 'description' => 'Competitive analysis and benchmarking', 'sort_order' => 61],
            ['name' => 'Go-to-Market Strategy', 'description' => 'Go-to-market strategy development', 'sort_order' => 62],
            ['name' => 'Pitch Deck Creation', 'description' => 'Pitch deck design and creation', 'sort_order' => 63],
            ['name' => 'Operations Scaling Strategy', 'description' => 'Operations scaling and growth strategy', 'sort_order' => 64],

            // Other (Single option at the end)
            ['name' => 'Other', 'description' => 'Other services not listed above', 'sort_order' => 999],
        ];

        foreach ($categories as $category) {
            $slug = Str::slug($category['name']);

            ServiceCategory::updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $category['name'],
                    'slug' => $slug,
                    'description' => $category['description'],
                    'sort_order' => $category['sort_order'],
                    'is_active' => true,
                ]
            );
        }

        $this->command->info('Service categories seeded successfully!');
    }
}
