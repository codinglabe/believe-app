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

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function orderShippingInfo()
    {
        return $this->hasOne(OrderShippingInfo::class);
    }

    public function orderProduct()
    {
        return $this->hasMany(OrderProduct::class, 'order_id');
    }
}
