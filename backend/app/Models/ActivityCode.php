<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityCode extends Model
{
    protected $table = 'activity_codes';

    protected $fillable = [
        'activity_codes', // Unique code for the activity
        'description', // Description of the activity code
    ];
}
