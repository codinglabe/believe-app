<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrganizationTypeCode extends Model
{
    protected $table = 'organization_type_codes';

    protected $fillable = [
        'organization_code', // Unique code for the organization type
        'organization_structure',
        'description', // Description of the organization type code
    ];
}
