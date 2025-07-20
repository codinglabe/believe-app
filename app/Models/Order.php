<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
<<<<<<< HEAD
    //
=======
>>>>>>> 8071e7c (Add new Marketplace)
    protected $guarded = [];

    public function services()
    {
        return $this->morphMany(Service::class, 'serviceable');
    }

     /**
     * User who made the payment (buyer)
     */
<<<<<<< HEAD
    public function user()
    {
=======
    public function user(){
>>>>>>> 8071e7c (Add new Marketplace)
        return $this->belongsTo(User::class, 'user_id');
    }




}
