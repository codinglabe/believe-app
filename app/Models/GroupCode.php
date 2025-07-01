<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GroupCode extends Model
{
    protected $table = 'group_codes';

    protected $fillable = [
        'group_code', // Unique code for the group
        'description', // Description of the group code
    ];
}
