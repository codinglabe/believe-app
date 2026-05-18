<?php

namespace Database\Seeders;

use App\Models\CommunityVideo;
use App\Models\Organization;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CommunityVideosSeeder extends Seeder
{
    public function run(): void
    {
        $org = Organization::query()->first();
        $orgId = $org?->id ?? null;

        $videos = [
            [
                'title' => 'Giving Back: Community Clean-Up Day',
                'description' => 'Join us for a day of cleaning up our local parks and green spaces. Volunteers from across the community came together to make a difference.',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1280&q=80',
                'video_url' => null,
                'duration_seconds' => 23 * 60 + 45,
                'views' => 53431,
                'likes' => 345,
                'category' => 'events',
                'is_featured' => true,
            ],
            [
                'title' => 'Food Drive for Local Families',
                'description' => 'Our monthly food drive helps hundreds of families in need.',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=320&q=80',
                'duration_seconds' => 7 * 60 + 25,
                'views' => 8942,
                'likes' => 128,
                'category' => 'events',
            ],
            [
                'title' => 'Building Homes for Veterans',
                'description' => 'Partnering with American Heroes Foundation to build safe housing for veterans.',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=320&q=80',
                'duration_seconds' => 8 * 60 + 46,
                'views' => 15221,
                'likes' => 256,
                'category' => 'impact',
            ],
            [
                'title' => 'Animal Shelter Adoption Event',
                'description' => 'Adoption day at Austin Animal Rescue – find your new best friend.',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=320&q=80',
                'duration_seconds' => 5 * 60 + 14,
                'views' => 12305,
                'likes' => 189,
                'category' => 'events',
            ],
            [
                'title' => 'Planting Trees in the Park',
                'description' => 'Green Community Org tree-planting initiative.',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=320&q=80',
                'duration_seconds' => 4 * 60 + 2,
                'views' => 6102,
                'likes' => 92,
                'category' => 'impact',
            ],
            [
                'title' => 'Youth Mentorship Program',
                'description' => 'Future Leaders Inc mentorship program highlights.',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=320&q=80',
                'duration_seconds' => 3 * 60 + 55,
                'views' => 9876,
                'likes' => 201,
                'category' => 'stories',
            ],
            [
                'title' => 'Beach Clean-Up Crew',
                'description' => 'Ocean Care Alliance beach cleanup day.',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=320&q=80',
                'duration_seconds' => 6 * 60 + 37,
                'views' => 11234,
                'likes' => 167,
                'category' => 'events',
            ],
        ];

        foreach ($videos as $i => $data) {
            $slug = Str::slug($data['title']) . '-' . ($i + 1);
            CommunityVideo::updateOrCreate(
                ['slug' => $slug],
                array_merge($data, [
                    'slug' => $slug,
                    'organization_id' => $orgId,
                    'user_id' => null,
                ])
            );
        }
    }
}
