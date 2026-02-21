<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FundraiseLead extends Model
{
    protected $fillable = [
        'name',
        'company',
        'email',
        'project_summary',
    ];
}
