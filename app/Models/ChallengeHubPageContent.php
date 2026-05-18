<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChallengeHubPageContent extends Model
{
    protected $fillable = [
        'hero_title',
        'hero_subtitle',
        'page_meta_title',
        'page_meta_description',
        'choose_challenge_heading',
    ];
}
