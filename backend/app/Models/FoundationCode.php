<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FoundationCode extends Model
{
    protected $table = 'foundation_codes';

    protected $fillable = [
        'foundation_codes', // Unique code for the foundation
        'foundation_type',
        'description', // Description of the foundation code
    ];
}
