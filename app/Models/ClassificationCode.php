<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClassificationCode extends Model
{
    protected $table = 'classification_codes';

    protected $fillable = [
        'classification_code', // Unique code for the classification
        'description', // Description of the classification code
    ];
}
