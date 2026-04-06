<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeductibilityCode extends Model
{
    protected $table = 'deductibility_codes';

    protected $fillable = [
        'deductibility_code', // Unique code for the deductibility
        'description', // Description of the deductibility code
    ];
}
