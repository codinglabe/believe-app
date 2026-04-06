<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class LanguagesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $languages = [
            'English',
            'Afrikaans',
            'Amharic',
            'Arabic',
            'Belarusian',
            'Bengali',
            'Bosnian',
            'Bulgarian',
            'Burmese',
            'Chewa (Nyanja)',
            'Chinese (Cantonese)',
            'Chinese (Mandarin)',
            'Croatian',
            'Czech',
            'Danish',
            'Dutch',
            'Estonian',
            'Finnish',
            'French',
            'German',
            'Greek',
            'Gujarati',
            'Hausa',
            'Hebrew',
            'Hindi',
            'Hungarian',
            'Icelandic',
            'Igbo',
            'Indonesian',
            'Irish',
            'Italian',
            'Japanese',
            'Kannada',
            'Khmer',
            'Korean',
            'Kurdish',
            'Lao',
            'Latvian',
            'Lithuanian',
            'Malay',
            'Malayalam',
            'Marathi',
            'Mongolian',
            'Nepali',
            'Norwegian',
            'Pashto',
            'Persian (Farsi)',
            'Polish',
            'Portuguese',
            'Punjabi',
            'Romanian',
            'Russian',
            'Scots Gaelic',
            'Serbian',
            'Shona',
            'Sinhala',
            'Slovak',
            'Slovenian',
            'Somali',
            'Spanish',
            'Swahili',
            'Swedish',
            'Tagalog (Filipino)',
            'Tamil',
            'Telugu',
            'Thai',
            'Tswana',
            'Turkish',
            'Ukrainian',
            'Urdu',
            'Vietnamese',
            'Welsh',
            'Xhosa',
            'Yoruba',
            'Zulu'
        ];

        foreach ($languages as $lang) {
            \App\Models\Language::create(['name' => $lang]);
        }
    }
}
