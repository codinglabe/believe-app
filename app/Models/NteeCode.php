<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NteeCode extends Model
{
    protected $table = 'ntee_codes';

    protected $fillable = [
        'ntee_codes', // Unique code for the NTEE
        'category',
        'description', // Description of the NTEE code
    ];
}
