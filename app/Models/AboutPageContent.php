<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AboutPageContent extends Model
{
    protected $fillable = ['content'];

    protected $casts = [
        'content' => 'array',
    ];

    public static function defaultContent(): array
    {
        return [
            'hero' => [
                'title' => 'About BELIEVE IN UNITY',
                'subtitle' => 'Connecting 1.8 Million Nonprofits into One Global Network',
                'description' => 'BELIEVE IN UNITY is a digital ecosystem where nonprofits, donors, volunteers, and changemakers come together to collaborate, learn, and grow. From fundraising and events to AI tools, education, and nonprofit news — everything your organization needs to thrive lives here.',
                'background_image' => null,
            ],
            'mission' => [
                'title' => 'Our Mission',
                'description' => 'To unite and empower nonprofits through connection, collaboration, and technology — creating a transparent, global space where giving becomes a shared experience.',
                'icon' => 'Target',
                'image' => '/images/nonprofits-working-together-global-network.jpg',
            ],
            'vision' => [
                'title' => 'Our Vision',
                'description' => 'A connected world where every cause has access to the tools, people, and resources it needs to succeed.',
                'icon' => 'Eye',
            ],
            'stats' => [
                ['label' => 'Verified Nonprofits', 'value' => '1.8M+', 'icon' => 'Users'],
                ['label' => 'Countries', 'value' => '85+', 'icon' => 'Globe'],
                ['label' => 'Lives Impacted', 'value' => '1M+', 'icon' => 'Heart'],
                ['label' => 'Years Active', 'value' => '8+', 'icon' => 'Award'],
            ],
            'offerings' => [
                [
                    'title' => 'Start or Grow Your Nonprofit',
                    'description' => 'Begin your nonprofit journey with confidence. Our guided system helps you establish, manage, and scale your organization with access to education, compliance tools, and community support.',
                    'tagline' => 'Empowering your purpose from day one.',
                    'icon' => 'Heart',
                ],
                [
                    'title' => 'Nonprofit Marketplace',
                    'description' => 'Buy and sell with purpose. List merchandise, services, and fundraising items that give back. Supporters can shop with confidence, knowing every purchase funds a meaningful mission.',
                    'tagline' => 'Every product tells a story.',
                    'icon' => 'ShoppingBag',
                ],
                [
                    'title' => 'Donations & Campaign Management',
                    'description' => 'Launch and manage donation campaigns with simplicity and transparency. Accept one-time or recurring donations, track progress in real time, and empower supporters with shareable donation links and updates.',
                    'tagline' => 'Fund your mission with trust.',
                    'icon' => 'DollarSign',
                ],
                [
                    'title' => 'Peer-to-Peer Communication',
                    'description' => 'Connect directly with other nonprofit leaders, donors, and volunteers. Message one-on-one or form private chat groups to brainstorm ideas, share insights, or collaborate across organizations.',
                    'tagline' => 'Connection fuels impact.',
                    'icon' => 'MessageCircle',
                ],
                [
                    'title' => 'Group Interest Channels',
                    'description' => 'Join or create groups based on shared causes and passions — from youth empowerment and education to healthcare, environment, and faith-based initiatives.',
                    'tagline' => 'Find your people. Grow your purpose.',
                    'icon' => 'Network',
                ],
                [
                    'title' => 'AI-Powered Tools & Newsletters',
                    'description' => 'Let AI do the heavy lifting. Generate donor thank-you notes, newsletters, campaign updates, and impact reports instantly — saving time while strengthening engagement.',
                    'tagline' => 'Work smarter. Inspire faster.',
                    'icon' => 'Brain',
                ],
                [
                    'title' => 'Courses & Virtual Events',
                    'description' => 'Learn, host, and engage through live or on-demand training. Our virtual classrooms help nonprofit teams sharpen their skills in leadership, fundraising, marketing, compliance, and impact storytelling.',
                    'tagline' => 'Education that builds legacies.',
                    'icon' => 'GraduationCap',
                ],
                [
                    'title' => 'Event Management',
                    'description' => 'Plan, promote, and manage events — from community drives to galas and webinars. Built-in registration, ticketing, and analytics tools help make every event count.',
                    'tagline' => 'Create moments that move people.',
                    'icon' => 'Calendar',
                ],
                [
                    'title' => 'Job & Volunteer Hub',
                    'description' => 'Where purpose meets opportunity. Organizations can post jobs, internships, or volunteer openings, while individuals can find meaningful work that changes lives.',
                    'tagline' => 'Because doing good is a full-time calling.',
                    'icon' => 'Briefcase',
                ],
                [
                    'title' => 'Nonprofit News & Insights',
                    'description' => 'Stay informed with the latest stories shaping the nonprofit world. We publish daily updates, articles, and interviews covering philanthropy trends & data, grant and funding opportunities, policy updates & IRS changes, and success stories from leading organizations.',
                    'tagline' => 'Because knowledge is power — and power creates impact.',
                    'icon' => 'Newspaper',
                ],
                [
                    'title' => 'Content & Community Hub',
                    'description' => 'Tell your story. Publish blogs, updates, and reports to inspire others and spotlight your impact. Engage with other nonprofits and supporters across a global feed of stories, campaigns, and news.',
                    'tagline' => 'Your voice matters. Share it.',
                    'icon' => 'FileText',
                ],
            ],
            'story' => [
                'title' => 'Our Story',
                'paragraphs' => [
                    'BELIEVE IN UNITY was born from a simple observation: while there are countless amazing non-profit organizations doing incredible work around the world, it\'s often difficult for people to discover and connect with causes that align with their values and passions.',
                    'Founded in 2016 by a team of former humanitarian workers and tech entrepreneurs, we set out to bridge this gap by creating a platform that makes charitable giving more transparent, accessible, and impactful.',
                    'Today, BELIEVE IN UNITY serves as a trusted bridge between generous hearts and worthy causes, helping millions of people make informed decisions about their charitable giving while supporting organizations in amplifying their impact and reaching new supporters.',
                ],
            ],
            'team' => [
                [
                    'name' => 'Sarah Johnson',
                    'role' => 'Founder & CEO',
                    'image' => '/placeholder.svg?height=300&width=300',
                    'bio' => 'Former UN humanitarian coordinator with 15+ years in non-profit sector',
                ],
                [
                    'name' => 'Michael Chen',
                    'role' => 'CTO',
                    'image' => '/placeholder.svg?height=300&width=300',
                    'bio' => 'Tech entrepreneur passionate about using technology for social good',
                ],
                [
                    'name' => 'Emily Rodriguez',
                    'role' => 'Head of Partnerships',
                    'image' => '/placeholder.svg?height=300&width=300',
                    'bio' => 'Expert in building strategic partnerships with global organizations',
                ],
            ],
            'values' => [
                [
                    'title' => 'Transparency',
                    'description' => 'We believe in complete transparency in how donations are used and the impact they create.',
                    'icon' => '🔍',
                ],
                [
                    'title' => 'Trust',
                    'description' => 'Every organization on our platform is thoroughly vetted to ensure legitimacy and impact.',
                    'icon' => '🤝',
                ],
                [
                    'title' => 'Impact',
                    'description' => 'We focus on measurable outcomes and real-world change in communities worldwide.',
                    'icon' => '🌍',
                ],
            ],
            'reasons' => [
                '1.8 Million Verified Nonprofits',
                '85+ Countries Represented',
                'Marketplace & Donation Integration',
                'Peer-to-Peer & Group Collaboration',
                'AI Tools for Automation & Growth',
                'Nonprofit News & Education Hub',
                'Courses, Events, and Global Network Access',
            ],
            'cta' => [
                'title' => 'Join the Movement',
                'subtitle' => null,
                'description' => 'Be part of a new era of nonprofit collaboration — one built on connection, trust, and unity. Create your profile today and start making a difference.',
                'buttons' => [
                    ['text' => 'Join the Community', 'href' => '/register', 'variant' => 'secondary'],
                    ['text' => 'Start a Campaign', 'href' => '/campaigns', 'variant' => 'outline'],
                    ['text' => 'Explore the Marketplace', 'href' => '/marketplace', 'variant' => 'outline'],
                ],
            ],
        ];
    }

    public function getContentOrDefault(): array
    {
        $defaults = self::defaultContent();
        $stored = $this->content ?? [];

        foreach ($defaults as $key => $defaultValue) {
            if (array_key_exists($key, $stored) && $stored[$key] !== null) {
                if (is_array($defaultValue)) {
                    $defaults[$key] = $stored[$key];
                } else {
                    $defaults[$key] = $stored[$key];
                }
            }
        }

        return $defaults;
    }

    public function getFrontendContent(): ?array
    {
        $content = $this->content;

        if (!$content || !is_array($content)) {
            return null;
        }

        $hero = array_merge([
            'title' => null,
            'subtitle' => null,
            'description' => null,
            'background_image' => null,
        ], $content['hero'] ?? []);
        $hero['background_image'] = $this->normalizeAssetUrl($hero['background_image'] ?? null);

        $mission = array_merge([
            'title' => null,
            'description' => null,
            'icon' => null,
            'image' => null,
        ], $content['mission'] ?? []);
        $mission['image'] = $this->normalizeAssetUrl($mission['image'] ?? null);

        $vision = array_merge([
            'title' => null,
            'description' => null,
            'icon' => null,
        ], $content['vision'] ?? []);

        $stats = array_values(array_filter($content['stats'] ?? [], static function ($stat) {
            return is_array($stat);
        }));

        $offerings = array_values(array_filter($content['offerings'] ?? [], static function ($item) {
            return is_array($item);
        }));

        $story = array_merge([
            'title' => null,
            'paragraphs' => [],
        ], $content['story'] ?? []);
        $story['paragraphs'] = array_values(array_filter($story['paragraphs'] ?? [], static function ($paragraph) {
            return is_string($paragraph) && $paragraph !== '';
        }));

        $team = array_values(array_map(function ($member) {
            $member = is_array($member) ? $member : [];

            return [
                'name' => $member['name'] ?? '',
                'role' => $member['role'] ?? null,
                'image' => $this->normalizeAssetUrl($member['image'] ?? null),
                'bio' => $member['bio'] ?? null,
            ];
        }, array_filter($content['team'] ?? [], static function ($member) {
            return is_array($member);
        })));

        $values = array_values(array_filter($content['values'] ?? [], static function ($value) {
            return is_array($value);
        }));

        $reasons = array_values(array_filter($content['reasons'] ?? [], static function ($reason) {
            return !empty($reason);
        }));

        $cta = array_merge([
            'title' => null,
            'subtitle' => null,
            'description' => null,
            'buttons' => [],
        ], $content['cta'] ?? []);
        $cta['buttons'] = array_values(array_filter($cta['buttons'] ?? [], static function ($button) {
            return is_array($button) && !empty($button['text']);
        }));

        return [
            'hero' => $hero,
            'mission' => $mission,
            'vision' => $vision,
            'stats' => $stats,
            'offerings' => $offerings,
            'story' => $story,
            'team' => $team,
            'values' => $values,
            'reasons' => $reasons,
            'cta' => $cta,
        ];
    }

    private function normalizeAssetUrl(?string $value): ?string
    {
        if (!$value || !is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        if ($trimmed === '') {
            return null;
        }

        if (Str::startsWith($trimmed, ['http://', 'https://', '//', 'data:'])) {
            return $trimmed;
        }

        $normalized = ltrim($trimmed, '/');

        if (Str::startsWith($normalized, 'storage/')) {
            $relative = Str::after($normalized, 'storage/');
            return Storage::url($relative);
        }

        if (Str::startsWith($normalized, 'about/')) {
            return Storage::url($normalized);
        }

        return '/' . $normalized;
    }
}

