<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubsectionCode extends Model
{
    protected $table = 'subsection_codes';

    protected $fillable = [
        'subsection_codes', // Unique code for the subsection
        'irs_code',
        'description', // Description of the subsection code
    ];
}
