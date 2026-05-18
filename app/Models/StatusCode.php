<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StatusCode extends Model
{
    protected $table = 'status_codes';

    protected $fillable = [
        'status_code', // Unique code for the status
        'status',
        'description', // Description of the status code
    ];
}
