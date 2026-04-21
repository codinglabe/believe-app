<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class GiftOccasionSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        DB::table('gift_occasions')->upsert([
            ['id' => 1, 'occasion' => 'Birthday', 'icon' => '🎂', 'category' => 'Celebration', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 2, 'occasion' => 'Anniversary', 'icon' => '💍', 'category' => 'Celebration', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 3, 'occasion' => 'Wedding', 'icon' => '💒', 'category' => 'Celebration', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 4, 'occasion' => 'New Baby', 'icon' => '👶', 'category' => 'Celebration', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 5, 'occasion' => 'Graduation', 'icon' => '🎓', 'category' => 'Milestone', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 6, 'occasion' => 'Promotion', 'icon' => '📈', 'category' => 'Milestone', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 7, 'occasion' => 'New Job', 'icon' => '💼', 'category' => 'Milestone', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 8, 'occasion' => 'Achievement', 'icon' => '🏆', 'category' => 'Milestone', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 9, 'occasion' => 'Retirement', 'icon' => '🎉', 'category' => 'Milestone', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 10, 'occasion' => 'Prayer / Encouragement', 'icon' => '🙏', 'category' => 'Faith', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 11, 'occasion' => 'Get Well Soon', 'icon' => '💐', 'category' => 'Care', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 12, 'occasion' => 'Thinking of You', 'icon' => '💭', 'category' => 'Care', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 13, 'occasion' => 'Support', 'icon' => '🤝', 'category' => 'Care', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 14, 'occasion' => 'Sympathy', 'icon' => '🕊️', 'category' => 'Care', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 15, 'occasion' => 'Appreciation', 'icon' => '❤️', 'category' => 'Gratitude', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 16, 'occasion' => 'Thank You', 'icon' => '🙌', 'category' => 'Gratitude', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 17, 'occasion' => 'Volunteer Recognition', 'icon' => '🌟', 'category' => 'Gratitude', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 18, 'occasion' => 'Holiday Gift', 'icon' => '🎁', 'category' => 'Seasonal', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 19, 'occasion' => 'Christmas', 'icon' => '🎄', 'category' => 'Seasonal', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 20, 'occasion' => 'Easter', 'icon' => '✝️', 'category' => 'Seasonal', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 21, 'occasion' => 'Thanksgiving', 'icon' => '🦃', 'category' => 'Seasonal', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 22, 'occasion' => 'New Year', 'icon' => '🎆', 'category' => 'Seasonal', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 23, 'occasion' => 'Celebration', 'icon' => '🎉', 'category' => 'General', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 24, 'occasion' => 'Just Because', 'icon' => '⭐', 'category' => 'General', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 25, 'occasion' => 'Other', 'icon' => '➕', 'category' => 'General', 'created_at' => $now, 'updated_at' => $now],
        ], ['id'], ['occasion', 'icon', 'category', 'updated_at']);
    }
}
