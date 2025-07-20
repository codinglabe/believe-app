<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $guarded = [];

    public function services()
    {
        return $this->morphMany(Service::class, 'serviceable');
    }

     /**
     * User who made the payment (buyer)
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }




}
