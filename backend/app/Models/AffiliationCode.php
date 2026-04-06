<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AffiliationCode extends Model
{
    protected $table = 'affiliation_codes';

    protected $fillable = [
        'affiliation_codes', // Unique code for the affiliation
        'description', // Description of the affiliation code
    ];
}
