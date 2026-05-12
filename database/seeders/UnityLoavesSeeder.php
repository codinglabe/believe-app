<?php

namespace Database\Seeders;

use App\Models\UnityLoavesImpactStat;
use App\Models\UnityLoavesLocation;
use Illuminate\Database\Seeder;

class UnityLoavesSeeder extends Seeder
{
    public function run(): void
    {
        $locations = $this->locationData();

        foreach ($locations as $data) {
            $schedules = $data['schedules'];
            $needs     = $data['needs'];
            $impact    = $data['impact'];
            unset($data['schedules'], $data['needs'], $data['impact']);

            $loc = UnityLoavesLocation::create($data);

            foreach ($schedules as $s) {
                $loc->schedules()->create($s);
            }
            foreach ($needs as $n) {
                $loc->needs()->create($n);
            }

            UnityLoavesImpactStat::create(array_merge($impact, [
                'location_id'  => $loc->id,
                'last_updated' => now(),
            ]));
        }
    }

    private function locationData(): array
    {
        return [
            [
                'name' => 'First Baptist Church Pantry',
                'description' => 'Serving Orlando for over 25 years with nutritious groceries for families in need.',
                'address' => '123 Hope St', 'city' => 'Orlando', 'state' => 'FL', 'zip' => '32801',
                'latitude' => 28.5383355, 'longitude' => -81.3792365,
                'phone' => '(407) 555-0101', 'website' => 'https://firstbaptistorlando.example.com',
                'image_url' => null, 'meal_type' => 'food_pantry',
                'accepts_food_donations' => true,
                'dropoff_instructions' => 'Bring non-perishable items to the side entrance 9 AM–2 PM weekdays.',
                'is_active' => true,
                'schedules' => [
                    ['schedule_type'=>'meal','title'=>'Food Pantry Distribution','day_of_week'=>'wednesday','start_time'=>'10:00','end_time'=>'13:00','recurrence_text'=>'Every Wednesday'],
                    ['schedule_type'=>'meal','title'=>'Saturday Pantry','day_of_week'=>'saturday','start_time'=>'09:00','end_time'=>'12:00','recurrence_text'=>'Every Saturday'],
                    ['schedule_type'=>'dropoff','title'=>'Food Donation Drop-off','day_of_week'=>null,'start_time'=>'09:00','end_time'=>'14:00','recurrence_text'=>'Monday–Friday'],
                    ['schedule_type'=>'service','title'=>'Sunday Worship Service','day_of_week'=>'sunday','start_time'=>'10:30','end_time'=>'12:00','recurrence_text'=>'Every Sunday'],
                    ['schedule_type'=>'service','title'=>'Bible Study','day_of_week'=>'wednesday','start_time'=>'19:00','end_time'=>'20:30','recurrence_text'=>'Every Wednesday'],
                    ['schedule_type'=>'service','title'=>'Youth Program','day_of_week'=>'friday','start_time'=>'18:30','end_time'=>'20:00','recurrence_text'=>'Every Friday'],
                ],
                'needs' => [
                    ['item_name'=>'Canned vegetables','category'=>'canned_goods','priority_level'=>'high','quantity_needed'=>200],
                    ['item_name'=>'Rice (5 lb bags)','category'=>'grains','priority_level'=>'high','quantity_needed'=>100],
                    ['item_name'=>'Peanut butter','category'=>'protein','priority_level'=>'urgent','quantity_needed'=>150],
                    ['item_name'=>'Cereal boxes','category'=>'breakfast','priority_level'=>'medium','quantity_needed'=>80],
                ],
                'impact' => ['loaves_served'=>1250,'families_helped'=>340,'total_loaves_year'=>14800],
            ],
            [
                'name' => 'Grace Community Kitchen',
                'description' => 'Freshly prepared hot meals for anyone who walks through our doors. No questions asked.',
                'address' => '456 Grace Ave', 'city' => 'Orlando', 'state' => 'FL', 'zip' => '32803',
                'latitude' => 28.5500000, 'longitude' => -81.3600000,
                'phone' => '(407) 555-0202', 'website' => 'https://gracecommunitykitchen.example.com',
                'image_url' => null, 'meal_type' => 'hot_meals',
                'accepts_food_donations' => true,
                'dropoff_instructions' => 'Drop off fresh produce and canned goods at the kitchen entrance.',
                'is_active' => true,
                'schedules' => [
                    ['schedule_type'=>'meal','title'=>'Hot Lunch Service','day_of_week'=>'tuesday','start_time'=>'11:30','end_time'=>'13:30','recurrence_text'=>'Every Tuesday'],
                    ['schedule_type'=>'meal','title'=>'Hot Lunch Service','day_of_week'=>'thursday','start_time'=>'11:30','end_time'=>'13:30','recurrence_text'=>'Every Thursday'],
                    ['schedule_type'=>'dropoff','title'=>'Food Donations','day_of_week'=>null,'start_time'=>'08:00','end_time'=>'16:00','recurrence_text'=>'Monday–Saturday'],
                    ['schedule_type'=>'service','title'=>'Community Meal','day_of_week'=>'tuesday','start_time'=>'17:30','end_time'=>'19:00','recurrence_text'=>'Every Tuesday'],
                    ['schedule_type'=>'service','title'=>'Prayer Meeting','day_of_week'=>'thursday','start_time'=>'18:30','end_time'=>'19:30','recurrence_text'=>'Every Thursday'],
                ],
                'needs' => [
                    ['item_name'=>'Fresh vegetables','category'=>'produce','priority_level'=>'urgent','quantity_needed'=>300],
                    ['item_name'=>'Cooking oil','category'=>'cooking','priority_level'=>'high','quantity_needed'=>50],
                    ['item_name'=>'Bread loaves','category'=>'bakery','priority_level'=>'high','quantity_needed'=>100],
                ],
                'impact' => ['loaves_served'=>2100,'families_helped'=>580,'total_loaves_year'=>24500],
            ],
            [
                'name' => 'New Hope Fellowship Meal Center',
                'description' => 'Partnered with local farms to rescue surplus food and serve community meals.',
                'address' => '789 Unity Blvd', 'city' => 'Tampa', 'state' => 'FL', 'zip' => '33602',
                'latitude' => 27.9506000, 'longitude' => -82.4572000,
                'phone' => '(813) 555-0303', 'website' => 'https://newhopetampa.example.com',
                'image_url' => null, 'meal_type' => 'community_meal',
                'accepts_food_donations' => true,
                'dropoff_instructions' => 'Donations accepted at fellowship hall during business hours.',
                'is_active' => true,
                'schedules' => [
                    ['schedule_type'=>'meal','title'=>'Community Dinner','day_of_week'=>'friday','start_time'=>'17:00','end_time'=>'19:00','recurrence_text'=>'Every Friday'],
                    ['schedule_type'=>'meal','title'=>'Sunday Brunch','day_of_week'=>'sunday','start_time'=>'11:00','end_time'=>'13:00','recurrence_text'=>'Every Sunday'],
                    ['schedule_type'=>'dropoff','title'=>'Food Donation Hours','day_of_week'=>null,'start_time'=>'09:00','end_time'=>'17:00','recurrence_text'=>'Monday–Friday'],
                    ['schedule_type'=>'service','title'=>'Clothing Closet','day_of_week'=>'saturday','start_time'=>'09:00','end_time'=>'12:00','recurrence_text'=>'2nd & 4th Saturday'],
                ],
                'needs' => [
                    ['item_name'=>'Canned soup','category'=>'canned_goods','priority_level'=>'high','quantity_needed'=>250],
                    ['item_name'=>'Diapers','category'=>'hygiene','priority_level'=>'urgent','quantity_needed'=>500],
                ],
                'impact' => ['loaves_served'=>890,'families_helped'=>210,'total_loaves_year'=>10200],
            ],
            [
                'name' => 'Harvest Table Ministries',
                'description' => 'Hot meals six days a week alongside a take-home pantry for families.',
                'address' => '321 Harvest Ln', 'city' => 'Jacksonville', 'state' => 'FL', 'zip' => '32202',
                'latitude' => 30.3322000, 'longitude' => -81.6557000,
                'phone' => '(904) 555-0404', 'website' => 'https://harvesttable.example.com',
                'image_url' => null, 'meal_type' => 'hot_meals',
                'accepts_food_donations' => false, 'dropoff_instructions' => null, 'is_active' => true,
                'schedules' => [
                    ['schedule_type'=>'meal','title'=>'Daily Hot Lunch','day_of_week'=>'monday','start_time'=>'11:00','end_time'=>'13:00','recurrence_text'=>'Monday–Saturday'],
                    ['schedule_type'=>'service','title'=>'Sunday Worship','day_of_week'=>'sunday','start_time'=>'10:00','end_time'=>'11:30','recurrence_text'=>'Every Sunday'],
                ],
                'needs' => [
                    ['item_name'=>'Canned tuna','category'=>'protein','priority_level'=>'high','quantity_needed'=>180],
                ],
                'impact' => ['loaves_served'=>3400,'families_helped'=>920,'total_loaves_year'=>41000],
            ],
            [
                'name' => 'Bread of Life Food Bank',
                'description' => 'Distributing thousands of pounds of food monthly across Miami-Dade County.',
                'address' => '555 Mercy Way', 'city' => 'Miami', 'state' => 'FL', 'zip' => '33130',
                'latitude' => 25.7617000, 'longitude' => -80.1918000,
                'phone' => '(305) 555-0505', 'website' => 'https://breadoflifemiami.example.com',
                'image_url' => null, 'meal_type' => 'food_pantry',
                'accepts_food_donations' => true,
                'dropoff_instructions' => 'Drive up to the loading dock at the rear. Tax receipts provided.',
                'is_active' => true,
                'schedules' => [
                    ['schedule_type'=>'meal','title'=>'Pantry Distribution','day_of_week'=>'monday','start_time'=>'09:00','end_time'=>'14:00','recurrence_text'=>'Every Monday'],
                    ['schedule_type'=>'meal','title'=>'Pantry Distribution','day_of_week'=>'thursday','start_time'=>'09:00','end_time'=>'14:00','recurrence_text'=>'Every Thursday'],
                    ['schedule_type'=>'dropoff','title'=>'Donation Drop-off','day_of_week'=>null,'start_time'=>'07:00','end_time'=>'15:00','recurrence_text'=>'Monday–Friday'],
                ],
                'needs' => [
                    ['item_name'=>'Rice (10 lb bags)','category'=>'grains','priority_level'=>'urgent','quantity_needed'=>400],
                    ['item_name'=>'Baby formula','category'=>'baby','priority_level'=>'urgent','quantity_needed'=>100],
                    ['item_name'=>'Toiletries','category'=>'hygiene','priority_level'=>'high','quantity_needed'=>300],
                ],
                'impact' => ['loaves_served'=>5200,'families_helped'=>1450,'total_loaves_year'=>62000],
            ],
            [
                'name' => "Shepherd's Gate Community Center",
                'description' => 'More than a pantry — meals, clothing, job training, and youth programs.',
                'address' => '900 Shepherd Rd', 'city' => 'Orlando', 'state' => 'FL', 'zip' => '32806',
                'latitude' => 28.5200000, 'longitude' => -81.3700000,
                'phone' => '(407) 555-0606', 'website' => 'https://shepherdsgate.example.com',
                'image_url' => null, 'meal_type' => 'community_meal',
                'accepts_food_donations' => true,
                'dropoff_instructions' => 'Bring donations to the lobby during open hours.',
                'is_active' => true,
                'schedules' => [
                    ['schedule_type'=>'meal','title'=>'Community Lunch','day_of_week'=>'wednesday','start_time'=>'12:00','end_time'=>'14:00','recurrence_text'=>'Every Wednesday'],
                    ['schedule_type'=>'meal','title'=>'Saturday Breakfast','day_of_week'=>'saturday','start_time'=>'08:00','end_time'=>'10:00','recurrence_text'=>'Every Saturday'],
                    ['schedule_type'=>'dropoff','title'=>'Donation Hours','day_of_week'=>null,'start_time'=>'10:00','end_time'=>'16:00','recurrence_text'=>'Tuesday–Saturday'],
                    ['schedule_type'=>'service','title'=>'Youth Program','day_of_week'=>'friday','start_time'=>'16:00','end_time'=>'18:00','recurrence_text'=>'Every Friday'],
                    ['schedule_type'=>'service','title'=>'Clothing Closet','day_of_week'=>'saturday','start_time'=>'09:00','end_time'=>'12:00','recurrence_text'=>'1st & 3rd Saturday'],
                ],
                'needs' => [
                    ['item_name'=>'Canned goods (assorted)','category'=>'canned_goods','priority_level'=>'high','quantity_needed'=>500],
                    ['item_name'=>'Fresh fruit','category'=>'produce','priority_level'=>'urgent','quantity_needed'=>200],
                    ['item_name'=>'Blankets','category'=>'household','priority_level'=>'high','quantity_needed'=>75],
                ],
                'impact' => ['loaves_served'=>1800,'families_helped'=>490,'total_loaves_year'=>21600],
            ],
        ];
    }
}
