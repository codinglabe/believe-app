<?php

namespace Database\Seeders;

use App\Models\EventType;
use Illuminate\Database\Seeder;

class EventTypesTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $eventTypes = [
            // Corporate Events
            ['name' => 'Conferences', 'category' => 'Corporate Events', 'description' => 'Large-scale business conferences and industry events'],
            ['name' => 'Seminars', 'category' => 'Corporate Events', 'description' => 'Educational seminars and training sessions'],
            ['name' => 'Workshops', 'category' => 'Corporate Events', 'description' => 'Hands-on workshops and skill-building sessions'],
            ['name' => 'Product Launches', 'category' => 'Corporate Events', 'description' => 'New product and service launch events'],
            ['name' => 'Corporate Retreats', 'category' => 'Corporate Events', 'description' => 'Team building and corporate retreats'],
            ['name' => 'Networking Events', 'category' => 'Corporate Events', 'description' => 'Professional networking and business mixers'],
            ['name' => 'Training Sessions', 'category' => 'Corporate Events', 'description' => 'Employee training and development sessions'],
            ['name' => 'Annual General Meetings (AGMs)', 'category' => 'Corporate Events', 'description' => 'Annual shareholder and stakeholder meetings'],
            ['name' => 'Team Building Events', 'category' => 'Corporate Events', 'description' => 'Team building and collaboration activities'],
            ['name' => 'Exhibitions/Fairs', 'category' => 'Corporate Events', 'description' => 'Trade shows and business exhibitions'],

            // Social Events
            ['name' => 'Weddings', 'category' => 'Social Events', 'description' => 'Wedding ceremonies and receptions'],
            ['name' => 'Birthday Parties', 'category' => 'Social Events', 'description' => 'Birthday celebrations and parties'],
            ['name' => 'Anniversaries', 'category' => 'Social Events', 'description' => 'Anniversary celebrations'],
            ['name' => 'Baby Showers', 'category' => 'Social Events', 'description' => 'Baby shower celebrations'],
            ['name' => 'Graduation Parties', 'category' => 'Social Events', 'description' => 'Graduation celebrations'],
            ['name' => 'Holiday Parties', 'category' => 'Social Events', 'description' => 'Holiday and seasonal celebrations'],
            ['name' => 'Reunions', 'category' => 'Social Events', 'description' => 'Family and class reunions'],
            ['name' => 'Barbecues/Cookouts', 'category' => 'Social Events', 'description' => 'Outdoor cooking and social gatherings'],
            ['name' => 'Housewarming Parties', 'category' => 'Social Events', 'description' => 'Housewarming celebrations'],
            ['name' => 'Engagement Parties', 'category' => 'Social Events', 'description' => 'Engagement celebrations'],

            // Fundraising Events
            ['name' => 'Charity Galas', 'category' => 'Fundraising Events', 'description' => 'Formal charity fundraising galas'],
            ['name' => 'Silent Auctions', 'category' => 'Fundraising Events', 'description' => 'Silent auction fundraising events'],
            ['name' => 'Walkathons', 'category' => 'Fundraising Events', 'description' => 'Charity walkathons and runs'],
            ['name' => 'Concerts for a Cause', 'category' => 'Fundraising Events', 'description' => 'Benefit concerts and musical events'],
            ['name' => 'Charity Dinners', 'category' => 'Fundraising Events', 'description' => 'Charity dinner events'],
            ['name' => 'Crowdfunding Campaigns', 'category' => 'Fundraising Events', 'description' => 'Crowdfunding and online fundraising'],
            ['name' => 'Raffles', 'category' => 'Fundraising Events', 'description' => 'Raffle and lottery fundraising events'],
            ['name' => 'Volunteer Days', 'category' => 'Fundraising Events', 'description' => 'Volunteer service days'],
            ['name' => 'Benefit Events', 'category' => 'Fundraising Events', 'description' => 'General benefit and fundraising events'],
            ['name' => 'Corporate Sponsorship Events', 'category' => 'Fundraising Events', 'description' => 'Corporate sponsorship and partnership events'],

            // Educational/Academic Events
            ['name' => 'Lectures', 'category' => 'Educational/Academic Events', 'description' => 'Academic lectures and presentations'],
            ['name' => 'Symposia', 'category' => 'Educational/Academic Events', 'description' => 'Academic symposia and conferences'],
            ['name' => 'Panel Discussions', 'category' => 'Educational/Academic Events', 'description' => 'Panel discussions and forums'],
            ['name' => 'Science Fairs', 'category' => 'Educational/Academic Events', 'description' => 'Science fairs and exhibitions'],
            ['name' => 'Student Exhibitions', 'category' => 'Educational/Academic Events', 'description' => 'Student art and project exhibitions'],
            ['name' => 'Career Fairs', 'category' => 'Educational/Academic Events', 'description' => 'Career and job fairs'],
            ['name' => 'Study Groups', 'category' => 'Educational/Academic Events', 'description' => 'Study groups and tutoring sessions'],
            ['name' => 'Research Conferences', 'category' => 'Educational/Academic Events', 'description' => 'Research and academic conferences'],
            ['name' => 'Open Houses', 'category' => 'Educational/Academic Events', 'description' => 'School and institution open houses'],
            ['name' => 'Graduation Ceremonies', 'category' => 'Educational/Academic Events', 'description' => 'Graduation ceremonies and commencements'],

            // Cultural and Arts Events
            ['name' => 'Art Exhibitions', 'category' => 'Cultural and Arts Events', 'description' => 'Art exhibitions and galleries'],
            ['name' => 'Music Concerts', 'category' => 'Cultural and Arts Events', 'description' => 'Live music concerts and performances'],
            ['name' => 'Theater Performances', 'category' => 'Cultural and Arts Events', 'description' => 'Theater plays and performances'],
            ['name' => 'Film Screenings', 'category' => 'Cultural and Arts Events', 'description' => 'Film screenings and movie events'],
            ['name' => 'Dance Performances', 'category' => 'Cultural and Arts Events', 'description' => 'Dance performances and recitals'],
            ['name' => 'Book Launches', 'category' => 'Cultural and Arts Events', 'description' => 'Book launches and author events'],
            ['name' => 'Fashion Shows', 'category' => 'Cultural and Arts Events', 'description' => 'Fashion shows and runway events'],
            ['name' => 'Poetry Readings', 'category' => 'Cultural and Arts Events', 'description' => 'Poetry readings and literary events'],
            ['name' => 'Cultural Festivals', 'category' => 'Cultural and Arts Events', 'description' => 'Cultural festivals and celebrations'],
            ['name' => 'Craft Fairs', 'category' => 'Cultural and Arts Events', 'description' => 'Craft fairs and artisan markets'],

            // Sporting Events
            ['name' => 'Marathons', 'category' => 'Sporting Events', 'description' => 'Marathon and long-distance running events'],
            ['name' => 'Sport Tournaments', 'category' => 'Sporting Events', 'description' => 'Sports tournaments and competitions'],
            ['name' => 'Charity Runs', 'category' => 'Sporting Events', 'description' => 'Charity running events'],
            ['name' => 'Golf Tournaments', 'category' => 'Sporting Events', 'description' => 'Golf tournaments and competitions'],
            ['name' => 'Game Nights', 'category' => 'Sporting Events', 'description' => 'Game nights and recreational sports'],
            ['name' => 'Sports Meets', 'category' => 'Sporting Events', 'description' => 'Sports meets and athletic events'],
            ['name' => 'Fantasy Leagues', 'category' => 'Sporting Events', 'description' => 'Fantasy sports leagues and events'],
            ['name' => 'Cycling Races', 'category' => 'Sporting Events', 'description' => 'Cycling races and bike events'],
            ['name' => 'Team Building Games', 'category' => 'Sporting Events', 'description' => 'Team building sports and games'],
            ['name' => 'Tailgate Parties', 'category' => 'Sporting Events', 'description' => 'Tailgate parties and pre-game events'],

            // Virtual/Hybrid Events
            ['name' => 'Webinars', 'category' => 'Virtual/Hybrid Events', 'description' => 'Online webinars and virtual presentations'],
            ['name' => 'Virtual Conferences', 'category' => 'Virtual/Hybrid Events', 'description' => 'Virtual conferences and online meetings'],
            ['name' => 'Online Workshops', 'category' => 'Virtual/Hybrid Events', 'description' => 'Online workshops and virtual training'],
            ['name' => 'Virtual Networking Events', 'category' => 'Virtual/Hybrid Events', 'description' => 'Virtual networking and online meetups'],
            ['name' => 'Live Streaming Events', 'category' => 'Virtual/Hybrid Events', 'description' => 'Live streaming and broadcast events'],
            ['name' => 'Virtual Exhibitions', 'category' => 'Virtual/Hybrid Events', 'description' => 'Virtual exhibitions and online showcases'],
            ['name' => 'Virtual Happy Hours', 'category' => 'Virtual/Hybrid Events', 'description' => 'Virtual social gatherings and happy hours'],
            ['name' => 'E-Sports Competitions', 'category' => 'Virtual/Hybrid Events', 'description' => 'E-sports competitions and gaming events'],
            ['name' => 'Virtual Product Launches', 'category' => 'Virtual/Hybrid Events', 'description' => 'Virtual product launches and online events'],
            ['name' => 'Online Fundraisers', 'category' => 'Virtual/Hybrid Events', 'description' => 'Online fundraising and virtual charity events'],

            // Religious Events
            ['name' => 'Church Services', 'category' => 'Religious Events', 'description' => 'Regular church services and worship'],
            ['name' => 'Religious Retreats', 'category' => 'Religious Events', 'description' => 'Religious retreats and spiritual gatherings'],
            ['name' => 'Faith-Based Conferences', 'category' => 'Religious Events', 'description' => 'Faith-based conferences and religious meetings'],
            ['name' => 'Bible Studies', 'category' => 'Religious Events', 'description' => 'Bible study groups and religious education'],
            ['name' => 'Prayer Vigils', 'category' => 'Religious Events', 'description' => 'Prayer vigils and spiritual gatherings'],
            ['name' => 'Community Outreach Events', 'category' => 'Religious Events', 'description' => 'Religious community outreach and service'],
            ['name' => 'Religious Holidays Celebrations', 'category' => 'Religious Events', 'description' => 'Religious holiday celebrations and observances'],
            ['name' => 'Mission Trips', 'category' => 'Religious Events', 'description' => 'Religious mission trips and outreach'],
            ['name' => 'Baptism Ceremonies', 'category' => 'Religious Events', 'description' => 'Baptism and religious ceremonies'],
            ['name' => 'Interfaith Dialogues', 'category' => 'Religious Events', 'description' => 'Interfaith dialogues and religious discussions'],
            ['name' => 'Faith-Based Fundraisers', 'category' => 'Religious Events', 'description' => 'Faith-based fundraising events'],
            ['name' => 'Charity Drives', 'category' => 'Religious Events', 'description' => 'Religious charity drives and collections'],
            ['name' => 'Church Picnics/Outreach', 'category' => 'Religious Events', 'description' => 'Church picnics and community outreach'],
            ['name' => 'Youth Group Gatherings', 'category' => 'Religious Events', 'description' => 'Religious youth group activities'],
            ['name' => 'Religious Festivals', 'category' => 'Religious Events', 'description' => 'Religious festivals and celebrations'],

            // Non-Profit Organization Events
            ['name' => 'Volunteer Recognition Events', 'category' => 'Non-Profit Organization Events', 'description' => 'Volunteer appreciation and recognition events'],
            ['name' => 'Annual Fundraising Galas', 'category' => 'Non-Profit Organization Events', 'description' => 'Annual fundraising galas and major events'],
            ['name' => 'Community Service Days', 'category' => 'Non-Profit Organization Events', 'description' => 'Community service and volunteer days'],
            ['name' => 'Non-Profit Networking Events', 'category' => 'Non-Profit Organization Events', 'description' => 'Non-profit networking and collaboration events'],
            ['name' => 'Grant Writing Workshops', 'category' => 'Non-Profit Organization Events', 'description' => 'Grant writing and fundraising workshops'],
            ['name' => 'Impact Celebrations', 'category' => 'Non-Profit Organization Events', 'description' => 'Impact celebrations and success stories'],
            ['name' => 'Food Drives', 'category' => 'Non-Profit Organization Events', 'description' => 'Food drives and hunger relief events'],
            ['name' => 'Community Education Programs', 'category' => 'Non-Profit Organization Events', 'description' => 'Community education and awareness programs'],
            ['name' => 'Non-Profit Partnerships', 'category' => 'Non-Profit Organization Events', 'description' => 'Non-profit partnership and collaboration events'],
            ['name' => 'Donation Drives', 'category' => 'Non-Profit Organization Events', 'description' => 'Donation drives and collection events'],
            ['name' => 'Advocacy Events', 'category' => 'Non-Profit Organization Events', 'description' => 'Advocacy and awareness events'],
            ['name' => 'Awareness Campaigns', 'category' => 'Non-Profit Organization Events', 'description' => 'Public awareness campaigns and events'],
            ['name' => 'Charity Auctions', 'category' => 'Non-Profit Organization Events', 'description' => 'Charity auctions and fundraising sales'],
            ['name' => 'Non-Profit Conferences', 'category' => 'Non-Profit Organization Events', 'description' => 'Non-profit conferences and sector meetings'],
            ['name' => 'Social Impact Meetups', 'category' => 'Non-Profit Organization Events', 'description' => 'Social impact and community meetups'],
        ];

        foreach ($eventTypes as $eventType) {
            EventType::create($eventType);
        }
    }
}
