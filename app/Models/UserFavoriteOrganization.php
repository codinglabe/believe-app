<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserFavoriteOrganization extends Model
{
    protected $table = 'user_favorite_organizations';

    protected $fillable = [
        'user_id',
        'organization_id',
        'notifications',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
